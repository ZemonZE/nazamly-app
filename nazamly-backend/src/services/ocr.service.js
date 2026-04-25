const axios    = require('axios');
const FormData = require('form-data');
const fs       = require('fs');

const OCR_URL = process.env.OCR_SERVICE_URL || 'http://localhost:5001';

/**
 * Send a file to the Python OCR microservice for extraction.
 *
 * @param {string} filePath  Absolute path to the uploaded file on disk
 * @returns {Promise<object>} { courses[], semester, student_id, confidence, source }
 * @throws Will throw if the service is unreachable or returns an error
 */
async function extractTranscript(filePath) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));

  try {
    const response = await axios.post(`${OCR_URL}/extract`, form, {
      headers: { ...form.getHeaders() },
      timeout: 60_000,   // 60s — Gemini Vision calls can take time for large images
    });
    return response.data;
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      throw new Error('OCR service is not running. Start it with: cd ocr-service && python app.py');
    }
    if (err.response) {
      const msg = err.response.data?.error || err.response.data?.message || err.message;
      throw new Error(`OCR service error: ${msg}`);
    }
    throw new Error(`OCR request failed: ${err.message}`);
  }
}

module.exports = { extractTranscript };
