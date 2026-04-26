import fitz   # PyMuPDF
from extractors.schedule_extractor import extract_schedule_from_image


def extract_schedule_from_pdf(file_bytes: bytes) -> dict:
    """
    Extract class schedule data from a PDF.

    Strategy:
    Unlike transcripts, schedule PDFs are almost always image-based
    (scanned or screenshot), so we go straight to Gemma vision.
    We render each page as a high-res PNG and extract from the first
    page that yields results.

    Args:
        file_bytes: Raw bytes of the PDF file.

    Returns:
        { source, confidence, classes[] }
    """
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception as e:
        raise Exception(f"Could not open PDF: {e}")

    all_classes = []

    # Process up to 3 pages (most schedules fit on 1-2 pages)
    max_pages = min(len(doc), 3)

    for page_index in range(max_pages):
        page = doc[page_index]
        # Render at 2x resolution for better OCR quality
        mat = fitz.Matrix(2.0, 2.0)
        pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB)
        image_bytes = pix.tobytes("png")

        try:
            result = extract_schedule_from_image(image_bytes, "png")
            page_classes = result.get("classes", [])
            if page_classes:
                all_classes.extend(page_classes)
        except Exception:
            # If one page fails, continue with the next
            continue

    doc.close()

    if not all_classes:
        raise Exception(
            "Could not extract any classes from the PDF. "
            "Make sure the PDF contains a visible schedule/timetable."
        )

    # Deduplicate: same course + same day + same start time = same entry
    seen = set()
    unique_classes = []
    for cls in all_classes:
        key = (cls["courseCode"], cls["dayOfWeek"], cls["startTime"])
        if key not in seen:
            seen.add(key)
            unique_classes.append(cls)

    has_full_data = all(
        c["courseCode"] and c["startTime"] and c["endTime"]
        for c in unique_classes
    )
    confidence = 0.88 if (unique_classes and has_full_data) else 0.55

    return {
        "source":     "pdf_schedule_vision",
        "confidence": confidence,
        "classes":    unique_classes,
    }
