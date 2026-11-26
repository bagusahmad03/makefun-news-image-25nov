// "The World Today - 25 November in One Page" - make.fun news-image-20261125.
// A one-page newspaper poster for Wednesday 25 November 2026, rendered from
// scratch by this program: an in-memory RGB canvas, a small 5x7 bitmap font
// defined below, and a hand-written PNG encoder (zlib + CRC32). Node standard
// library only, no network, no dependencies, fully deterministic.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Writes entry.png (1024x1024) into MAKEFUN_OUTPUT_DIR, or /output inside
// the grader container. Runs on Node 22+.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

const PAGE_W = 1024;
const PAGE_H = 1024;

// Ink on warm newsprint, one red accent.
const PAPER: [number, number, number] = [247, 242, 228];
const INK: [number, number, number] = [24, 22, 18];
const ACCENT: [number, number, number] = [165, 44, 36];
const MUTED: [number, number, number] = [96, 89, 74];
const CARD: [number, number, number] = [255, 254, 248];

// ------------------------------------------------------------------- font
// 5x7 pixel letters: each glyph is seven rows of five bits, "1" = ink.
// Only the characters this page prints are defined; anything else renders
// as a blank cell, so stray input can never break the render.
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "+": ["00000", "00100", "00100", "01110", "00100", "00100", "00000"],
  "|": ["00100", "00100", "00100", "00100", "00100", "00100", "00100"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
};
const EMPTY_CELL = ["00000", "00000", "00000", "00000", "00000", "00000", "00000"];

// ----------------------------------------------------------------- canvas
const pixels = Buffer.alloc(PAGE_W * PAGE_H * 3);

function putPixel(x: number, y: number, color: [number, number, number]): void {
  if (x < 0 || y < 0 || x >= PAGE_W || y >= PAGE_H) return;
  const at = (y * PAGE_W + x) * 3;
  pixels[at] = color[0];
  pixels[at + 1] = color[1];
  pixels[at + 2] = color[2];
}

function rect(x: number, y: number, w: number, h: number, color: [number, number, number]): void {
  for (let row = y; row < y + h; row++) {
    for (let col = x; col < x + w; col++) putPixel(col, row, color);
  }
}

function rule(x: number, y: number, w: number, color: [number, number, number], thickness = 1): void {
  rect(x, y, w, thickness, color);
}

// A glyph is five cells wide plus one gap cell; at scale s every cell is
// an s-by-s block, so a character advances 6*s pixels.
function advance(scale: number): number {
  return 6 * scale;
}

function measure(text: string, scale: number): number {
  return text.length * advance(scale) - scale;
}

function stampGlyph(ch: string, x: number, y: number, scale: number, color: [number, number, number]): void {
  const rows = FONT[ch] ?? EMPTY_CELL;
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 5; c++) {
      if (rows[r][c] === "1") rect(x + c * scale, y + r * scale, scale, scale, color);
    }
  }
}

function typeset(x: number, y: number, text: string, scale: number, color: [number, number, number]): void {
  const upper = text.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    stampGlyph(upper[i], x + i * advance(scale), y, scale, color);
  }
}

function typesetCentered(y: number, text: string, scale: number, color: [number, number, number]): void {
  const upper = text.toUpperCase();
  typeset(Math.floor((PAGE_W - measure(upper, scale)) / 2), y, upper, scale, color);
}

// Greedy word wrap into at most maxLines lines of at most maxChars each.
// Text that still overflows is cut and marked with an ellipsis, and the
// caller records the overflow so the run can fail loudly instead of
// silently printing a truncated page.
function wrapWords(text: string, maxChars: number, maxLines: number): { lines: string[]; overflow: boolean } {
  const words = text.toUpperCase().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word.length > maxChars ? word.slice(0, maxChars) : word;
    }
  }
  if (current) lines.push(current);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[kept.length - 1];
    if (last.length > maxChars - 3) last = last.slice(0, maxChars - 3);
    kept[kept.length - 1] = `${last}...`;
    return { lines: kept, overflow: true };
  }
  return { lines, overflow: false };
}

function typesetLines(
  x: number,
  y: number,
  lines: string[],
  scale: number,
  leading: number,
  color: [number, number, number],
): void {
  lines.forEach((line, i) => typeset(x, y + i * (7 * scale + leading), line, scale, color));
}

// -------------------------------------------------------------------- PNG
// Hand-rolled PNG: signature, IHDR, one IDAT (filter byte 0 per row),
// IEND. Fixed zlib level and chunk layout keep every run byte-identical.
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const name = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])), 0);
  return Buffer.concat([length, name, data, crc]);
}

