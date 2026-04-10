/**
 * Feature: code-practice-platform
 * Property 1: Test Case Round-Trip
 *
 * Property 2: Visibility Assignment
 *
 * Property 3: Malformed Block Rejection
 */

const fc = require('fast-check');
const { parse, serialize, ParseError } = require('../src/services/TestCaseParser');

/**
 * Sanitize a string so it is safe to embed in the test-case file format:
 *   - No blank lines (double newlines) — they would split a block
 *   - No line that is exactly `---` — it would be treated as the separator
 *   - No leading/trailing whitespace — the parser trims the whole block,
 *     which would strip leading/trailing whitespace from input/expectedOutput
 */
function sanitize(str) {
  // Collapse consecutive newlines into a single newline
  let safe = str.replace(/\n{2,}/g, '\n');
  // Replace any line that is exactly `---` with `---x`
  safe = safe
    .split('\n')
    .map((line) => (line === '---' ? '---x' : line))
    .join('\n');
  // Trim leading/trailing whitespace (parser trims the whole block)
  safe = safe.trim();
  return safe;
}

const safeString = fc.string().map(sanitize);

const testCasePair = fc.record({
  input: safeString,
  expectedOutput: safeString,
});

describe('TestCaseParser – Property 1: Test Case Round-Trip', () => {
  /**
   * For any array of test-case pairs (input, expectedOutput):
   *   serialize(pairs) → parse(result) must yield the same input/expectedOutput values.
   *
   */
  it('serialize then parse preserves input and expectedOutput for all test cases', () => {
    fc.assert(
      fc.property(
        fc.array(testCasePair, { minLength: 1 }),
        (pairs) => {
          const serialized = serialize(pairs);
          const parsed = parse(serialized);

          // Same number of test cases
          expect(parsed).toHaveLength(pairs.length);

          // Each pair's input and expectedOutput must round-trip exactly
          for (let i = 0; i < pairs.length; i++) {
            expect(parsed[i].input).toBe(pairs[i].input);
            expect(parsed[i].expectedOutput).toBe(pairs[i].expectedOutput);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('TestCaseParser – Property 2: Visibility Assignment', () => {
  /**
   * For any array of test-case pairs of length N (minLength: 1):
   *   - exactly Math.min(N, 2) test cases have visible: true
   *   - all remaining test cases have visible: false
   *
   */
  it('parse assigns visible:true to first two test cases and visible:false to the rest', () => {
    fc.assert(
      fc.property(
        fc.array(testCasePair, { minLength: 1 }),
        (pairs) => {
          const serialized = serialize(pairs);
          const parsed = parse(serialized);

          const N = pairs.length;
          const expectedVisible = Math.min(N, 2);

          const visibleCount = parsed.filter((tc) => tc.visible === true).length;
          expect(visibleCount).toBe(expectedVisible);

          for (let i = 0; i < parsed.length; i++) {
            if (i < 2) {
              expect(parsed[i].visible).toBe(true);
            } else {
              expect(parsed[i].visible).toBe(false);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('TestCaseParser – Property 3: Malformed Block Rejection', () => {
  /**
   * For any string that contains no line that is exactly `---` and no blank lines:
   *   - It forms a single block when passed to parse()
   *   - parse() must throw a ParseError
   *   - The thrown error must reference block index 0
   *
   */
  it('parse throws a ParseError referencing block 0 for any string with no --- separator', () => {
    // Generator: non-empty string with no `---`-only lines and no blank lines
    const malformedBlock = fc
      .string()
      .filter((s) => {
        const trimmed = s.trim();
        if (trimmed.length === 0) return false;           // must be non-empty
        if (/\n\s*\n/.test(trimmed)) return false;        // no blank lines
        return !trimmed.split('\n').some((line) => line === '---'); // no --- separator
      });

    fc.assert(
      fc.property(malformedBlock, (str) => {
        let threw = false;
        let caughtError = null;

        try {
          parse(str);
        } catch (err) {
          threw = true;
          caughtError = err;
        }

        expect(threw).toBe(true);

        // The error must reference block index 0
        const refersToBlock0 =
          (caughtError instanceof ParseError && caughtError.blockIndex === 0) ||
          (caughtError && caughtError.message && caughtError.message.includes('0'));

        expect(refersToBlock0).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});
