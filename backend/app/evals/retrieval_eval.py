from __future__ import annotations

import json
import time
from pathlib import Path
from collections.abc import Callable

from app.core.supabase import supabase
from app.services.embedding_service import create_embedding
from app.services.retrieval_service import (
    CHUNK_SIMILARITY_THRESHOLD,
    retrieve_hybrid_chunks,
)
from app.services.reranker_service import rerank_chunks


DATASET_PATH = Path(__file__).parent / "dataset.json"


def load_dataset() -> list[dict]:
    with open(DATASET_PATH, "r", encoding="utf-8") as file:
        return json.load(file)


def retrieve_vector_chunks(
    question: str,
    limit: int = 10,
    document_id: str | None = None,
) -> list[dict]:
    query_embedding = create_embedding(question)

    response = supabase.rpc(
        "match_document_chunks",
        {
            "query_embedding": query_embedding,
            "match_count": limit,
            "filter_document_id": document_id,
        },
    ).execute()

    chunks = []

    for chunk in response.data or []:
        similarity = float(chunk.get("similarity", 0))

        if similarity >= CHUNK_SIMILARITY_THRESHOLD:
            chunks.append(chunk)

    return chunks


def retrieve_hybrid_eval_chunks(
    question: str,
    limit: int = 10,
    document_id: str | None = None,
) -> list[dict]:
    query_embedding = create_embedding(question)

    return retrieve_hybrid_chunks(
        supabase,
        query=question,
        query_embedding=query_embedding,
        limit=limit,
        filter_document_id=document_id,
    )


def retrieve_hybrid_reranked_eval_chunks(
    question: str,
    limit: int = 10,
    document_id: str | None = None,
) -> list[dict]:
    query_embedding = create_embedding(question)

    hybrid_chunks = retrieve_hybrid_chunks(
        supabase,
        query=question,
        query_embedding=query_embedding,
        limit=20,
        filter_document_id=document_id,
    )

    return rerank_chunks(
        question,
        hybrid_chunks,
        limit=limit,
    )


def chunk_matches_expected(chunk: dict, item: dict) -> bool:
    content = (chunk.get("content") or "").lower()

    expected_terms = [
        term.lower()
        for term in item.get("expected_terms", [])
    ]

    if not all(term in content for term in expected_terms):
        return False

    expected_pages = item.get("expected_pages")

    if not expected_pages:
        return True

    page_start = chunk.get("page_start")
    page_end = chunk.get("page_end") or page_start

    if page_start is None:
        return False

    return any(
        page_start <= page <= page_end
        for page in expected_pages
    )


def find_first_relevant_rank(
    chunks: list[dict],
    item: dict,
) -> int | None:
    for rank, chunk in enumerate(chunks, start=1):
        if chunk_matches_expected(chunk, item):
            return rank

    return None


def evaluate(
    name: str,
    retriever: Callable[[str, int, str | None], list[dict]],
    dataset: list[dict],
) -> dict:
    recall_1_hits = 0
    recall_5_hits = 0
    recall_10_hits = 0
    reciprocal_rank_sum = 0.0
    total_latency_ms = 0.0

    print(f"\n{name}")
    print("-" * len(name))

    for item in dataset:
        start = time.perf_counter()

        chunks = retriever(
            item["question"],
            10,
            None,
        )

        latency_ms = (time.perf_counter() - start) * 1000
        total_latency_ms += latency_ms

        rank = find_first_relevant_rank(chunks, item)

        if rank is not None:
            if rank <= 1:
                recall_1_hits += 1

            if rank <= 5:
                recall_5_hits += 1

            if rank <= 10:
                recall_10_hits += 1

            reciprocal_rank_sum += 1 / rank

        print(
            f"[{item['id']}] "
            f"rank={rank if rank is not None else 'MISS'} "
            f"latency={latency_ms:.1f}ms"
        )

    total = len(dataset)

    results = {
        "recall@1": recall_1_hits / total,
        "recall@5": recall_5_hits / total,
        "recall@10": recall_10_hits / total,
        "mrr": reciprocal_rank_sum / total,
        "avg_latency_ms": total_latency_ms / total,
    }

    return results


def main():
    dataset = load_dataset()

    print("\nContextOS Retrieval Evaluation")
    print("==============================")
    print(f"Queries: {len(dataset)}")

    print("\nWarming embedding model...")
    create_embedding("warmup query")

    vector_results = evaluate(
        "VECTOR BASELINE",
        retrieve_vector_chunks,
        dataset,
    )

    hybrid_results = evaluate(
        "HYBRID VECTOR + LEXICAL",
        retrieve_hybrid_eval_chunks,
        dataset,
    )

    reranked_results = evaluate(
        "HYBRID + RERANKER",
        retrieve_hybrid_reranked_eval_chunks,
        dataset,
    )

    print("\nCOMPARISON")
    print("==========")

    print(
        f"{'Strategy':<26}"
        f"{'R@1':>8}"
        f"{'R@5':>8}"
        f"{'R@10':>8}"
        f"{'MRR':>8}"
        f"{'Latency':>12}"
    )

    print(
        f"{'Vector':<26}"
        f"{vector_results['recall@1']:>8.4f}"
        f"{vector_results['recall@5']:>8.4f}"
        f"{vector_results['recall@10']:>8.4f}"
        f"{vector_results['mrr']:>8.4f}"
        f"{vector_results['avg_latency_ms']:>10.1f}ms"
    )

    print(
        f"{'Vector + Lexical RRF':<26}"
        f"{hybrid_results['recall@1']:>8.4f}"
        f"{hybrid_results['recall@5']:>8.4f}"
        f"{hybrid_results['recall@10']:>8.4f}"
        f"{hybrid_results['mrr']:>8.4f}"
        f"{hybrid_results['avg_latency_ms']:>10.1f}ms"
    )

    print(
        f"{'Hybrid + Reranker':<26}"
        f"{reranked_results['recall@1']:>8.4f}"
        f"{reranked_results['recall@5']:>8.4f}"
        f"{reranked_results['recall@10']:>8.4f}"
        f"{reranked_results['mrr']:>8.4f}"
        f"{reranked_results['avg_latency_ms']:>10.1f}ms"
    )


if __name__ == "__main__":
    main()
