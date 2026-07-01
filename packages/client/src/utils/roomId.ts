/**
 * Generates a short, random room ID suitable for use in URLs.
 *
 * Character set excludes visually ambiguous characters:
 * - 0 / O (zero vs letter O)
 * - 1 / I / l (one vs letter I vs lowercase l)
 *
 * This makes room codes easier to read aloud or type manually.
 */
const CHARS = "abcdefghjkmnpqrstuvwxyz23456789";

/**
 * @param length Number of characters in the generated ID (default: 6)
 * @returns A random, URL-safe room ID, e.g. "x7k2mn"
 */
export function generateRoomId(length = 6): string {
  return Array.from(
    { length },
    () => CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join("");
}
