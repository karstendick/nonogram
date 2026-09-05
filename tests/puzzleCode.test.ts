import { describe, it, expect } from 'vitest';
import {
  codeFromInput,
  decodePuzzleCode,
  encodePuzzleCode,
  shareUrl,
} from '../src/logic/puzzleCode';
import { SIZES } from '../src/logic/generation/levels';

/**
 * The code format. Its whole job is to survive a round trip through a chat
 * message, so the tests that matter are the round trip and the rejections.
 */

function gridFrom(size: number, fill: (row: number, col: number) => boolean): boolean[][] {
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => fill(row, col))
  );
}

/** Deterministic pseudo-random grid: exercises every bit position. */
const scattered = (size: number) => gridFrom(size, (r, c) => (r * size + c) % 3 === 0);

describe('puzzleCode', () => {
  it('round-trips every size', () => {
    for (const size of SIZES) {
      const grid = scattered(size);
      expect(decodePuzzleCode(encodePuzzleCode(grid))).toEqual(grid);
    }
  });

  it('round-trips the extremes, where padding bits are most likely to leak', () => {
    for (const size of SIZES) {
      for (const grid of [gridFrom(size, () => true), gridFrom(size, () => false)]) {
        expect(decodePuzzleCode(encodePuzzleCode(grid))).toEqual(grid);
      }
    }
  });

  it('encodes a known grid to a known string', () => {
    // The format is a promise to every code already shared: if this value ever
    // changes, links in the wild start opening different puzzles. A round trip
    // cannot catch that, because encode and decode change together — only a
    // fixed literal can. Cells are read in reading order, eight to a byte, most
    // significant bit first.
    const known = [
      [true, false, true, false, true],
      [false, true, false, true, false],
      [true, true, false, false, true],
      [false, false, true, true, false],
      [true, false, false, false, true],
    ];
    expect(encodePuzzleCode(known)).toBe('qrJogA');
    expect(decodePuzzleCode('qrJogA')).toEqual(known);
  });

  it('encodes to exactly the documented lengths', () => {
    // The format is a promise made to every code already shared. A packing or
    // padding change would show up here first.
    expect(encodePuzzleCode(scattered(5))).toHaveLength(6);
    expect(encodePuzzleCode(scattered(10))).toHaveLength(18);
    expect(encodePuzzleCode(scattered(15))).toHaveLength(39);
  });

  it('ignores the bits past the last cell', () => {
    // A 15x15 code carries 29 bytes = 232 bits for 225 cells. The 7 spare bits
    // must not become a 16th row or shift the grid.
    const grid = scattered(15);
    const decoded = decodePuzzleCode(encodePuzzleCode(grid))!;
    expect(decoded).toHaveLength(15);
    decoded.forEach((row) => expect(row).toHaveLength(15));
  });

  it('rejects whitespace and padding, which atob would otherwise tolerate', () => {
    // atob strips ASCII whitespace before decoding, so a code of the right
    // length containing spaces could decode to a short-but-valid byte string.
    // The byte-count check is the gate that catches it.
    expect(decodePuzzleCode('abc de')).toBeNull(); // strips to 5 chars: not whole bytes
    expect(decodePuzzleCode('ab  cd')).toBeNull(); // strips to 4 chars: 3 bytes, needs 4
    expect(decodePuzzleCode('abcd  ')).toBeNull();
    expect(decodePuzzleCode('abcd==')).toBeNull(); // padding is never part of a code
  });

  it('rejects anything that is not a well-formed code', () => {
    expect(decodePuzzleCode('')).toBeNull();
    expect(decodePuzzleCode('short')).toBeNull(); // 5 chars: no size packs to that
    expect(decodePuzzleCode('waytoolongtobeanything')).toBeNull();
    expect(decodePuzzleCode('abcde!')).toBeNull(); // right length, bad alphabet
    expect(decodePuzzleCode('abc de')).toBeNull();
    expect(decodePuzzleCode(encodePuzzleCode(scattered(15)).slice(0, -1))).toBeNull();
  });

  it('accepts a bare code or a whole link', () => {
    const code = encodePuzzleCode(scattered(15));
    expect(codeFromInput(code)).toBe(code);
    expect(codeFromInput(`  ${code}  `)).toBe(code);
    expect(codeFromInput(`https://karstendick.github.io/nonogram/#${code}`)).toBe(code);
    // Everything after the LAST hash, so a link with its own fragment still works.
    expect(codeFromInput(`https://example.com/#/play#${code}`)).toBe(code);
  });

  it('builds a link under whatever base path the app is deployed at', () => {
    // Preview deploys live under /nonogram/preview/<branch>/, so a hardcoded
    // base would hand previewers a link back to production.
    const url = shareUrl('abcdef');
    expect(url.endsWith('#abcdef')).toBe(true);
    expect(url.startsWith(window.location.origin)).toBe(true);
    expect(url).toContain(import.meta.env.BASE_URL);
  });
});
