const axios = require('axios');
const { extractTranscript, checkOcrHealth } = require('../ocr.service');

jest.mock('axios');

describe('OCR Service', () => {
  const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL || 'http://localhost:5001';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractTranscript', () => {
    const mockFileBuffer = Buffer.from('mock file content');
    const mockOriginalName = 'transcript.pdf';
    const mockMimeType = 'application/pdf';

    it('should successfully extract transcript data', async () => {
      const mockResponse = {
        data: {
          courses: [
            { code: 'CS101', name: 'Intro to CS', grade: 'A', credits: 3 }
          ],
          gpa: 4.0
        }
      };

      axios.post.mockResolvedValue(mockResponse);

      const result = await extractTranscript(mockFileBuffer, mockOriginalName, mockMimeType);

      expect(axios.post).toHaveBeenCalledWith(
        `${OCR_SERVICE_URL}/extract`,
        expect.any(Object),
        expect.objectContaining({
          headers: expect.any(Object),
          timeout: 45000
        })
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw error when OCR service is unavailable (ECONNREFUSED)', async () => {
      const error = new Error('Connection refused');
      error.code = 'ECONNREFUSED';
      axios.post.mockRejectedValue(error);

      await expect(extractTranscript(mockFileBuffer, mockOriginalName, mockMimeType))
        .rejects.toThrow('OCR service unavailable');
    });

    it('should throw error when OCR service is not found (ENOTFOUND)', async () => {
      const error = new Error('Not found');
      error.code = 'ENOTFOUND';
      axios.post.mockRejectedValue(error);

      await expect(extractTranscript(mockFileBuffer, mockOriginalName, mockMimeType))
        .rejects.toThrow('OCR service unavailable');
    });

    it('should throw error with response error message', async () => {
      const error = {
        response: {
          data: { error: 'Invalid file format' }
        }
      };
      axios.post.mockRejectedValue(error);

      await expect(extractTranscript(mockFileBuffer, mockOriginalName, mockMimeType))
        .rejects.toThrow('OCR service error: Invalid file format');
    });

    it('should throw generic error when response has no error message', async () => {
      const error = {
        response: { data: {} },
        message: 'Unknown error'
      };
      axios.post.mockRejectedValue(error);

      await expect(extractTranscript(mockFileBuffer, mockOriginalName, mockMimeType))
        .rejects.toThrow('OCR service error: Unknown error');
    });

    it('should throw unreachable error for other errors', async () => {
      const error = new Error('Network timeout');
      axios.post.mockRejectedValue(error);

      await expect(extractTranscript(mockFileBuffer, mockOriginalName, mockMimeType))
        .rejects.toThrow('OCR service unreachable: Network timeout');
    });
  });

  describe('checkOcrHealth', () => {
    it('should return true when OCR service is healthy', async () => {
      axios.get.mockResolvedValue({ data: { status: 'ok' } });

      const result = await checkOcrHealth();

      expect(axios.get).toHaveBeenCalledWith(
        `${OCR_SERVICE_URL}/health`,
        { timeout: 5000 }
      );
      expect(result).toBe(true);
    });

    it('should return false when OCR service returns non-ok status', async () => {
      axios.get.mockResolvedValue({ data: { status: 'error' } });

      const result = await checkOcrHealth();

      expect(result).toBe(false);
    });

    it('should return false when OCR service is unreachable', async () => {
      axios.get.mockRejectedValue(new Error('Connection failed'));

      const result = await checkOcrHealth();

      expect(result).toBe(false);
    });

    it('should return false when response data is missing', async () => {
      axios.get.mockResolvedValue({ data: null });

      const result = await checkOcrHealth();

      expect(result).toBe(false);
    });
  });
});
