import re

# Arabic-to-English course code prefix mapping
ARABIC_PREFIX_MAP = {
    'س': 'CS',
    'ر': 'RE',
    'ع': 'AR',
    'ت': 'IT',
    'ك': 'KS',
    'م': 'MA',
    'ف': 'PH',
    'ح': 'CH',
}


def normalize_course_code(raw_code: str) -> str:
    """
    Normalize Arabic course codes to English equivalents.
    Examples: 'س411' -> 'CS411', 'س 309' -> 'CS309'
    """
    raw_code = raw_code.strip().replace(' ', '')
    for arabic_prefix, english_prefix in ARABIC_PREFIX_MAP.items():
        if raw_code.startswith(arabic_prefix):
            number_part = raw_code[len(arabic_prefix):]
            if number_part.isdigit():
                return f"{english_prefix}{number_part}"
    return raw_code


def is_numeric_grade(text: str) -> bool:
    try:
        val = float(text)
        return 0 <= val <= 100
    except ValueError:
        return False


def is_grade_points(text: str) -> bool:
    try:
        val = float(text)
        return 0.0 <= val <= 4.0
    except ValueError:
        return False


def parse_transcript_lines(lines: list) -> list:
    """
    Parse raw PDF text lines into structured course records.
    Handles Arabic RTL transcript format from Egyptian universities.
    """
    courses = []
    current_semester = None

    semester_pattern = re.compile(r'(بان|صيف|خريف|ربيع)\s*\d{4}', re.UNICODE)
    course_code_pattern = re.compile(r'^[\u0600-\u06FF]+\d{3,4}$')

    for line in lines:
        line = line.strip()

        sem_match = semester_pattern.search(line)
        if sem_match:
            current_semester = sem_match.group(0)
            continue

        parts = line.split()
        if len(parts) < 2:
            continue

        course_code = None
        mark = None
        grade_points = None

        for part in parts:
            if course_code_pattern.match(part):
                course_code = part
            elif is_numeric_grade(part) and mark is None:
                mark = float(part)
            elif is_grade_points(part) and grade_points is None:
                grade_points = float(part)

        if course_code and mark is not None:
            courses.append({
                'courseCode': normalize_course_code(course_code),
                'mark': mark,
                'gradePoints': grade_points,
                'creditHours': None,
                'semester': current_semester
            })

    return courses
