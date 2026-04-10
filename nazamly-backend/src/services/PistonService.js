const axios = require('axios');

class PistonLanguageUnavailableError extends Error {
  constructor(language) {
    super(`Language '${language}' is temporarily unavailable. Please try again later or use a different language.`);
    this.name = 'PistonLanguageUnavailableError';
    this.language = language;
  }
}

class PistonService {
  constructor(baseUrl = process.env.PISTON_BASE_URL || 'http://localhost:2000/api/v2') {
    this.baseUrl = baseUrl;
  }

  _resolveRuntime(language) {
    // Piston v3 language names (from /api/v2/runtimes)
    const runtimes = {
      cpp:     { language: 'c++',        version: '10.2.0' },
      js:      { language: 'javascript', version: '18.15.0' },
      emu8086: { language: 'nasm',       version: '2.15.5' },
      plsql:   { language: 'sqlite3',    version: '3.36.0' },
    };
    const runtime = runtimes[language];
    if (!runtime) throw new PistonLanguageUnavailableError(language);
    return runtime;
  }

  async execute(language, code, stdin) {
    const runtime = this._resolveRuntime(language);

    let response;
    try {
      response = await axios.post(
        `${this.baseUrl}/execute`,
        {
          language: runtime.language,
          version:  runtime.version,
          files:    [{ content: code }],
          stdin:    stdin || '',
          run_timeout: 10000,  // 10s — matches PISTON_RUN_TIMEOUT env on container
        },
        { timeout: 15000 }
      );
    } catch (err) {
      if (err.response) {
        const msg = err.response.data?.message || err.response.statusText;
        console.error('[PistonService] HTTP error:', err.message);
        console.error('[PistonService] Piston response:', err.response.status, msg);
        console.error('[PistonService] Request body:', JSON.stringify({
          language: runtime.language,
          version: runtime.version,
          stdin: (stdin || '').substring(0, 100),
        }));
        if (err.response.status === 400 && msg?.toLowerCase().includes('runtime')) {
          throw new PistonLanguageUnavailableError(language);
        }
        // Surface the actual Piston error message to the caller
        const pistonErr = new Error(msg || `Piston returned ${err.response.status}`);
        pistonErr.pistonStatus = err.response.status;
        pistonErr.pistonData = err.response.data;
        throw pistonErr;
      }
      console.error('[PistonService] Network error:', err.message);
      throw err;
    }

    const run = response.data.run || response.data;
    return {
      stdout: run.stdout || '',
      stderr: run.stderr || '',
      signal: run.signal || null,
    };
  }
}

const pistonService = new PistonService();
module.exports = pistonService;
module.exports.PistonService = PistonService;
module.exports.PistonLanguageUnavailableError = PistonLanguageUnavailableError;
