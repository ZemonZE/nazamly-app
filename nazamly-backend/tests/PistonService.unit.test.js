'use strict';

jest.mock('axios');

const axios = require('axios');
const { PistonService, PistonLanguageUnavailableError } = require('../src/services/PistonService');

describe('PistonService', () => {
  let service;

  beforeEach(() => {
    service = new PistonService('http://localhost:2000/api/v2');
    jest.clearAllMocks();
  });

  // ── _resolveRuntime ──────────────────────────────────────────────────────────

  describe('_resolveRuntime', () => {
    test('cpp resolves to c++ 10.2.0', () => {
      expect(service._resolveRuntime('cpp')).toEqual({ language: 'c++', version: '10.2.0' });
    });

    test('js resolves to javascript 18.15.0', () => {
      expect(service._resolveRuntime('js')).toEqual({ language: 'javascript', version: '18.15.0' });
    });

    test('emu8086 resolves to nasm fallback', () => {
      expect(service._resolveRuntime('emu8086')).toEqual({ language: 'nasm', version: '2.15.5' });
    });

    test('plsql resolves to sqlite3 fallback', () => {
      expect(service._resolveRuntime('plsql')).toEqual({ language: 'sqlite3', version: '3.36.0' });
    });

    test('unknown language throws PistonLanguageUnavailableError', () => {
      expect(() => service._resolveRuntime('python')).toThrow(PistonLanguageUnavailableError);
      expect(() => service._resolveRuntime('python')).toThrow("Language 'python' is temporarily unavailable");
    });
  });

  // ── execute ──────────────────────────────────────────────────────────────────

  describe('execute', () => {
    test('returns { stdout, stderr, signal } on success', async () => {
      axios.post.mockResolvedValue({
        data: {
          run: { stdout: 'Hello', stderr: '', signal: null },
        },
      });

      const result = await service.execute('cpp', '#include<stdio.h>\nint main(){puts("Hello");}', '');

      expect(result).toEqual({ stdout: 'Hello', stderr: '', signal: null });
    });

    test('propagates network error when axios.post rejects', async () => {
      const networkError = new Error('Network Error');
      axios.post.mockRejectedValue(networkError);

      await expect(service.execute('js', 'console.log(1)', '')).rejects.toThrow('Network Error');
    });
  });
});
