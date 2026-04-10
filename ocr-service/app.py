from flask import Flask, request, jsonify
import os
from extractors.pdf_extractor import extract_from_pdf
from extractors.image_extractor import extract_from_image

# Load .env if present
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

app = Flask(__name__)

ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'webp'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'nazamly-ocr'})


@app.route('/extract', methods=['POST'])
def extract():
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file provided'}), 400

    file = request.files['file']
    filename = file.filename.lower()

    if not allowed_file(filename):
        return jsonify({'success': False, 'error': 'Unsupported file type. Use PDF, JPG, PNG, or WEBP.'}), 400

    file_bytes = file.read()
    extension = filename.rsplit('.', 1)[1]

    try:
        if extension == 'pdf':
            result = extract_from_pdf(file_bytes)
        else:
            result = extract_from_image(file_bytes, extension)

        return jsonify(result)

    except ValueError as e:
        # Config errors (e.g. missing API key)
        return jsonify({'success': False, 'error': str(e), 'courses': [], 'confidence': 0}), 500

    except Exception as e:
        return jsonify({'success': False, 'error': str(e), 'courses': [], 'confidence': 0}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(port=port, debug=False)
