import requests
import base64
import json
import os

GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
GEMINI_API_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-1.5-flash:generateContent"
)

EXTRACTION_PROMPT = """
You are analyzing an Arabic university academic transcript image.

Extract all course records from the transcript table and return ONLY a JSON object.
Do not include any text before or after the JSON.

The JSON must follow this exact structure:
{
  "semester": "string (e.g. Spring 2026 or بان 2026)",
  "student_id": "string or null",
  "courses": [
    {
      "course_code": "string (e.g. س411 or CS411)",
      "course_name": "string or null",
      "final_mark": number (0-100),
      "grade_points": number (0.0-4.0),
      "credit_hours": number or null,
      "rating": "string (e.g. جيد جداً) or null",
      "symbol": "string (e.g. ب) or null"
    }
  ]
}

Rules:
- Extract ALL visible course rows
- Use numeric values for marks and grade points
- If a field is not visible, use null
- Preserve Arabic text exactly as shown
- Do not translate any Arabic text
"""


def extract_from_image(file_bytes: bytes, extension: str) -> dict:
    """
    Send image to Gemini Vision API and parse structured course data.
    Uses raw REST — no google-generativeai SDK required.
    """
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY environment variable is not set")

    mime_map = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp'
    }
    mime_type = mime_map.get(extension.lower(), 'image/jpeg')

    image_b64 = base64.b64encode(file_bytes).decode('utf-8')

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
            "temperature": 0.1,
            "maxOutputTokens": 2048,
            "responseMimeType": "application/json"
        }
    }

    response = requests.post(
        f"{GEMINI_API_URL}?key={GEMINI_API_KEY}",
        json=payload,
        timeout=30
    )

    if response.status_code != 200:
        raise Exception(f"Gemini API error {response.status_code}: {response.text[:300]}")

    response_data = response.json()

    try:
        content_text = response_data["candidates"][0]["content"]["parts"][0]["text"]
        parsed = json.loads(content_text)
    except (KeyError, json.JSONDecodeError) as e:
        raw_preview = str(response_data)[:500]
        raise Exception(f"Failed to parse Gemini response: {e}. Raw: {raw_preview}")

    courses = []
    for course in parsed.get("courses", []):
        courses.append({
            'courseCode': course.get('course_code', ''),
            'courseName': course.get('course_name'),
            'mark': course.get('final_mark'),
            'gradePoints': course.get('grade_points'),
            'creditHours': course.get('credit_hours'),
            'rating': course.get('rating'),
            'symbol': course.get('symbol'),
            'semester': parsed.get('semester')
        })

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
        'source': 'gemini_vision',
        'confidence': 0.88,
        'semester': parsed.get('semester'),
        'student_id': parsed.get('student_id'),
        'courses': courses,
        'termGPA': term_gpa,
        'totalCreditHours': total_hours
    }
