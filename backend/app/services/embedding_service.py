from __future__ import annotations

import httpx

from app.core.config import settings

EMBED_MODEL_NAME = "sentence-transformers/all-mpnet-base-v2"
EMBED_BATCH_SIZE = 16
EMBED_DIM = 768

_model = None


def _remote_url() -> str:
    """Full embed endpoint URL (Modal production URL, or .../embed for local worker)."""
    return (settings.EMBEDDING_SERVICE_URL or "").strip().rstrip("/")


def _use_remote() -> bool:
    return bool(_remote_url())


def _get_local_model():
    """Lazy-load MPNet only when EMBEDDING_SERVICE_URL is unset (local/full)."""
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer

        print(f"Loading local embedding model: {EMBED_MODEL_NAME}")
        _model = SentenceTransformer(EMBED_MODEL_NAME)
        print("Local embedding model ready")
    return _model


def _embed_remote(texts: list[str]) -> list[list[float]]:
    url = _remote_url()
    timeout = settings.EMBEDDING_TIMEOUT_SECONDS
    headers = {"Content-Type": "application/json"}
    token = (settings.EMBEDDING_SERVICE_TOKEN or "").strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"

    try:
        with httpx.Client(timeout=timeout) as client:
            response = client.post(url, json={"texts": texts}, headers=headers)
    except httpx.TimeoutException as exc:
        raise RuntimeError(
            f"Embedding service timed out after {timeout}s ({url})"
        ) from exc
    except httpx.RequestError as exc:
        raise RuntimeError(
            f"Embedding service unreachable at {url}: {exc}"
        ) from exc

    if response.status_code >= 400:
        detail = response.text[:500]
        raise RuntimeError(
            f"Embedding service error {response.status_code}: {detail}"
        )

    payload = response.json()
    embeddings = payload.get("embeddings")
    if not isinstance(embeddings, list) or len(embeddings) != len(texts):
        raise RuntimeError("Embedding service returned invalid embeddings payload")

    dim = payload.get("dim") or payload.get("dimension")
    if dim is None and embeddings:
        dim = len(embeddings[0])
    if dim != EMBED_DIM:
        raise RuntimeError(
            f"Embedding dim mismatch: got {dim}, expected {EMBED_DIM} "
            f"(must stay {EMBED_MODEL_NAME})"
        )

    return embeddings


def _embed_local(texts: list[str]) -> list[list[float]]:
    model = _get_local_model()
    vectors = model.encode(
        texts,
        batch_size=EMBED_BATCH_SIZE,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    return vectors.tolist()


def create_embeddings(texts: list[str]) -> list[list[float]]:
    """Embed texts with all-mpnet-base-v2 (768-d). Must match stored vectors.

    Production / Render: set EMBEDDING_SERVICE_URL to the Modal endpoint.
    Local: leave unset to load SentenceTransformer in-process.
    """
    if not texts:
        return []

    if _use_remote():
        return _embed_remote(texts)

    if settings.is_retrieval_mode:
        raise RuntimeError(
            "APP_MODE=retrieval requires EMBEDDING_SERVICE_URL "
            "(Modal all-mpnet-base-v2 endpoint). "
            "Do not load torch/sentence-transformers in the web process."
        )

    return _embed_local(texts)


def create_embedding(text: str) -> list[float]:
    return create_embeddings([text])[0]
