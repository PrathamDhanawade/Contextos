def build_unified_context(
    memories: list[dict],
    document_chunks: list[dict],
    graph_rows: list[dict],
) -> str:
    sections = []

    if memories:
        memory_text = "\n".join(
            f"- {memory['content']}"
            for memory in memories
        )

        sections.append(
            f"""MEMORIES:
{memory_text}"""
        )

    if document_chunks:
        document_text = "\n\n".join(
            f"[{chunk.get('document_title', 'Document')} "
            f"pages {chunk.get('page_start', '?')}-{chunk.get('page_end', '?')}]\n"
            f"{chunk['content']}"
            for chunk in document_chunks
        )

        sections.append(
            f"""DOCUMENT CONTEXT:
{document_text}"""
        )

    if graph_rows:
        graph_text = "\n".join(
            f"- {row['source']['name']} "
            f"{row['relationship']} "
            f"{row['target']['name']}"
            for row in graph_rows
            if row.get("source") and row.get("target")
        )

        if graph_text:
            sections.append(
                f"""KNOWN RELATIONSHIPS:
{graph_text}"""
            )

    if not sections:
        return "No relevant stored context was found."

    return "\n\n".join(sections)
