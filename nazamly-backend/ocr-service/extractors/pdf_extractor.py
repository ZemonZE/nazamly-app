import fitz   # PyMuPDF
from extractors.image_extractor import extract_from_image


def extract_from_pdf(file_bytes: bytes) -> dict:
    """
    Extract transcript data from a PDF.

    Strategy:
    1. Try to read the embedded text layer and parse it directly.
    2. If that yields 0 courses, render the first page as a PNG image
       and send it to Gemma vision for extraction.

    Args:
        file_bytes: Raw bytes of the PDF file.

    Returns:
        { source, confidence, semester, student_id, courses[] }
    """
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception as e:
        raise Exception(f"Could not open PDF: {e}")

    # ── Strategy 1: text layer ────────────────────────────────────────────────
    from parsers.transcript_parser import parse_transcript_lines

    all_lines = []
    for page_index in range(len(doc)):
        page = doc[page_index]
        rows = _extract_rows_by_position(page)
        if rows:
            for row in rows:
                all_lines.append("  ".join(row))
        else:
            text = page.get_text("text")
            all_lines.extend(line.strip() for line in text.splitlines() if line.strip())

    text_courses = parse_transcript_lines(all_lines) if all_lines else []

    if text_courses:
        doc.close()
        return {
            "source":     "pdf_text_layer",
            "confidence": 0.95,
            "semester":   _detect_semester(all_lines),
            "student_id": None,
            "courses":    text_courses,
        }

    # ── Strategy 2: render page → Gemma vision ───────────────────────────────
    page = doc[0]
    # Render at 2x resolution for better OCR quality
    mat = fitz.Matrix(2.0, 2.0)
    pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB)
    image_bytes = pix.tobytes("png")
    doc.close()

    result = extract_from_image(image_bytes, "png")
    result["source"] = "pdf_via_vision"
    return result


def _extract_rows_by_position(page) -> list:
    try:
        raw = page.get_text("rawdict", flags=fitz.TEXT_PRESERVE_LIGATURES)
    except Exception:
        return []

    span_list = []
    for block in raw.get("blocks", []):
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                text = span.get("text", "").strip()
                if not text:
                    continue
                bbox = span.get("bbox", [0, 0, 0, 0])
                span_list.append((bbox[0], bbox[1], text))

    if not span_list:
        return []

    row_map: dict = {}
    for x, y, text in span_list:
        y_key = round(y / 5) * 5
        row_map.setdefault(y_key, []).append((x, text))

    rows = []
    for y_key in sorted(row_map.keys()):
        cells = sorted(row_map[y_key], key=lambda s: s[0], reverse=True)
        row_texts = [c[1] for c in cells]
        if row_texts:
            rows.append(row_texts)

    return rows


def _detect_semester(lines: list) -> str | None:
    import re
    pattern = re.compile(r'(بان|خريف|صيف|ربيع|يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر)\s*\d{4}', re.UNICODE)
    for line in lines:
        m = pattern.search(line)
        if m:
            return m.group(0)
    return None
