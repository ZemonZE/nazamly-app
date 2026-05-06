from flask import Flask, request, jsonify
from dotenv import load_dotenv
import os

load_dotenv()

from extractors.pdf_extractor import extract_from_pdf
from extractors.image_extractor import extract_from_image
from extractors.schedule_extractor import extract_schedule_from_image
from extractors.schedule_pdf_extractor import extract_schedule_from_pdf

app = Flask(__name__)

ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'webp'}
MIME_TO_EXT = {
    'application/pdf':  'pdf',
    'image/jpeg':       'jpg',
    'image/png':        'png',
    'image/webp':       'webp',
}

def get_extension(file) -> str | None:
    """Resolve file extension from MIME type first, then filename."""
    mime = file.content_type or ''
    if mime in MIME_TO_EXT:
        return MIME_TO_EXT[mime]
    name = (file.filename or '').lower()
    if '.' in name:
        ext = name.rsplit('.', 1)[1]
        if ext in ALLOWED_EXTENSIONS:
            return ext
    return None


@app.route('/health', methods=['GET'])
def health():
    key_set = bool(os.environ.get('GEMINI_API_KEY'))
    return jsonify({'status': 'ok', 'gemini_key_configured': key_set})


@app.route('/extract', methods=['POST'])
def extract():
    if 'file' not in request.files:
        return jsonify({'error': 'No file field in request'}), 400

    file = request.files['file']
    ext  = get_extension(file)

    if not ext:
        return jsonify({'error': 'Unsupported file type'}), 400

    file_bytes = file.read()
    if not file_bytes:
        return jsonify({'error': 'Empty file received'}), 400

    try:
        if ext == 'pdf':
            result = extract_from_pdf(file_bytes)
        else:
            result = extract_from_image(file_bytes, ext)

        return jsonify(result), 200

    except ValueError as e:
        # Configuration / API key issues
        return jsonify({'error': str(e), 'courses': [], 'confidence': 0}), 503
    except Exception as e:
        return jsonify({'error': str(e), 'courses': [], 'confidence': 0}), 500


@app.route('/extract-schedule', methods=['POST'])
def extract_schedule():
    """Extract class schedule from an image or PDF → structured JSON."""
    if 'file' not in request.files:
        return jsonify({'error': 'No file field in request'}), 400

    file = request.files['file']
    ext  = get_extension(file)

    if not ext:
        return jsonify({'error': 'Unsupported file type'}), 400

    file_bytes = file.read()
    if not file_bytes:
        return jsonify({'error': 'Empty file received'}), 400

    try:
        if ext == 'pdf':
            result = extract_schedule_from_pdf(file_bytes)
        else:
            result = extract_schedule_from_image(file_bytes, ext)

        return jsonify(result), 200

    except ValueError as e:
        return jsonify({'error': str(e), 'classes': [], 'confidence': 0}), 503
    except Exception as e:
        return jsonify({'error': str(e), 'classes': [], 'confidence': 0}), 500


if __name__ == '__main__':
    import logging
    log = logging.getLogger('werkzeug')
    log.setLevel(logging.ERROR)
    port = int(os.environ.get('FLASK_PORT', 5001))
    app.run(host='127.0.0.1', port=port, debug=False)
