import fitz  # PyMuPDF
from parsers.transcript_parser import parse_transcript_lines


def extract_table_by_position(page) -> list:
    """
    Group text spans into rows based on their Y position.
    Handles Arabic RTL column order by sorting X position descending.
    """
    spans_raw = page.get_text("rawdict")["blocks"]
    row_map = {}

    for block in spans_raw:
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                text = span["text"].strip()
                if not text:
                    continue
                y_key = round(span["bbox"][1] / 5) * 5
                x_pos = span["bbox"][0]
                if y_key not in row_map:
                    row_map[y_key] = []
                row_map[y_key].append((x_pos, text))

    rows = []
    for y_key in sorted(row_map.keys()):
        row_spans = sorted(row_map[y_key], key=lambda s: s[0], reverse=True)
        rows.append([s[1] for s in row_spans])

    return rows


def extract_from_pdf(file_bytes: bytes) -> dict:
    """
    Extract transcript data from a PDF using PyMuPDF text layer extraction.
    Works on Arabic RTL PDFs without any additional system dependencies.
    """
    if not file_bytes:
        return {
            'success': False,
            'error': 'Empty PDF file provided',
            'courses': [],
            'confidence': 0
        }

    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception as e:
        return {
            'success': False,
            'error': f'Failed to open PDF: {str(e)}',
            'courses': [],
            'confidence': 0
        }

    all_lines = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        blocks = page.get_text("rawdict", flags=fitz.TEXT_PRESERVE_LIGATURES)["blocks"]

        for block in blocks:
            if block.get("type") != 0:
                continue
            for line in block.get("lines", []):
                line_text = ""
                for span in line.get("spans", []):
                    line_text += span.get("text", "")
                if line_text.strip():
                    all_lines.append(line_text.strip())

    doc.close()

    if not all_lines:
        return {
            'success': False,
            'error': 'No text layer found in PDF — try uploading as an image instead',
            'courses': [],
            'confidence': 0
        }

    courses = parse_transcript_lines(all_lines)

    if not courses:
        return {
            'success': False,
            'error': 'No courses could be extracted from the transcript',
            'courses': [],
            'confidence': 0
        }

    total_points = sum(
        (c['gradePoints'] or 0) * (c['creditHours'] or 3)
        for c in courses if c.get('gradePoints') is not None
    )
    total_hours = sum(
        c['creditHours'] or 3
        for c in courses if c.get('gradePoints') is not None
    )
    term_gpa = round(total_points / total_hours, 2) if total_hours > 0 else 0

    return {
        'success': True,
        'source': 'pdf_text_layer',
        'confidence': 0.95,
        'courses': courses,
        'termGPA': term_gpa,
        'totalCreditHours': total_hours
    }
