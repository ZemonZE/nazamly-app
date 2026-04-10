/**
 * Unit tests for TestCaseParser
 */

const { parse, serialize, ParseError } = require('../src/services/TestCaseParser');

describe('TestCaseParser – Unit Tests', () => {
  // 1. Valid single test case
  describe('parse – single test case', () => {
    it('parses a file with one block and returns correct input, expectedOutput, and visible', () => {
      const content = 'hello world\n---\nHello, World!';
      const result = parse(content);

      expect(result).toHaveLength(1);
      expect(result[0].input).toBe('hello world');
      expect(result[0].expectedOutput).toBe('Hello, World!');
      expect(result[0].visible).toBe(true);
    });
  });

  // 2. Valid multiple test cases
  describe('parse – multiple test cases', () => {
    it('parses 3+ blocks and assigns visibility correctly (first 2 visible, rest hidden)', () => {
      const content = [
        '1\n---\none',
        '2\n---\ntwo',
        '3\n---\nthree',
        '4\n---\nfour',
      ].join('\n\n');

      const result = parse(content);

      expect(result).toHaveLength(4);

      expect(result[0].input).toBe('1');
      expect(result[0].expectedOutput).toBe('one');
      expect(result[0].visible).toBe(true);

      expect(result[1].input).toBe('2');
      expect(result[1].expectedOutput).toBe('two');
      expect(result[1].visible).toBe(true);

      expect(result[2].input).toBe('3');
      expect(result[2].expectedOutput).toBe('three');
      expect(result[2].visible).toBe(false);

      expect(result[3].input).toBe('4');
      expect(result[3].expectedOutput).toBe('four');
      expect(result[3].visible).toBe(false);
    });
  });

  // 3. Missing `---` separator
  describe('parse – missing separator', () => {
    it('throws ParseError with correct blockIndex when a block has no --- separator', () => {
      // First block is valid, second block is malformed
      const content = 'valid input\n---\nvalid output\n\nno separator here';

      expect(() => parse(content)).toThrow(ParseError);

      try {
        parse(content);
      } catch (err) {
        expect(err).toBeInstanceOf(ParseError);
        expect(err.blockIndex).toBe(1);
        expect(err.code).toBe('INVALID_TEST_CASE_FORMAT');
        expect(err.message).toContain('1');
      }
    });

    it('throws ParseError with blockIndex 0 when the only block has no --- separator', () => {
      expect(() => parse('no separator here')).toThrow(ParseError);

      try {
        parse('no separator here');
      } catch (err) {
        expect(err.blockIndex).toBe(0);
      }
    });
  });

  // 4. Empty file
  describe('parse – empty file', () => {
    it('returns an empty array for an empty string without throwing', () => {
      const result = parse('');
      expect(result).toEqual([]);
    });
  });

  // 5. Extra blank lines between blocks
  describe('parse – extra blank lines between blocks', () => {
    it('parses correctly when blocks are separated by 3+ blank lines', () => {
      const content = 'a\n---\nA\n\n\n\nb\n---\nB\n\n\n\n\nc\n---\nC';
      const result = parse(content);

      expect(result).toHaveLength(3);
      expect(result[0].input).toBe('a');
      expect(result[0].expectedOutput).toBe('A');
      expect(result[0].visible).toBe(true);

      expect(result[1].input).toBe('b');
      expect(result[1].expectedOutput).toBe('B');
      expect(result[1].visible).toBe(true);

      expect(result[2].input).toBe('c');
      expect(result[2].expectedOutput).toBe('C');
      expect(result[2].visible).toBe(false);
    });
  });
});
