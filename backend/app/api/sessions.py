from fastapi import APIRouter, HTTPException

from app.core.supabase import supabase


router = APIRouter(
    prefix="/sessions",
    tags=["sessions"],
)


@router.post("")
def create_session():
    try:
        response = (
            supabase
            .table("chat_sessions")
            .insert({
                "title": "New Chat"
            })
            .execute()
        )

        return response.data[0]

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )


@router.get("")
def list_sessions():
    try:
        response = (
            supabase
            .table("chat_sessions")
            .select("id, title, created_at")
            .order("created_at", desc=True)
            .execute()
        )

        return {
            "sessions": response.data or []
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )


@router.get("/{session_id}/messages")
def get_session_messages(session_id: str):
    try:
        response = (
            supabase
            .table("chat_messages")
            .select("role, content, created_at")
            .eq("session_id", session_id)
            .order("created_at")
            .execute()
        )

        return {
            "messages": response.data or []
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )
