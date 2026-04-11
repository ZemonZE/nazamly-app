import fitz   # PyMuPDF — pip install pymupdf
from parsers.transcript_parser import parse_transcript_lines


def extract_from_pdf(file_bytes: bytes) -> dict:
    """
    Extract transcript data from a PDF using PyMuPDF's embedded text layer.

    This works without any OCR — it reads the actual text embedded in the PDF,
    which is how all digitally generated university transcripts are made.

    Args:
        file_bytes: Raw bytes of the PDF file.

    Returns:
        { source, confidence, semester, courses[] }
    """
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception as e:
        raise Exception(f"Could not open PDF: {e}")

    all_lines = []

    for page_index in range(len(doc)):
        page = doc[page_index]

        # Strategy 1: Try to reconstruct table rows by spatial position
        rows = _extract_rows_by_position(page)
        if rows:
            for row in rows:
                # Join cells right-to-left (Arabic RTL)
                line = "  ".join(row)
                all_lines.append(line)
        else:
            # Strategy 2: Plain text extraction as fallback
            text = page.get_text("text")
            all_lines.extend(
                line.strip() for line in text.splitlines() if line.strip()
            )

    doc.close()

    if not all_lines:
        return {
            "source":     "pdf_text_layer",
            "confidence": 0.0,
            "semester":   None,
            "courses":    [],
            "warning":    "No text found in PDF. It may be a scanned image — try uploading as JPG/PNG instead.",
        }

    courses = parse_transcript_lines(all_lines)

    return {
        "source":     "pdf_text_layer",
        "confidence": 0.95 if courses else 0.1,
        "semester":   _detect_semester(all_lines),
        "courses":    courses,
    }


def _extract_rows_by_position(page) -> list[list[str]]:
    """
    Group text spans into table rows using their vertical (Y) position.
    Reconstructs RTL Arabic table structure from spatial layout.
    """
    try:
        raw = page.get_text("rawdict", flags=fitz.TEXT_PRESERVE_LIGATURES)
    except Exception:
        return []

    # Collect all spans with their bounding boxes
    span_list = []
    for block in raw.get("blocks", []):
        if block.get("type") != 0:  # 0 = text block
            continue
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                text = span.get("text", "").strip()
                if not text:
                    continue
                bbox = span.get("bbox", [0, 0, 0, 0])
                x0, y0 = bbox[0], bbox[1]
                span_list.append((x0, y0, text))

    if not span_list:
        return []

    # Group spans into rows by rounding Y coordinate to nearest 5px
    row_map: dict[int, list[tuple[float, str]]] = {}
    for x, y, text in span_list:
        y_key = round(y / 5) * 5
        if y_key not in row_map:
            row_map[y_key] = []
        row_map[y_key].append((x, text))

    # Sort rows top-to-bottom; within each row sort right-to-left (RTL)
    rows = []
    for y_key in sorted(row_map.keys()):
        cells = sorted(row_map[y_key], key=lambda s: s[0], reverse=True)
        row_texts = [c[1] for c in cells]
        if row_texts:
            rows.append(row_texts)

    return rows


def _detect_semester(lines: list[str]) -> str | None:
    import re
    pattern = re.compile(r'(بان|خريف|صيف|ربيع)\s*\d{4}', re.UNICODE)
    for line in lines:
        m = pattern.search(line)
        if m:
            return m.group(0)
    return None
