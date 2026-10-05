from sentence_transformers import CrossEncoder


MODEL_NAME = "cross-encoder/ms-marco-MiniLM-L-6-v2"

_model = None


def get_reranker():
    global _model

    if _model is None:
        print(f"Loading reranker: {MODEL_NAME}")
        _model = CrossEncoder(MODEL_NAME)

    return _model


def rerank_chunks(
    query: str,
    chunks: list[dict],
    limit: int = 5,
) -> list[dict]:
    if not chunks:
        return []

    model = get_reranker()

    pairs = [
        [query, chunk.get("content", "")]
        for chunk in chunks
    ]

    scores = model.predict(pairs)

    reranked = []

    for chunk, score in zip(chunks, scores):
        row = dict(chunk)
        row["rerank_score"] = float(score)
        reranked.append(row)

    reranked.sort(
        key=lambda row: row["rerank_score"],
        reverse=True,
    )

    return reranked[:limit]
