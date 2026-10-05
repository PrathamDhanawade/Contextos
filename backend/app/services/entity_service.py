import json
import uuid

from groq import Groq

from app.core.config import settings


# Temporary single-user MVP until auth exists
DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001"

client = Groq(api_key=settings.GROQ_API_KEY)

EXTRACTION_MODEL = "openai/gpt-oss-20b"
CHUNK_CHAR_LIMIT = 3000

KNOWLEDGE_SCHEMA = {
    "type": "object",
    "properties": {
        "entities": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string"
                    },
                    "type": {
                        "type": "string"
                    }
                },
                "required": [
                    "name",
                    "type"
                ],
                "additionalProperties": False
            }
        },
        "relationships": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "source": {
                        "type": "string"
                    },
                    "relationship": {
                        "type": "string"
                    },
                    "target": {
                        "type": "string"
                    }
                },
                "required": [
                    "source",
                    "relationship",
                    "target"
                ],
                "additionalProperties": False
            }
        }
    },
    "required": [
        "entities",
        "relationships"
    ],
    "additionalProperties": False
}


def extract_single_chunk(text: str):
    try:
        response = client.chat.completions.create(
            model=EXTRACTION_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": """
You extract important entities and relationships from text.

Only extract meaningful knowledge.

Useful entity types include:
person
company
project
technology
product
institution
location
topic
organization

Relationships should be short and normalized.

Examples:
works_at
built
uses
wrote
founded
studied_at
created
invested_in
related_to

Do not invent facts.
"""
                },
                {
                    "role": "user",
                    "content": text
                }
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "knowledge_extraction",
                    "strict": True,
                    "schema": KNOWLEDGE_SCHEMA
                }
            },
            reasoning_effort="low",
        )

        raw = response.choices[0].message.content

        if not raw:
            return {
                "entities": [],
                "relationships": []
            }

        data = json.loads(raw)

        if not isinstance(data, dict):
            return {
                "entities": [],
                "relationships": []
            }

        entities = data.get("entities") or []
        relationships = data.get("relationships") or []

        if not isinstance(entities, list):
            entities = []
        if not isinstance(relationships, list):
            relationships = []

        return {
            "entities": entities,
            "relationships": relationships,
        }

    except Exception as e:
        print(f"Groq entity extraction failed: {e}")

        return {
            "entities": [],
            "relationships": []
        }


def _split_text(text: str, limit: int = CHUNK_CHAR_LIMIT) -> list[str]:
    text = (text or "").strip()

    if not text:
        return []

    if len(text) <= limit:
        return [text]

    parts = []
    start = 0

    while start < len(text):
        end = min(start + limit, len(text))

        if end < len(text):
            split_at = text.rfind("\n", start, end)
            if split_at <= start:
                split_at = text.rfind(". ", start, end)
            if split_at > start:
                end = split_at + 1

        part = text[start:end].strip()
        if part:
            parts.append(part)

        start = end

    return parts


def _dedupe_knowledge(entities: list, relationships: list) -> dict:
    unique_entities = []
    seen_entities = set()

    for entity in entities:
        name = (entity.get("name") or "").strip()
        entity_type = (
            entity.get("type")
            or entity.get("entity_type")
            or ""
        ).strip()

        if not name or not entity_type:
            continue

        key = (name.lower(), entity_type.lower())
        if key in seen_entities:
            continue

        seen_entities.add(key)
        unique_entities.append({
            "name": name,
            "type": entity_type,
        })

    unique_relationships = []
    seen_relationships = set()

    for rel in relationships:
        source = (rel.get("source") or "").strip()
        target = (rel.get("target") or "").strip()
        relationship = (rel.get("relationship") or "").strip()

        if not source or not target or not relationship:
            continue

        key = (
            source.lower(),
            relationship.lower(),
            target.lower(),
        )
        if key in seen_relationships:
            continue

        seen_relationships.add(key)
        unique_relationships.append({
            "source": source,
            "relationship": relationship,
            "target": target,
        })

    return {
        "entities": unique_entities,
        "relationships": unique_relationships,
    }


def extract_entities_and_relationships(text: str):
    parts = _split_text(text)

    if not parts:
        return {
            "entities": [],
            "relationships": [],
        }

    all_entities = []
    all_relationships = []

    for part in parts:
        result = extract_single_chunk(part)
        all_entities.extend(result.get("entities") or [])
        all_relationships.extend(result.get("relationships") or [])

    return _dedupe_knowledge(all_entities, all_relationships)


def _get_or_create_entity(
    supabase,
    user_id: str,
    name: str,
    entity_type: str,
    entity_cache: dict,
    source_type: str = "chat",
    source_document_id: str | None = None,
):
    key = (name.lower().strip(), entity_type.lower().strip())

    if key in entity_cache:
        return entity_cache[key]

    existing = (
        supabase
        .table("entities")
        .select("id, name, entity_type")
        .eq("user_id", user_id)
        .ilike("name", name.strip())
        .eq("entity_type", entity_type.strip())
        .limit(1)
        .execute()
    )

    if existing.data:
        entity_id = existing.data[0]["id"]
        entity_cache[key] = entity_id
        return entity_id

    row = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "name": name.strip(),
        "entity_type": entity_type.strip(),
        "source_type": source_type,
        "source_document_id": source_document_id,
    }

    created = (
        supabase
        .table("entities")
        .insert(row)
        .execute()
    )

    entity_id = created.data[0]["id"]
    entity_cache[key] = entity_id
    return entity_id


def save_knowledge(
    supabase,
    user_id: str,
    knowledge: dict,
    source_type: str = "chat",
    source_document_id: str | None = None,
    source_page: int | None = None,
):
    entities = knowledge.get("entities") or []
    relationships = knowledge.get("relationships") or []

    if not entities and not relationships:
        return {
            "entities_saved": 0,
            "relationships_saved": 0,
        }

    entity_cache = {}
    entities_saved = 0

    for entity in entities:
        name = entity.get("name")
        entity_type = entity.get("type") or entity.get("entity_type")

        if not name or not entity_type:
            continue

        before = len(entity_cache)
        _get_or_create_entity(
            supabase=supabase,
            user_id=user_id,
            name=name,
            entity_type=entity_type,
            entity_cache=entity_cache,
            source_type=source_type,
            source_document_id=source_document_id,
        )
        if len(entity_cache) > before:
            entities_saved += 1

    name_to_type = {
        (e.get("name") or "").lower().strip(): (
            e.get("type") or e.get("entity_type") or "topic"
        )
        for e in entities
        if e.get("name")
    }

    relationships_saved = 0

    for rel in relationships:
        source = (rel.get("source") or "").strip()
        target = (rel.get("target") or "").strip()
        relationship = (rel.get("relationship") or "").strip()

        if not source or not target or not relationship:
            continue

        source_entity_type = name_to_type.get(source.lower(), "topic")
        target_entity_type = name_to_type.get(target.lower(), "topic")

        source_id = _get_or_create_entity(
            supabase=supabase,
            user_id=user_id,
            name=source,
            entity_type=source_entity_type,
            entity_cache=entity_cache,
            source_type=source_type,
            source_document_id=source_document_id,
        )
        target_id = _get_or_create_entity(
            supabase=supabase,
            user_id=user_id,
            name=target,
            entity_type=target_entity_type,
            entity_cache=entity_cache,
            source_type=source_type,
            source_document_id=source_document_id,
        )

        existing_rel = (
            supabase
            .table("entity_relationships")
            .select("id")
            .eq("user_id", user_id)
            .eq("source_entity_id", source_id)
            .eq("target_entity_id", target_id)
            .ilike("relationship", relationship)
            .limit(1)
            .execute()
        )

        if existing_rel.data:
            continue

        supabase.table("entity_relationships").insert({
            "user_id": user_id,
            "source_entity_id": source_id,
            "target_entity_id": target_id,
            "relationship": relationship,
            "source_type": source_type,
            "source_document_id": source_document_id,
            "source_page": source_page,
        }).execute()

        relationships_saved += 1

    return {
        "entities_saved": entities_saved,
        "relationships_saved": relationships_saved,
    }


def find_mentioned_entities(
    supabase,
    user_id: str,
    text: str,
    limit: int = 25,
) -> list[dict]:
    """Match stored entity names that appear in free text (for retrieval)."""
    query_text = (text or "").lower()
    if not query_text.strip():
        return []

    response = (
        supabase
        .table("entities")
        .select("id, name, entity_type, source_document_id")
        .eq("user_id", user_id)
        .execute()
    )

    matches = []
    seen_names: set[str] = set()

    for entity in response.data or []:
        name = (entity.get("name") or "").strip()
        name_key = name.lower()

        # Skip tiny / noisy tokens that substring-match almost any question.
        if len(name) < 4:
            continue
        if " " not in name and len(name) < 12:
            continue
        if name_key in seen_names:
            continue
        if name_key not in query_text:
            continue

        seen_names.add(name_key)
        matches.append(entity)

    matches.sort(key=lambda row: len(row.get("name") or ""), reverse=True)
    return matches[:limit]


def get_user_graph_context(
    supabase,
    user_id: str = DEFAULT_USER_ID,
) -> list[dict]:
    response = (
        supabase
        .table("entity_relationships")
        .select(
            """
            relationship,
            source:entities!entity_relationships_source_entity_id_fkey(name, entity_type),
            target:entities!entity_relationships_target_entity_id_fkey(name, entity_type)
            """
        )
        .eq("user_id", user_id)
        .limit(50)
        .execute()
    )

    return response.data or []


def get_graph_context_for_entities(
    supabase,
    user_id: str,
    entity_names: list[str],
) -> list[dict]:
    if not entity_names:
        return []

    entities_response = (
        supabase
        .table("entities")
        .select("id, name, entity_type")
        .eq("user_id", user_id)
        .in_("name", entity_names)
        .execute()
    )

    entities = entities_response.data or []

    if not entities:
        return []

    entity_ids = [
        entity["id"]
        for entity in entities
    ]

    source_response = (
        supabase
        .table("entity_relationships")
        .select(
            """
            id,
            relationship,
            source_page,
            source:entities!entity_relationships_source_entity_id_fkey(
                name,
                entity_type
            ),
            target:entities!entity_relationships_target_entity_id_fkey(
                name,
                entity_type
            )
            """
        )
        .eq("user_id", user_id)
        .in_("source_entity_id", entity_ids)
        .limit(25)
        .execute()
    )

    target_response = (
        supabase
        .table("entity_relationships")
        .select(
            """
            id,
            relationship,
            source_page,
            source:entities!entity_relationships_source_entity_id_fkey(
                name,
                entity_type
            ),
            target:entities!entity_relationships_target_entity_id_fkey(
                name,
                entity_type
            )
            """
        )
        .eq("user_id", user_id)
        .in_("target_entity_id", entity_ids)
        .limit(25)
        .execute()
    )

    relationships = (
        (source_response.data or [])
        + (target_response.data or [])
    )

    unique = {}

    for row in relationships:
        unique[row["id"]] = row

    return list(unique.values())
