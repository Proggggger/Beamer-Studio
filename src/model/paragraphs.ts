/** TeX ends a paragraph on a blank line; a single newline is just a space. */
export function splitParagraphs(text: string): string[] {
  return text.split(/\n[ \t]*\n+/);
}