function encodePng(): Buffer {
  const stride = 1 + PAGE_W * 3;
  const raw = Buffer.alloc(PAGE_H * stride);
  for (let y = 0; y < PAGE_H; y++) {
    raw[y * stride] = 0;
    pixels.copy(raw, y * stride + 1, y * PAGE_W * 3, (y + 1) * PAGE_W * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(PAGE_W, 0);
  ihdr.writeUInt32BE(PAGE_H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------ the stories
// Twelve real stories from Wednesday 25 November 2026, each checked against
// wire reporting (see the research note kept with this build). Headlines and
// decks are shortened for print; claims stay attributed to their source.
type Story = { kicker: string; headline: string; deck: string };

const LEAD: Story = {
  kicker: "LEAD STORY | STRAIT OF HORMUZ",
  headline: "IRAN: TWO TANKERS HIT MINES, BURN IN HORMUZ",
  deck: "Iran's Revolutionary Guards said two oil tankers struck naval mines, exploded and caught fire on an unauthorized route. Washington told US citizens to leave Iran at once. No independent confirmation. - Reuters",
};

const STORIES: Story[] = [
  {
    kicker: "MIDDLE EAST",
    headline: "HOUTHIS SAY THEY HIT SAUDI'S LARGEST REFINERY",
    deck: "Houthis claimed fires at Ras Tanura. NASA imagery showed thick smoke.",
  },
  {
    kicker: "TRADE",
    headline: "US PROPOSES NEW TARIFFS ON 14 PARTNERS",
    deck: "USTR targets China, the EU, India and 11 others over factory capacity.",
  },
  {
    kicker: "MARKETS",
    headline: "AI SELLOFF ROCKS WALL STREET",
    deck: "Nasdaq plunged over 4% intraday, closing down 0.6%. Nvidia fell 3.9%.",
  },
  {
    kicker: "UKRAINE",
    headline: "KYIV: STRIKE DAMAGES FIVE JETS IN RUSSIA",
    deck: "Kyiv said three MiG-31s and two Su-34s were hit at Savasleyka base.",
  },
  {
    kicker: "UKRAINE",
    headline: "RUSSIAN STRIKES CUT POWER IN FIVE REGIONS",
    deck: "Energy and gas sites were damaged; Zaporizhzhia plant lost power again.",
  },
  {
    kicker: "PACIFIC",
    headline: "SOLOMONS PICK AUSTRALIA, BAR FOREIGN BASES",
    deck: "Honiara made Canberra its partner of choice, barring foreign bases.",
  },
  {
    kicker: "SPACE",
    headline: "CHINA FLIES FIRST FOREIGN ASTRONAUT TO TIANGONG",
    deck: "Shenzhou-24 docked with Pakistani Muhammad Zeeshan Ali aboard.",
  },
  {
    kicker: "SUDAN",
    headline: "RSF DRONES KILL 19 CIVILIANS IN BLUE NILE",
    deck: "Emergency Lawyers said drones hit homes in Damazin, wounding 20.",
  },
  {
    kicker: "UNITED STATES",
    headline: "HACKERS BREACH CIA INTELLIGENCE NETWORK",
    deck: "An unclassified CIA and ODNI system was hit; classified systems safe.",
  },
  {
    kicker: "CLIMATE",
    headline: "POPE LEO CALLS COP31 FAILURE 'TROUBLING'",
    deck: "UN climate talks in Turkey collapsed without a deal, first since 2009.",
  },
  {
    kicker: "EUROPE",
    headline: "MERZ: RUSSIA 'WANTS MORE THAN UKRAINE'",
    deck: "Merz defended aid to Kyiv, accusing Moscow of escalating threats.",
  },
];

// ----------------------------------------------------------------- layout
const MARGIN = 36;
const CONTENT_W = PAGE_W - MARGIN * 2; // 952
const CARD_W = 468;
const CARD_H = 104;
const ROW_GAP = 10;
const COL_GAP = 16;

const overflows: string[] = [];

// Wrap text for a fixed-width block and record any overflow under `label`,
// so main() can fail loudly instead of silently printing a truncated page.
// Every text block on the page goes through this helper, which keeps the
// wrap parameters and the overflow bookkeeping in one place.
function wrappedLines(text: string, maxChars: number, maxLines: number, label: string): string[] {
  const wrapped = wrapWords(text, maxChars, maxLines);
  if (wrapped.overflow) overflows.push(label);
  return wrapped.lines;
}

// Wrap a block of text and typeset it at (x, y) in one step.
function typesetWrapped(
  x: number,
  y: number,
  text: string,
  maxChars: number,
  maxLines: number,
  label: string,
  scale: number,
  leading: number,
  color: [number, number, number],
): void {
  typesetLines(x, y, wrappedLines(text, maxChars, maxLines, label), scale, leading, color);
}

// Fill a card and draw a solid border of the given thickness around it.
function borderedCard(
  x: number,
  y: number,
  w: number,
  h: number,
  fill: [number, number, number],
  borderColor: [number, number, number],
  borderThickness: number,
): void {
  rect(x, y, w, h, fill);
  rule(x, y, w, borderColor, borderThickness);
  rule(x, y + h - borderThickness, w, borderColor, borderThickness);
  rect(x, y, borderThickness, h, borderColor);
  rect(x + w - borderThickness, y, borderThickness, h, borderColor);
}

// Position of story `index` (0-based) in the two-column grid: the first
// six stories fill the left column top to bottom, the rest fill the right.
function storyPosition(index: number, gridTop: number, leftX: number, rightX: number): { x: number; y: number } {
  const inLeft = index < 6;
  const row = inLeft ? index : index - 6;
  return { x: inLeft ? leftX : rightX, y: gridTop + row * (CARD_H + ROW_GAP) };
}

function masthead(): void {
  rule(MARGIN, 22, CONTENT_W, INK, 3);
  typesetCentered(34, "THE WORLD TODAY", 6, INK);
  rule(MARGIN, 84, CONTENT_W, INK, 2);
  typesetCentered(94, "WEDNESDAY, 25 NOVEMBER 2026  |  25 NOVEMBER IN ONE PAGE", 2, MUTED);
  rule(MARGIN, 116, CONTENT_W, INK, 3);
}

function leadBlock(): void {
  const x = MARGIN;
  const y = 128;
  const h = 150;
  borderedCard(x, y, CONTENT_W, h, CARD, INK, 3);
  typeset(x + 16, y + 12, LEAD.kicker, 2, ACCENT);
  const headLines = wrappedLines(LEAD.headline, 51, 2, "lead headline");
  headLines.forEach((line, i) => typesetCentered(y + 36 + i * 24, line, 3, INK));
  typesetWrapped(x + 16, y + 92, LEAD.deck, 76, 3, "lead deck", 2, 2, INK);
}

function storyCard(x: number, y: number, story: Story, index: number): void {
  rect(x, y, CARD_W, CARD_H, CARD);
  rule(x, y, CARD_W, ACCENT, 2);
  typeset(x + 12, y + 10, story.kicker, 1, ACCENT);
  typesetWrapped(x + 12, y + 26, story.headline, 37, 2, `story ${index} headline`, 2, 1, INK);
  typesetWrapped(x + 12, y + 62, story.deck, 37, 2, `story ${index} deck`, 2, 1, MUTED);
}

function aboutBox(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, CARD);
  rule(x, y, w, INK, 2);
  typeset(x + 12, y + 10, "ABOUT THIS PAGE", 2, ACCENT);
  const body =
    "Twelve real stories from Wednesday, 25 November 2026, drawn from Reuters, AP, CNN and Xinhua wire reporting. Headlines are shortened for print; facts and figures follow the wires. Rendered 26 November 2026.";
  typesetWrapped(x + 12, y + 34, body, 71, 5, "about box", 1, 3, INK);
}

function footer(): void {
  rule(MARGIN, 976, CONTENT_W, INK, 2);
  typesetCentered(
    988,
    "SOURCES: REUTERS | AP | CNN | XINHUA | TWELVE REAL STORIES FROM WEDNESDAY, 25 NOVEMBER 2026",
    1,
    MUTED,
  );
}

// -------------------------------------------------------------------- main
function main(): void {
  rect(0, 0, PAGE_W, PAGE_H, PAPER);
  masthead();
  leadBlock();

  // Eleven stories in two columns (six left, five right); the about box
  // fills the last right-hand slot so the grid stays a clean rectangle.
  const gridTop = 290;
  const leftX = MARGIN;
  const rightX = MARGIN + CARD_W + COL_GAP;
  STORIES.forEach((story, i) => {
    const pos = storyPosition(i, gridTop, leftX, rightX);
    storyCard(pos.x, pos.y, story, i + 2);
  });
  const aboutY = gridTop + 5 * (CARD_H + ROW_GAP);
  aboutBox(rightX, aboutY, CARD_W, gridTop + 6 * CARD_H + 5 * ROW_GAP - aboutY);

  footer();

  if (overflows.length > 0) {
    console.error(`OVERFLOW: ${overflows.join(", ")}`);
    process.exitCode = 1;
  }

  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "entry.png");
  writeFileSync(outPath, encodePng());
  console.log(`wrote ${outPath} (${PAGE_W}x${PAGE_H})`);
}

main();
