from fastapi import APIRouter, File, HTTPException, UploadFile

from app.core.supabase import supabase


router = APIRouter(
    prefix="/documents",
    tags=["documents"],
)

BUCKET_NAME = "Rag storage"


@router.get("")
def list_documents():
    try:
        response = (
            supabase
            .table("documents")
            .select(
                "id, title, filename, document_type, status, created_at"
            )
            .order("created_at", desc=True)
            .execute()
        )

        return {
            "documents": response.data or []
        }

    except Exception as e:
        print(f"LIST DOCUMENTS FAILED: {e}")

        raise HTTPException(
            status_code=500,
            detail=f"Could not load documents: {str(e)}",
        )


@router.delete("/{document_id}")
def delete_document(document_id: str):
    try:
        response = (
            supabase
            .table("documents")
            .select("storage_path")
            .eq("id", document_id)
            .single()
            .execute()
        )

        document = response.data

        if not document:
            raise HTTPException(
                status_code=404,
                detail="Document not found",
            )

        storage_path = document.get("storage_path")

        if storage_path:
            supabase.storage.from_(BUCKET_NAME).remove([
                storage_path
            ])

        supabase.table("documents").delete().eq(
            "id",
            document_id,
        ).execute()

        return {
            "message": "Document deleted successfully"
        }

    except HTTPException:
        raise

    except Exception as e:
        print(f"DELETE DOCUMENT FAILED: {e}")

        raise HTTPException(
            status_code=500,
            detail=f"Could not delete document: {str(e)}",
        )
