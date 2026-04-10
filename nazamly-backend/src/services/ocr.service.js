const axios = require('axios');
const FormData = require('form-data');

const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL || 'http://localhost:5001';

/**
 * extractTranscript
 * Sends a file buffer to the Python OCR microservice and returns extracted courses.
 * @param {Buffer} fileBuffer - The uploaded file buffer from multer memoryStorage
 * @param {string} originalName - Original filename (used to determine extension)
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<object>} Extracted transcript data from the OCR service
 */
async function extractTranscript(fileBuffer, originalName, mimeType) {
  const form = new FormData();
  form.append('file', fileBuffer, {
    filename: originalName,
    contentType: mimeType,
  });

  try {
    const response = await axios.post(`${OCR_SERVICE_URL}/extract`, form, {
      headers: { ...form.getHeaders() },
      timeout: 45000, // 45s timeout for large images / Gemini latency
    });

    return response.data;
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new Error('OCR service unavailable');
    }
    if (error.response) {
      const msg = error.response.data?.error || error.message;
      throw new Error(`OCR service error: ${msg}`);
    }
    throw new Error(`OCR service unreachable: ${error.message}`);
  }
}

/**
 * checkOcrHealth
 * Pings the OCR service health endpoint.
 * @returns {Promise<boolean>}
 */
async function checkOcrHealth() {
  try {
    const response = await axios.get(`${OCR_SERVICE_URL}/health`, { timeout: 5000 });
    return response.data?.status === 'ok';
  } catch {
    return false;
  }
}

module.exports = { extractTranscript, checkOcrHealth };
