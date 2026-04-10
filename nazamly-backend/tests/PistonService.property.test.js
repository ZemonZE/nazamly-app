// Feature: code-practice-platform, Property 15: Piston Request Parameters

jest.mock('axios');

const axios = require('axios');
const fc = require('fast-check');
const { PistonService } = require('../src/services/PistonService');

const RUNTIME_MAP = {
  cpp: 'c++',
  js: 'javascript',
};

describe('Property 15: Piston Request Parameters', () => {
  let pistonService;

  beforeEach(() => {
    jest.clearAllMocks();
    pistonService = new PistonService('http://localhost:2000/api/v2');
    axios.post.mockResolvedValue({
      data: { run: { stdout: '', stderr: '', signal: null } },
    });
  });

  it('should call axios.post with correct parameters for all valid inputs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          language: fc.constantFrom('cpp', 'js'),
          code: fc.string(),
          stdin: fc.string(),
        }),
        async ({ language, code, stdin }) => {
          jest.clearAllMocks();

          await pistonService.execute(language, code, stdin);

          expect(axios.post).toHaveBeenCalledTimes(1);

          const [url, body] = axios.post.mock.calls[0];

          // URL must contain /execute
          expect(url).toContain('/execute');

          // Runtime name must be correctly mapped
          expect(body.language).toBe(RUNTIME_MAP[language]);

          // Code must be passed as file content
          expect(body.files).toEqual([{ content: code }]);

          // stdin must match
          expect(body.stdin).toBe(stdin);

          // Timeout must be set
          expect(body.run_timeout).toBe(10000);
        }
      ),
      { numRuns: 100 }
    );
  });
});
