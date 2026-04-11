import os
import base64
import json
import requests

# ── Gemini 2.0 Flash endpoint ───────────────────────────────────────────────
GEMINI_MODEL   = "gemini-2.0-flash"
GEMINI_API_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent"
)

# ── Prompt ──────────────────────────────────────────────────────────────────
# Designed specifically for the Arabic RTL transcript format used by
# Egyptian universities. The table columns are (right to left):
#   الرمز | المقدر | النقاط | الدرجة النهائية | كود المادة | كود الطالب | الفصل الدراسي
#
# The prompt forces JSON-only output and preserves Arabic text exactly.
EXTRACTION_PROMPT = """\
You are reading an Arabic university academic transcript table.
The table is written right-to-left (RTL) and contains student grade records.

The table columns are (reading right to left):
- الفصل الدراسي  → semester (e.g. "بان 2026")
- كود الطالب     → student ID (e.g. "2227328")
- كود المادة     → course code (e.g. "س411", "س309")
- الدرجة النهائية → final mark, a number between 0 and 100
- النقاط          → grade points, a decimal between 0.0 and 4.0
- المقدر          → rating description (e.g. "جيد جداً", "جيد", "ممتاز")
- الرمز           → letter symbol (e.g. "أ", "ب", "ج")

Extract every course row from the transcript and return ONLY a valid JSON object.
Do NOT include any explanation, markdown, or text outside the JSON.

Required JSON structure:
{
  "semester": "string",
  "student_id": "string or null",
  "courses": [
    {
      "course_code": "string — preserve Arabic exactly as shown (e.g. س411)",
      "final_mark": number,
      "grade_points": number,
      "credit_hours": number or null,
      "rating": "string in Arabic or null",
      "symbol": "string in Arabic or null"
    }
  ]
}

Rules:
1. Extract ALL visible course rows — do not skip any.
2. Preserve Arabic text exactly — do not translate or transliterate.
3. final_mark must be a plain number (e.g. 83, not "83").
4. grade_points must be a decimal number (e.g. 3.3, not "3.3").
5. If a field is not visible in the image, use null.
6. If you see multiple semesters, use the most prominent/recent one for "semester".
7. Return ONLY the JSON object — no preamble, no explanation.
"""

MIME_MAP = {
    'jpg':  'image/jpeg',
    'jpeg': 'image/jpeg',
    'png':  'image/png',
    'webp': 'image/webp',
}


def extract_from_image(file_bytes: bytes, extension: str) -> dict:
    """
    Send an image to Gemini 2.0 Flash and return structured transcript data.

    Args:
        file_bytes: Raw bytes of the image file.
        extension:  File extension ('jpg', 'png', 'webp').

    Returns:
        {
          'source': 'gemini_vision',
          'confidence': float,
          'semester': str | None,
          'student_id': str | None,
          'courses': [ { courseCode, mark, gradePoints, ... }, ... ]
        }

    Raises:
        ValueError: If GEMINI_API_KEY is not set.
        Exception:  If the API call fails or response cannot be parsed.
    """
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY is not set. "
            "Add it to ocr-service/.env"
        )

    mime_type = MIME_MAP.get(extension, 'image/jpeg')
    image_b64 = base64.b64encode(file_bytes).decode('utf-8')

    # ── Build Gemini request payload ─────────────────────────────────────────
    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": image_b64
                        }
                    },
                    {
                        "text": EXTRACTION_PROMPT
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.1,          # Low temp → consistent structured output
            "maxOutputTokens": 2048,
            "responseMimeType": "application/json"  # Force JSON response mode
        }
    }

    # ── Call Gemini REST API ─────────────────────────────────────────────────
    try:
        response = requests.post(
            f"{GEMINI_API_URL}?key={api_key}",
            json=payload,
            timeout=45    # 45s — large images can take time
        )
    except requests.exceptions.Timeout:
        raise Exception("Gemini API request timed out after 45 seconds.")
    except requests.exceptions.ConnectionError:
        raise Exception("Could not connect to Gemini API. Check internet access.")

    if response.status_code != 200:
        raise Exception(
            f"Gemini API returned {response.status_code}: {response.text[:300]}"
        )

    # ── Parse Gemini response ────────────────────────────────────────────────
    raw = response.json()

    try:
        content_text = raw["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError) as e:
        raise Exception(f"Unexpected Gemini response structure: {e}. Raw: {str(raw)[:300]}")

    # Strip accidental markdown code fences if Gemini adds them
    content_text = content_text.strip()
    if content_text.startswith("```"):
        content_text = content_text.split("```")[1]
        if content_text.startswith("json"):
            content_text = content_text[4:]
        content_text = content_text.strip()

    try:
        parsed = json.loads(content_text)
    except json.JSONDecodeError as e:
        raise Exception(
            f"Gemini returned non-JSON content: {e}. "
            f"Raw text: {content_text[:400]}"
        )

    # ── Normalize to internal format ─────────────────────────────────────────
    from parsers.transcript_parser import normalize_course_code

    courses = []
    for c in parsed.get("courses", []):
        raw_code = c.get("course_code", "")
        courses.append({
            "courseCode":   normalize_course_code(raw_code),
            "rawCode":      raw_code,
            "mark":         _safe_number(c.get("final_mark")),
            "gradePoints":  _safe_number(c.get("grade_points")),
            "creditHours":  _safe_number(c.get("credit_hours")),
            "rating":       c.get("rating"),             # Arabic, e.g. "جيد جداً"
            "symbol":       c.get("symbol"),             # Arabic, e.g. "ب"
            "semester":     parsed.get("semester"),
        })

    # Gemini confidence heuristic:
    # If all courses have both mark and gradePoints → high confidence
    has_full_data = all(
        c["mark"] is not None and c["gradePoints"] is not None
        for c in courses
    )
    confidence = 0.92 if (courses and has_full_data) else 0.65

    return {
        "source":     "gemini_vision",
        "confidence": confidence,
        "semester":   parsed.get("semester"),
        "student_id": parsed.get("student_id"),
        "courses":    courses,
    }


def _safe_number(value):
    """Convert a value to float if possible, else return None."""
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None
