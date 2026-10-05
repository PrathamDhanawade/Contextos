from docling.chunking import HybridChunker


def chunk_document(docling_document):
    chunker = HybridChunker()

    chunks = list(
        chunker.chunk(dl_doc=docling_document)
    )

    results = []

    for index, chunk in enumerate(chunks):
        page_numbers = set()

        for item in chunk.meta.doc_items:
            if hasattr(item, "prov"):
                for prov in item.prov:
                    page_numbers.add(prov.page_no)

        page_numbers = sorted(page_numbers)

        results.append(
            {
                "chunk_index": index,
                "text": chunk.text,
                "page_numbers": page_numbers,
                "page_start": page_numbers[0] if page_numbers else None,
                "page_end": page_numbers[-1] if page_numbers else None,
            }
        )

    return results
