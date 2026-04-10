/**
 * TestCaseParser
 * Pure utility — no I/O, no side effects.
 * Parses the uploaded test case text file into an array of TestCase objects,
 * and serializes them back to the canonical file format.
 */

class ParseError extends Error {
  constructor(blockIndex) {
    super(`Test case block at index ${blockIndex} is missing the '---' separator.`);
    this.name = 'ParseError';
    this.blockIndex = blockIndex;
    this.code = 'INVALID_TEST_CASE_FORMAT';
  }
}

/**
 * Parses raw file content into an array of TestCase objects.
 * Blocks are separated by one or more blank lines.
 * Within each block, a line containing only `---` separates input from expectedOutput.
 *
 * @param {string} fileContent - Raw text content of the test case file.
 * @returns {{ input: string, expectedOutput: string, visible: boolean }[]}
 * @throws {ParseError} If any block is missing the `---` separator.
 */
function parse(fileContent) {
  // Split on one or more blank lines (handles \r\n and \n)
  const blocks = fileContent.split(/(?:\r?\n){2,}/);

  const testCases = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].trim();
    if (!block) continue; // skip empty blocks at start/end

    const lines = block.split(/\r?\n/);
    const separatorIndex = lines.findIndex((line) => line === '---');

    if (separatorIndex === -1) {
      throw new ParseError(i);
    }

    const input = lines.slice(0, separatorIndex).join('\n');
    const expectedOutput = lines.slice(separatorIndex + 1).join('\n');

    testCases.push({ input, expectedOutput });
  }

  // Assign visibility: first two are visible, rest are hidden
  return testCases.map((tc, index) => ({
    ...tc,
    visible: index < 2,
  }));
}

/**
 * Serializes an array of TestCase objects back to the canonical file format.
 *
 * @param {{ input: string, expectedOutput: string }[]} testCases
 * @returns {string}
 */
function serialize(testCases) {
  return testCases
    .map((tc) => `${tc.input}\n---\n${tc.expectedOutput}`)
    .join('\n\n');
}

module.exports = { parse, serialize, ParseError };
