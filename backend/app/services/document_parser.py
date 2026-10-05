"""
Lazy Docling converter — avoid building the pipeline until first parse.
Still only imported when APP_MODE=full mounts documents_ingest.
"""
import time
from io import BytesIO

_converter = None


def _get_converter():
    global _converter
    if _converter is None:
        from docling.datamodel.base_models import InputFormat
        from docling.datamodel.pipeline_options import PdfPipelineOptions
        from docling.document_converter import (
            DocumentConverter,
            PdfFormatOption,
        )

        pipeline_options = PdfPipelineOptions(
            do_ocr=False,
            do_table_structure=True,
            force_backend_text=True,
        )

        _converter = DocumentConverter(
            format_options={
                InputFormat.PDF: PdfFormatOption(
                    pipeline_options=pipeline_options,
                )
            }
        )
    return _converter


def parse_document(
    file_bytes: bytes,
    filename: str,
):
    from docling.datamodel.base_models import DocumentStream

    print("========== DOCLING START ==========")
    start = time.time()

    stream = DocumentStream(
        name=filename,
        stream=BytesIO(file_bytes),
    )

    result = _get_converter().convert(stream)

    elapsed = time.time() - start
    print(f"========== DOCLING DONE: {elapsed:.2f}s ==========")

    return {
        "document": result.document,
        "elapsed_seconds": elapsed,
    }
