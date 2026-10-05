from __future__ import annotations

from app.services.llm_service import generate_text


def build_contextual_content(
    *,
    document_title: str,
    chunk_content: str,
    previous_chunk: str | None = None,
    next_chunk: str | None = None,
) -> str:
    surrounding_context = ""

    if previous_chunk:
        surrounding_context += (
            f"\nPrevious passage:\n{previous_chunk[:1200]}\n"
        )

    if next_chunk:
        surrounding_context += (
            f"\nNext passage:\n{next_chunk[:1200]}\n"
        )

    prompt = f"""
You are preparing a document chunk for retrieval.

Document:
{document_title}

Current passage:
{chunk_content}

{surrounding_context}

Write ONE short contextual sentence that helps this passage
make sense when retrieved independently.

The context should clarify things like:
- who a pronoun refers to
- the person/topic being discussed
- what section or idea this passage belongs to

Rules:
- Maximum 35 words.
- Do not summarize the whole passage.
- Do not invent information.
- Use only information visible in the supplied passages.
- Return only the contextual sentence.
"""

    context = generate_text(prompt).strip()

    return f"{context}\n\n{chunk_content}"
