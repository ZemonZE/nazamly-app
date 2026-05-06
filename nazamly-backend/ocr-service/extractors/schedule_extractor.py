import os
import json
import base64
from google import genai
from google.genai import types

# ── Gemma 3 via Gemini API (same key as transcript extractor) ────────────────
GEMMA_MODEL = "gemma-3-27b-it"

# ── Day normalisation ────────────────────────────────────────────────────────
ARABIC_DAY_MAP = {
    "السبت": "Saturday", "الأحد": "Sunday", "الاثنين": "Monday",
    "الإثنين": "Monday", "الثلاثاء": "Tuesday", "الأربعاء": "Wednesday",
    "الخميس": "Thursday", "الجمعة": "Friday",
    "سبت": "Saturday", "أحد": "Sunday", "اثنين": "Monday",
    "ثلاثاء": "Tuesday", "أربعاء": "Wednesday", "خميس": "Thursday", "جمعة": "Friday",
}

ARABIC_TYPE_MAP = {
    "محاضرة": "Lecture", "محاضره": "Lecture", "مح": "Lecture", "ن": "Lecture",
    "سكشن": "Section", "تمرين": "Section", "ت": "Section",
    "عملي": "Lab", "معمل": "Lab", "مختبر": "Lab", "لاب": "Lab", "ع": "Lab",
}

DAY_NAME_TO_NUMBER = {
    "Saturday": 1, "Sunday": 2, "Monday": 3, "Tuesday": 4,
    "Wednesday": 5, "Thursday": 6
}

MIME_MAP = {
    'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
    'png': 'image/png',  'webp': 'image/webp',
}

# ── Prompt ───────────────────────────────────────────────────────────────────
SCHEDULE_EXTRACTION_PROMPT = """\
You are an OCR AI. Your ONLY job is to read and transcribe exactly what is visible in this university schedule image. You must NOT invent, guess, or hallucinate any data.

CRITICAL RULES — violating any of these is a failure:
1. ONLY extract rows that are VISIBLY present in the image. If a day has no rows, output nothing for that day.
2. NEVER invent a class, time, location, or course code that is not clearly visible in the image.
3. If a cell is empty or unreadable, use null — do NOT guess its value.
4. Copy values EXACTLY as they appear — do not translate, reformat, or correct them.
5. Course codes contain an Arabic letter + numbers (e.g. "س303", "ر352"). NEVER drop the letter.
6. Times must be copied exactly as written (e.g. "PM 2:00", "AM 11:00"). Do NOT calculate or guess end times.
7. Locations like "م حاسب رياضه 2" or "قاعة 208" go ONLY in the "location" field — never in course_name.

Column mapping (Right-To-Left Arabic table):
- "كود المقرر" → course_code
- "نوع المقرر" → type  (e.g. "ن", "ع", "ت")
- "المجموعة"   → group
- "اليوم"      → day   (translate to English: السبت→Saturday, الأحد→Sunday, الاثنين→Monday, الثلاثاء→Tuesday, الأربعاء→Wednesday, الخميس→Thursday, الجمعة→Friday)
- "من"         → start_time
- "الي"        → end_time
- "المكان"     → location

Return ONLY a valid JSON object — no markdown, no explanation, nothing else:
{
  "classes": [
    {
      "course_code": "string or null",
      "course_name": null,
      "day": "English day name or null",
      "start_time": "exactly as written or null",
      "end_time": "exactly as written or null",
      "type": "exactly as written or null",
      "group": "string or null",
      "location": "exactly as written or null"
    }
  ]
}

If the image has zero visible class rows, return: {"classes": []}
"""


def extract_schedule_from_image(file_bytes: bytes, extension: str) -> dict:
    """
    Send a schedule image to Gemma 3 (via Gemini API) and return structured class data.
    """
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set. Add it to ocr-service/.env")

    mime_type = MIME_MAP.get(extension, 'image/jpeg')

    client = genai.Client(api_key=api_key)
    image_part = types.Part.from_bytes(data=file_bytes, mime_type=mime_type)

    response = client.models.generate_content(
        model=GEMMA_MODEL,
        contents=[image_part, SCHEDULE_EXTRACTION_PROMPT],
        config=types.GenerateContentConfig(
            temperature=0.1,
            max_output_tokens=4096,
        )
    )

    content_text = response.text.strip()

    # Strip markdown fences if model adds them
    if content_text.startswith("```"):
        content_text = content_text.split("```")[1]
        if content_text.startswith("json"):
            content_text = content_text[4:]
        content_text = content_text.strip()

    try:
        parsed = json.loads(content_text)
    except json.JSONDecodeError as e:
        raise Exception(f"Gemma 3 returned non-JSON: {e}. Raw: {content_text[:400]}")

    raw_classes = parsed.get("classes", [])
    classes = []

    for c in raw_classes:
        raw_day = c.get("day") or ""
        day_en  = ARABIC_DAY_MAP.get(raw_day, raw_day) if raw_day else None

        raw_type = c.get("type") or ""
        type_en  = ARABIC_TYPE_MAP.get(raw_type, raw_type) if raw_type else None

        classes.append({
            "courseCode":    _normalize_code(c.get("course_code")),
            "courseName":    c.get("course_name"),
            "dayOfWeek":     DAY_NAME_TO_NUMBER.get(day_en),
            "dayName":       day_en,
            "startTime":     _normalize_time(c.get("start_time")),
            "endTime":       _normalize_time(c.get("end_time")),
            "sessionType":   type_en,
            "groupNumber":   c.get("group"),
            "location":      c.get("location"),
        })

    has_data = any(c["courseCode"] and c["dayOfWeek"] for c in classes)
    confidence = 0.88 if (classes and has_data) else 0.4

    return {
        "source":     "gemma_vision",
        "confidence": confidence,
        "classes":    classes,
    }


def _normalize_code(raw: str | None) -> str | None:
    if not raw:
        return None
    from parsers.transcript_parser import normalize_course_code
    return normalize_course_code(raw.strip())


def _normalize_time(t: str | None) -> str | None:
    """Convert 'PM 2:00' or '2:00 PM' → '14:00' 24h format."""
    if not t:
        return None
    t = t.strip()
    import re
    m = re.match(r'(AM|PM)\s*(\d{1,2}):(\d{2})', t, re.IGNORECASE)
    if not m:
        m = re.match(r'(\d{1,2}):(\d{2})\s*(AM|PM)', t, re.IGNORECASE)
        if m:
            period, hour, minute = m.group(3), int(m.group(1)), int(m.group(2))
        else:
            return t
    else:
        period, hour, minute = m.group(1), int(m.group(2)), int(m.group(3))

    period = period.upper()
    if period == 'PM' and hour != 12:
        hour += 12
    elif period == 'AM' and hour == 12:
        hour = 0
    return f"{hour:02d}:{minute:02d}"
