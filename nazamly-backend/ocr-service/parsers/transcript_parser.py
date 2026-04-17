import re
from typing import Optional

# ── Arabic course code prefix → English department code ─────────────────────
# IMPORTANT: This map MUST be kept identical to the one in
# backend/src/utils/normalizeCourseCode.js — if they diverge,
# DB credit-hour lookups will fail silently.
ARABIC_PREFIX_MAP: dict[str, str] = {
    'س': 'CS',   # Computer Science — علوم الحاسب
    'ر': 'RE',   # Religious Studies
    'ع': 'AR',   # Arabic Language
    'ت': 'IT',   # Information Technology
    'م': 'MA',   # Mathematics
    'ف': 'PH',   # Physics
    'ك': 'KS',   # General
    'ا': 'IS',   # Islamic Studies
    'ح': 'HC',   # Humanities
}

# Arabic course code: 1-3 Arabic letters + 3-4 digits
COURSE_CODE_PATTERN = re.compile(r'^[\u0600-\u06FF]{1,3}\d{3,4}$')

# Semester patterns used by Egyptian universities
SEMESTER_PATTERN = re.compile(r'(بان|خريف|صيف|ربيع)\s*\d{4}', re.UNICODE)


def normalize_course_code(raw: str) -> str:
    """
    Convert Arabic-prefix course codes to Latin equivalents.

    Examples:
        'س411'  → 'CS411'
        'س 309' → 'CS309'
        'CS411' → 'CS411'   (already Latin — returned as-is, uppercased)
        '411'   → '411'     (no prefix — returned as-is)
    """
    if not raw:
        return raw

    raw = raw.strip().replace('\u200f', '').replace(' ', '')  # Remove RLM and spaces

    # Already Latin
    if re.match(r'^[A-Za-z]+\d+$', raw):
        return raw.upper()

    # Arabic prefix + digits
    for ar_prefix, en_prefix in ARABIC_PREFIX_MAP.items():
        if raw.startswith(ar_prefix):
            remainder = raw[len(ar_prefix):]
            if remainder.isdigit():
                return f"{en_prefix}{remainder}"

    return raw  # Return unchanged if no mapping applies


def parse_transcript_lines(lines: list[str]) -> list[dict]:
    """
    Parse raw text lines (from PDF or OCR) into structured course records.

    Handles the Arabic RTL transcript table format:
      Columns (right to left): Symbol | Rating | GradePoints | FinalMark | CourseCode | ...

    Args:
        lines: List of text strings, one per table row.

    Returns:
        List of course dicts: { courseCode, rawCode, mark, gradePoints, creditHours, semester }
    """
    courses = []
    current_semester: Optional[str] = None

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # ── Semester detection ───────────────────────────────────────────────
        sem_match = SEMESTER_PATTERN.search(line)
        if sem_match:
            current_semester = sem_match.group(0)
            continue

        # ── Skip header rows ─────────────────────────────────────────────────
        # Common header keywords in Arabic transcripts
        header_keywords = ['كود المادة', 'الدرجة النهائية', 'النقاط', 'المقدر', 'الرمز', 'كود الطالب']
        if any(kw in line for kw in header_keywords):
            continue

        # ── Parse course row ─────────────────────────────────────────────────
        tokens = line.split()
        if len(tokens) < 2:
            continue

        course_code: Optional[str] = None
        final_mark:  Optional[float] = None
        grade_pts:   Optional[float] = None

        for token in tokens:
            token = token.strip()

            # Course code: Arabic letters + digits
            if COURSE_CODE_PATTERN.match(token) and not course_code:
                course_code = token

            # Final mark: integer 0-100
            elif re.match(r'^\d{2,3}$', token) and final_mark is None:
                val = float(token)
                if 0 <= val <= 100:
                    final_mark = val

            # Grade points: decimal 0.0-4.0
            elif re.match(r'^\d\.\d$', token) and grade_pts is None:
                val = float(token)
                if 0.0 <= val <= 4.0:
                    grade_pts = val

        # Only add if we found at minimum a course code and a mark
        if course_code and final_mark is not None:
            courses.append({
                "courseCode":  normalize_course_code(course_code),
                "rawCode":     course_code,          # Keep original Arabic for reference
                "mark":        final_mark,
                "gradePoints": grade_pts,
                "creditHours": None,                 # Enriched by Node.js from DB
                "semester":    current_semester,
            })

    return courses
