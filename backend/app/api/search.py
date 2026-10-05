from app.services.context_service import build_unified_context
from app.services.embedding_service import create_embedding
from app.services.entity_service import (
    DEFAULT_USER_ID,
    extract_entities_and_relationships,
    find_mentioned_entities,
    get_graph_context_for_entities,
)
from app.services.retrieval_service import retrieve_document_chunks
from app.core.config import settings
from app.core.supabase import supabase
from fastapi import APIRouter
from pydantic import BaseModel


router = APIRouter(
    prefix="/search",
    tags=["Context Search"],
)


class SearchRequest(BaseModel):
    query: str
    limit: int = 5


@router.post("")
def search_context(body: SearchRequest):
    print(f"1. Context search: {body.query}")

    query_embedding = create_embedding(body.query)
    print(f"2. Query embedding dimensions={len(query_embedding)}")

    memory_response = supabase.rpc(
        "match_memories",
        {
            "query_embedding": query_embedding,
            "match_count": body.limit,
        },
    ).execute()

    memories = [
        memory
        for memory in (memory_response.data or [])
        if float(memory.get("similarity", 0))
        >= settings.MEMORY_SIMILARITY_THRESHOLD
    ]
    print(f"3. Relevant memories={len(memories)}")

    knowledge = extract_entities_and_relationships(body.query)
    mentioned_entities = find_mentioned_entities(
        supabase=supabase,
        user_id=DEFAULT_USER_ID,
        text=body.query,
    )
    entity_names = list(dict.fromkeys(
        [entity["name"] for entity in mentioned_entities]
        + [
            entity["name"]
            for entity in knowledge.get("entities", [])
            if entity.get("name")
        ]
    ))

    chunks = retrieve_document_chunks(
        supabase,
        query_embedding=query_embedding,
        keywords=entity_names or [body.query[:80]],
        limit=body.limit,
        filter_document_id=None,
    )
    print(f"4. Relevant document chunks={len(chunks)}")

    graph_rows = get_graph_context_for_entities(
        supabase=supabase,
        user_id=DEFAULT_USER_ID,
        entity_names=entity_names,
    )
    print(f"5. Query graph entities={entity_names}")
    print(f"6. Relevant graph relationships={len(graph_rows)}")

    context = build_unified_context(
        memories=memories,
        document_chunks=chunks,
        graph_rows=graph_rows,
    )

    print("7. CONTEXT SEARCH COMPLETE")
    return {
        "query": body.query,
        "context": context,
        "memories": memories,
        "documents": chunks,
        "relationships": graph_rows,
        "entities": knowledge.get("entities", []) or [
            {
                "name": entity["name"],
                "type": entity.get("entity_type"),
            }
            for entity in mentioned_entities
        ],
    }
