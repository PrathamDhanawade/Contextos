from __future__ import annotations

# MPNet cosine scores for "relevant" passages often land ~0.35–0.55.
CHUNK_SIMILARITY_THRESHOLD = 0.35
KEYWORD_HIT_SIMILARITY = 0.82


def merge_chunks_by_id(chunks: list[dict]) -> list[dict]:
    merged: dict[str, dict] = {}

    for chunk in chunks:
        chunk_id = str(
            chunk.get("id")
            or f"{chunk.get('document_id')}:{chunk.get('chunk_index')}"
        )
        previous = merged.get(chunk_id)
        if previous is None or float(chunk.get("similarity", 0)) > float(
            previous.get("similarity", 0)
        ):
            merged[chunk_id] = chunk

    return sorted(
        merged.values(),
        key=lambda row: float(row.get("similarity", 0)),
        reverse=True,
    )


def fetch_chunks_by_keywords(
    supabase,
    keywords: list[str],
    *,
    limit: int = 8,
    filter_document_id: str | None = None,
) -> list[dict]:
    """Text fallback when vector search misses (e.g. mixed embedding spaces)."""
    hits: list[dict] = []
    seen_chunk_ids: set[str] = set()

    for keyword in keywords:
        term = (keyword or "").strip()
        if len(term) < 3:
            continue

        query = (
            supabase
            .table("document_chunks")
            .select(
                "id, document_id, chunk_index, content, "
                "page_start, page_end, documents(title, filename)"
            )
            .ilike("content", f"%{term}%")
            .limit(limit)
        )

        if filter_document_id:
            query = query.eq("document_id", filter_document_id)

        response = query.execute()

        for row in response.data or []:
            chunk_id = str(row["id"])
            if chunk_id in seen_chunk_ids:
                continue

            seen_chunk_ids.add(chunk_id)
            document = row.get("documents") or {}
            hits.append({
                "id": row["id"],
                "document_id": row["document_id"],
                "chunk_index": row["chunk_index"],
                "content": row["content"],
                "page_start": row.get("page_start"),
                "page_end": row.get("page_end"),
                "document_title": (
                    document.get("title")
                    or document.get("filename")
                    or "Document"
                ),
                "similarity": KEYWORD_HIT_SIMILARITY,
                "match_type": "keyword",
            })

    return hits


def retrieve_document_chunks(
    supabase,
    *,
    query_embedding: list[float],
    keywords: list[str],
    limit: int = 5,
    filter_document_id: str | None = None,
    similarity_threshold: float = CHUNK_SIMILARITY_THRESHOLD,
) -> list[dict]:
    vector_response = supabase.rpc(
        "match_document_chunks",
        {
            "query_embedding": query_embedding,
            "match_count": max(limit * 2, 10),
            "filter_document_id": filter_document_id,
        },
    ).execute()

    vector_chunks = []
    for chunk in vector_response.data or []:
        similarity = float(chunk.get("similarity", 0))
        print(
            f"   vector candidate sim={similarity:.4f} "
            f"doc={chunk.get('document_title')} "
            f"p={chunk.get('page_start')}"
        )
        if similarity >= similarity_threshold:
            chunk = dict(chunk)
            chunk["match_type"] = "vector"
            vector_chunks.append(chunk)

    keyword_chunks = fetch_chunks_by_keywords(
        supabase,
        keywords,
        limit=limit,
        filter_document_id=filter_document_id,
    )
    for chunk in keyword_chunks:
        print(
            f"   keyword hit doc={chunk.get('document_title')} "
            f"p={chunk.get('page_start')}"
        )

    merged = merge_chunks_by_id(vector_chunks + keyword_chunks)
    return merged[:limit]


def retrieve_bm25_chunks(
    supabase,
    *,
    query: str,
    limit: int = 10,
    filter_document_id: str | None = None,
) -> list[dict]:
    """PostgreSQL full-text (ts_rank) lexical retrieval — separate from ILIKE."""
    response = supabase.rpc(
        "search_document_chunks_fts",
        {
            "search_query": query,
            "match_count": limit,
            "filter_document_id": filter_document_id,
        },
    ).execute()

    chunks = []
    for row in response.data or []:
        chunk = dict(row)
        chunk["match_type"] = "bm25"
        chunks.append(chunk)

    return chunks


def reciprocal_rank_fusion(
    vector_chunks: list[dict],
    lexical_chunks: list[dict],
    *,
    k: int = 60,
) -> list[dict]:
    """Fuse ranked lists without mixing incompatible score scales."""
    scores: dict[str, float] = {}
    chunks_by_id: dict[str, dict] = {}

    for rank, chunk in enumerate(vector_chunks, start=1):
        chunk_id = str(chunk["id"])
        chunks_by_id[chunk_id] = dict(chunk)
        scores[chunk_id] = scores.get(chunk_id, 0.0) + 1 / (k + rank)

    for rank, chunk in enumerate(lexical_chunks, start=1):
        chunk_id = str(chunk["id"])

        if chunk_id not in chunks_by_id:
            chunks_by_id[chunk_id] = dict(chunk)

        scores[chunk_id] = scores.get(chunk_id, 0.0) + 1 / (k + rank)

    results = []

    for chunk_id, score in scores.items():
        chunk = chunks_by_id[chunk_id]
        chunk["fusion_score"] = score
        chunk["match_type"] = "hybrid"
        results.append(chunk)

    return sorted(
        results,
        key=lambda row: row["fusion_score"],
        reverse=True,
    )


def retrieve_hybrid_chunks(
    supabase,
    *,
    query: str,
    query_embedding: list[float],
    limit: int = 5,
    filter_document_id: str | None = None,
) -> list[dict]:
    """Vector + BM25 fused with RRF. Does not replace chat retrieval yet."""
    vector_response = supabase.rpc(
        "match_document_chunks",
        {
            "query_embedding": query_embedding,
            "match_count": 20,
            "filter_document_id": filter_document_id,
        },
    ).execute()

    vector_chunks = vector_response.data or []

    lexical_chunks = retrieve_bm25_chunks(
        supabase,
        query=query,
        limit=20,
        filter_document_id=filter_document_id,
    )

    fused = reciprocal_rank_fusion(
        vector_chunks,
        lexical_chunks,
    )

    return fused[:limit]

