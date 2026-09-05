import { SIZES } from './generation/levels';

/**
 * The puzzle code: a shareable string that *is* the puzzle.
 *
 * The solution grid packed one bit per cell, base64url. Not a seed — a seed is
 * an input to a search, and the same seed at another difficulty is another
 * puzzle, which is why sharing one never reproduced anything. A code carries the
 * finished grid, so it identifies exactly one puzzle and cannot be repointed by
 * a later change to the generator.
 *
 * Size is implied by length, which is unique per size: 6, 18 and 39 characters.
 * A code of any other length is rejected. There is no prefix or version marker;
 * a new size would simply add a new valid length.
 */

const bytesFor = (size: number) => Math.ceil((size * size) / 8);

/** Canonical unpadded base64url length for n bytes. */
function codeLength(n: number): number {
  const remainder = n % 3;
  return 4 * Math.floor(n / 3) + (remainder === 0 ? 0 : remainder === 1 ? 2 : 3);
}

/** Code length -> grid size, for the sizes the app supports. */
const SIZE_BY_LENGTH = new Map<number, number>(
  SIZES.map((size) => [codeLength(bytesFor(size)), size])
);

// base64url rather than base64, so a code is safe in a URL untouched: the two
// substitutions below are the whole difference, plus dropping the padding that
// only exists to round the length out.
function toBase64Url(bytes: Uint8Array): string {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(code: string): Uint8Array | null {
  try {
    // atob is the validator too: it throws on anything outside the alphabet,
    // and on a length that cannot be a whole number of bytes.
    const binary = atob(code.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

/** Cells to bytes, eight at a time, most significant bit first. */
function packBits(bits: boolean[]): Uint8Array {
  const bytes = new Uint8Array(Math.ceil(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    const octet = bits.slice(i * 8, i * 8 + 8).map((bit) => (bit ? '1' : '0'));
    // The last octet is short when the cell count is not a multiple of eight;
    // padEnd fills it with the zeroes that decoding will ignore.
    bytes[i] = parseInt(octet.join('').padEnd(8, '0'), 2);
  }
  return bytes;
}

/** Bytes back to cells, dropping the padding bits past the last one. */
function unpackBits(bytes: Uint8Array, count: number): boolean[] {
  return Array.from(bytes)
    .flatMap((byte) => byte.toString(2).padStart(8, '0').split(''))
    .slice(0, count)
    .map((bit) => bit === '1');
}

/** The code for a solution grid. */
export function encodePuzzleCode(solution: boolean[][]): string {
  return toBase64Url(packBits(solution.flat()));
}

/**
 * The grid a code describes, or null if the string is not a well-formed code.
 *
 * Shape only — whether the grid makes a good puzzle (unique, solvable, not
 * degenerate) is a separate question, answered by the generator's own
 * `evaluatePattern`.
 */
export function decodePuzzleCode(code: string): boolean[][] | null {
  const size = SIZE_BY_LENGTH.get(code.length);
  if (size === undefined) return null;

  const bytes = fromBase64Url(code);
  if (bytes === null || bytes.length !== bytesFor(size)) return null;

  const cells = unpackBits(bytes, size * size);
  return Array.from({ length: size }, (_, row) => cells.slice(row * size, (row + 1) * size));
}

/**
 * A shareable link for a code.
 *
 * The code rides in the hash, which never reaches the network, the service
 * worker or GitHub Pages' routing — `public/404.html` is a real error page
 * rather than an SPA shim, so a path-shaped link would land on it. Built from
 * BASE_URL so it is right in production, in the /preview/ deploys, and locally.
 */
export function shareUrl(code: string): string {
  const base = import.meta.env.BASE_URL;
  return `${window.location.origin}${base}#${code}`;
}

/**
 * The code in whatever the player pasted — a bare code or a whole link.
 *
 * Everything after the last `#` is taken as the code, so both forms work with no
 * mode to choose and nothing to explain.
 */
export function codeFromInput(text: string): string {
  const trimmed = text.trim();
  const hash = trimmed.lastIndexOf('#');
  return hash === -1 ? trimmed : trimmed.slice(hash + 1);
}
