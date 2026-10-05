from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.documents import router as documents_router
from app.api.search import router as search_router
from app.api.chat import router as chat_router
from app.api.sessions import router as sessions_router
from app.api.context import router as context_router


app = FastAPI(
    title="ContextOS API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "app_mode": settings.APP_MODE,
        "ingestion_enabled": settings.is_full_mode,
    }


app.include_router(documents_router)
app.include_router(search_router)
app.include_router(chat_router)
app.include_router(sessions_router)
app.include_router(context_router)

if settings.is_full_mode:
    # Heavy: Docling / PyMuPDF / OCR / chunking — local only
    from app.api.documents_ingest import router as documents_ingest_router

    app.include_router(documents_ingest_router)
    print(f"APP_MODE={settings.APP_MODE}: PDF ingestion ENABLED")
else:
    @app.post("/documents/upload")
    async def upload_document_disabled(file: UploadFile = File(...)):
        raise HTTPException(
            status_code=503,
            detail=(
                "Document ingestion is disabled on this deployment "
                "(APP_MODE=retrieval). Upload PDFs on a local backend "
                "with APP_MODE=full."
            ),
        )

    print(f"APP_MODE={settings.APP_MODE}: PDF ingestion DISABLED")
