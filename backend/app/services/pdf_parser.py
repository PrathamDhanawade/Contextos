import pymupdf


def extract_pdf_text(file_bytes: bytes):
    document = pymupdf.open(
        stream=file_bytes,
        filetype="pdf",
    )

    pages = []

    try:
        for page_number, page in enumerate(
            document,
            start=1,
        ):
            text = page.get_text("text")

            pages.append({
                "page_number": page_number,
                "text": text.strip(),
            })

    finally:
        document.close()

    return pages