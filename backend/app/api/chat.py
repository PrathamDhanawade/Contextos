from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import settings
from app.core.supabase import supabase
from app.services.embedding_service import create_embedding
from app.services.llm_service import generate_text
from app.services.memory_service import (
    extract_memories,
    handle_memory_update,
    is_duplicate_memory,
)
from app.services.context_service import build_unified_context
from app.services.retrieval_service import retrieve_document_chunks
from app.services.entity_service import (
    DEFAULT_USER_ID,
    extract_entities_and_relationships,
    find_mentioned_entities,
    get_graph_context_for_entities,
    save_knowledge,
)


router = APIRouter(
    tags=["chat"],
)


class ChatRequest(BaseModel):
    question: str
    session_id: str | None = None
    document_id: str | None = None
    limit: int = 5


@router.post("/chat")
def chat_with_documents(body: ChatRequest):
    print(f"1. Chat question: {body.question}")

    session_id = body.session_id

    if not session_id:
        session = supabase.table("chat_sessions").insert({
            "title": body.question[:80],
        }).execute()
        session_id = session.data[0]["id"]
        print(f"2. Created session_id={session_id}")
    else:
        print(f"2. Using session_id={session_id}")

    supabase.table("chat_messages").insert({
        "session_id": session_id,
        "role": "user",
        "content": body.question,
    }).execute()

    knowledge = extract_entities_and_relationships(
        body.question
    )
    print("KNOWLEDGE:", knowledge)

    save_result = save_knowledge(
        supabase=supabase,
        knowledge=knowledge,
        user_id=DEFAULT_USER_ID,
    )
    print(
        f"Graph saved: entities={save_result['entities_saved']}, "
        f"relationships={save_result['relationships_saved']}"
    )

    memories = extract_memories(body.question)

    existing_response = (
        supabase.table("memories")
        .select("content, memory_type, status")
        .eq("session_id", session_id)
        .execute()
    )
    existing_memories = [
        memory
        for memory in (existing_response.data or [])
        if memory.get("status", "active") == "active"
    ]

    saved_memories = []
    for memory in memories:
        if is_duplicate_memory(
            memory["content"],
            existing_memories,
        ):
            print(f"Skipping exact duplicate: {memory['content']}")
            continue

        memory_embedding = create_embedding(memory["content"])

        saved = handle_memory_update(
            supabase=supabase,
            new_memory=memory,
            embedding=memory_embedding,
            session_id=session_id,
        )

        if saved:
            existing_memories.append(memory)
            saved_memories.append(memory)

    print(f"3. Extracted {len(memories)} memories, saved {len(saved_memories)}")
    for memory in saved_memories:
        print(f"   [{memory['memory_type']}] {memory['content']}")

    history_response = (
        supabase.table("chat_messages")
        .select("role, content")
        .eq("session_id", session_id)
        .order("created_at", desc=True)
        .limit(10)
        .execute()
    )

    history = list(reversed(history_response.data or []))
    history_text = "\n".join(
        f"{msg['role']}: {msg['content']}"
        for msg in history
    )
    print(f"4. History messages={len(history)}")

    query_embedding = create_embedding(body.question)
    print(f"5. Query embedding dimensions={len(query_embedding)}")

    memory_response = supabase.rpc(
        "match_memories",
        {
            "query_embedding": query_embedding,
            "match_count": 5,
        },
    ).execute()

    stored_memories = memory_response.data or []
    stored_memories = [
        memory
        for memory in stored_memories
        if float(memory.get("similarity", 0))
        >= settings.MEMORY_SIMILARITY_THRESHOLD
    ]
    print(f"6. Relevant memories={len(stored_memories)}")
    for memory in stored_memories:
        print(
            f"   [{memory.get('memory_type')}] "
            f"sim={float(memory['similarity']):.4f} "
            f"{memory['content']}"
        )

    mentioned_entities = find_mentioned_entities(
        supabase=supabase,
        user_id=DEFAULT_USER_ID,
        text=body.question,
    )
    extracted_entity_names = [
        entity["name"]
        for entity in knowledge.get("entities", [])
        if entity.get("name")
    ]
    query_entity_names = list(dict.fromkeys(
        [entity["name"] for entity in mentioned_entities]
        + extracted_entity_names
    ))

    chunks = retrieve_document_chunks(
        supabase,
        query_embedding=query_embedding,
        keywords=query_entity_names or [body.question[:80]],
        limit=body.limit,
        filter_document_id=body.document_id,
    )
    print(f"7. Relevant document chunks={len(chunks)}")

    graph_rows = get_graph_context_for_entities(
        supabase=supabase,
        user_id=DEFAULT_USER_ID,
        entity_names=query_entity_names,
    )
    print(f"Query graph entities={query_entity_names}")
    print(f"Relevant graph relationships={len(graph_rows)}")

    unified_context = build_unified_context(
        memories=stored_memories,
        document_chunks=chunks,
        graph_rows=graph_rows,
    )

    print(
        f"Unified context: "
        f"{len(stored_memories)} memories, "
        f"{len(chunks)} chunks, "
        f"{len(graph_rows)} graph relationships"
    )

    prompt = f"""
Use the stored context below when it is relevant.

{unified_context}

Conversation history:
{history_text}

USER QUESTION:
{body.question}

Instructions:
- Use only the stored context that is relevant.
- Do not invent facts, relationships, or document details.
- Prefer document context for document questions.
- Prefer memories for personal facts/preferences.
- Prefer known relationships for entity questions.
- Write like a concise briefing, not a dump of raw notes.
- Start with a short title or 1-2 sentence answer.
- Then 3-7 key bullets. Do not list every graph edge.
- Mention source provenance inline when possible (document title and page).
- Use Markdown headings, bullets, and bold. Avoid tables unless comparing 2+ items.
- Do not paste giant relationship tables into the answer.
- If the user is sharing information, respond naturally.
"""

    print("8. Generating answer with Groq")
    answer = generate_text(prompt)

    supabase.table("chat_messages").insert({
        "session_id": session_id,
        "role": "assistant",
        "content": answer,
    }).execute()

    sources = [
        {
            "document": chunk.get("document_title"),
            "document_id": chunk["document_id"],
            "chunk_index": chunk["chunk_index"],
            "page_start": chunk.get("page_start"),
            "page_end": chunk.get("page_end"),
            "similarity": round(float(chunk["similarity"]), 4),
            "preview": (
                chunk["content"][:180] + "..."
                if len(chunk["content"]) > 180
                else chunk["content"]
            ),
        }
        for chunk in chunks
    ]

    entities_used = []
    seen_entity_names: set[str] = set()

    for entity in mentioned_entities:
        name = (entity.get("name") or "").strip()
        if not name or name.lower() in seen_entity_names:
            continue
        seen_entity_names.add(name.lower())
        entities_used.append({
            "name": name,
            "type": entity.get("entity_type") or "topic",
        })

    for entity in knowledge.get("entities", []):
        name = (entity.get("name") or "").strip()
        if not name or name.lower() in seen_entity_names:
            continue
        seen_entity_names.add(name.lower())
        entities_used.append({
            "name": name,
            "type": entity.get("type") or entity.get("entity_type") or "topic",
        })

    graph_relationships = [
        {
            "source": row["source"]["name"],
            "relationship": row["relationship"],
            "target": row["target"]["name"],
            "page": row.get("source_page"),
        }
        for row in graph_rows
        if row.get("source") and row.get("target")
    ]

    print("9. CHAT COMPLETE")
    return {
        "session_id": session_id,
        "question": body.question,
        "answer": answer,
        "memories_extracted": memories,
        "memories_saved": saved_memories,
        "memories_used": stored_memories,
        "knowledge": {
            "entities": entities_used,
            "relationships": knowledge.get("relationships") or [],
        },
        "entities": entities_used,
        "graph_relationships": graph_relationships,
        "sources": sources,
    }
