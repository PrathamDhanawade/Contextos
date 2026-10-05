import json

from app.services.llm_service import generate_text


def extract_memories(user_message: str):
    prompt = f"""
Extract durable memories from this user message.

Only extract information that could be useful in future conversations.

Allowed types:
- semantic: stable fact, preference, goal, skill, interest
- episodic: meaningful event or experience

Do NOT extract temporary questions or random statements.

Return ONLY valid JSON.

Format:
[
  {{
    "memory_type": "semantic",
    "content": "..."
  }}
]

If there is nothing worth remembering, return [].

User message:
{user_message}
"""

    try:
        text = generate_text(prompt)
        text = text.replace("```json", "").replace("```", "").strip()
        memories = json.loads(text)
    except Exception as e:
        print(f"Memory extraction skipped: {e}")
        return []

    if not isinstance(memories, list):
        return []

    cleaned = []
    for memory in memories:
        memory_type = memory.get("memory_type")
        content = memory.get("content")

        if memory_type not in {"semantic", "episodic"}:
            continue
        if not content or not str(content).strip():
            continue

        cleaned.append({
            "memory_type": memory_type,
            "content": str(content).strip(),
        })

    return cleaned


def is_duplicate_memory(
    new_memory: str,
    existing_memories: list[dict],
) -> bool:
    new_text = new_memory.lower().strip()

    for memory in existing_memories:
        existing_text = memory["content"].lower().strip()

        if new_text == existing_text:
            return True

    return False


def handle_memory_update(
    supabase,
    new_memory: dict,
    embedding: list[float],
    session_id: str | None = None,
):
    """
    Save a memory, skipping near-duplicates and superseding
    moderately similar older memories when an update arrives.
    """
    similar = supabase.rpc(
        "match_memories",
        {
            "query_embedding": embedding,
            "match_count": 3,
        },
    ).execute()

    matches = similar.data or []

    # exact / near duplicate → skip
    for match in matches:
        if float(match.get("similarity", 0)) >= 0.90:
            print(
                f"Skipping near-duplicate memory: "
                f"{new_memory['content']}"
            )
            return None

    row = {
        "memory_type": new_memory["memory_type"],
        "content": new_memory["content"],
        "embedding": embedding,
        "status": "active",
    }

    if session_id:
        row["session_id"] = session_id

    created = (
        supabase
        .table("memories")
        .insert(row)
        .execute()
    )

    if not created.data:
        return None

    new_row = created.data[0]

    # If there is a moderately similar old memory,
    # mark the closest one as superseded.
    if matches:
        closest = matches[0]
        similarity = float(closest.get("similarity", 0))

        if similarity >= 0.70:
            (
                supabase
                .table("memories")
                .update({
                    "status": "superseded",
                    "superseded_by": new_row["id"],
                })
                .eq("id", closest["id"])
                .execute()
            )
            print(
                f"Superseded memory "
                f"({similarity:.4f}): {closest.get('content')}"
            )
            print(
                f"Active memory: {new_row['content']}"
            )

    return new_row
