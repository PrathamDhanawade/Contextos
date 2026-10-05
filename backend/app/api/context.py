from fastapi import APIRouter, HTTPException

from app.core.supabase import supabase
from app.services.entity_service import DEFAULT_USER_ID


router = APIRouter(
    prefix="/context",
    tags=["context"],
)


@router.get("")
def get_context():
    try:
        user_id = DEFAULT_USER_ID

        # Memories are currently session-scoped, not user-scoped.
        memories_response = (
            supabase
            .table("memories")
            .select(
                "id, memory_type, content, created_at, session_id, "
                "status, superseded_by"
            )
            .order("created_at", desc=True)
            .limit(50)
            .execute()
        )

        entities_response = (
            supabase
            .table("entities")
            .select(
                "id, name, entity_type, created_at, "
                "source_type, source_document_id"
            )
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )

        relationships_response = (
            supabase
            .table("entity_relationships")
            .select(
                """
                id,
                relationship,
                source_page,
                source_document_id,
                source_type,
                source:entities!entity_relationships_source_entity_id_fkey(name, entity_type),
                target:entities!entity_relationships_target_entity_id_fkey(name, entity_type)
                """
            )
            .eq("user_id", user_id)
            .execute()
        )

        documents_response = (
            supabase
            .table("documents")
            .select("id, title, filename, status, created_at")
            .order("created_at", desc=True)
            .execute()
        )

        return {
            "user_id": user_id,
            "memories": memories_response.data or [],
            "entities": entities_response.data or [],
            "relationships": relationships_response.data or [],
            "documents": documents_response.data or [],
        }

    except Exception as e:
        print(f"CONTEXT LOAD FAILED: {e}")

        raise HTTPException(
            status_code=500,
            detail=f"Could not load context: {str(e)}",
        )


@router.get("/document/{document_id}/graph")
def get_document_graph(document_id: str):
    try:
        entities_response = (
            supabase
            .table("entities")
            .select(
                "id, name, entity_type, source_type, source_document_id"
            )
            .eq("source_document_id", document_id)
            .execute()
        )

        relationships_response = (
            supabase
            .table("entity_relationships")
            .select(
                """
                id,
                relationship,
                source_page,
                source:entities!entity_relationships_source_entity_id_fkey(name, entity_type),
                target:entities!entity_relationships_target_entity_id_fkey(name, entity_type)
                """
            )
            .eq("source_document_id", document_id)
            .execute()
        )

        entities = entities_response.data or []
        relationships = relationships_response.data or []

        return {
            "document_id": document_id,
            "entity_count": len(entities),
            "relationship_count": len(relationships),
            "entities": entities,
            "relationships": relationships,
        }

    except Exception as e:
        print(f"DOCUMENT GRAPH LOAD FAILED: {e}")

        raise HTTPException(
            status_code=500,
            detail=str(e),
        )
