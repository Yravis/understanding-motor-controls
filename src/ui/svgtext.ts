// Word-wrap for SVG text that has to stay inside a fixed viewBox width (the physical-view warning banner).
// Character-width is a conservative estimate so a line is never wider than maxWidth at the given font size.

/** Upper-case sans-serif is wide; 0.7em is a safe per-character advance for wrap checks. */
export const CHAR_EM = 0.7;

export function wrapLines(text: string, maxWidth: number, fontSize: number, charEm = CHAR_EM): string[] {
  const maxChars = Math.max(1, Math.floor(maxWidth / (fontSize * charEm)));
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word;
    if (next.length > maxChars && cur) { lines.push(cur); cur = word; }
    else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

export function lineWidth(text: string, fontSize: number, charEm = CHAR_EM): number {
  return text.length * fontSize * charEm;
}

export const WARN_TEXT = 'WARNING: orange wires 91/92 (remote interlock) stay live when this bucket is off';
/** Banner inner width in SVG user units (rect is 340 wide with 8-unit side inset). */
export const WARN_MAX_WIDTH = 324;
export const WARN_FONT = 10;
export const WARN_LINE = 13;
export const WARN_PAD = 8;
export const WARN_X = 10;
export const WARN_Y = 34;
export const WARN_RECT_W = 340;

export function warningBannerLayout(text = WARN_TEXT): { lines: string[]; height: number; panelTop: number } {
  const lines = wrapLines(text, WARN_MAX_WIDTH, WARN_FONT);
  const height = WARN_PAD + lines.length * WARN_LINE + 4;
  return { lines, height, panelTop: WARN_Y + height + 8 };
}
