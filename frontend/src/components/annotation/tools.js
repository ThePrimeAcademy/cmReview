// Tool + palette definitions for the annotation layer. Colors echo the app's
// paper-and-ink token set so marks feel native to the page, not bolted on.

export const PALETTE = [
  { name: 'Ink', value: 'oklch(24% 0.02 270)' },
  { name: 'Red', value: 'oklch(55% 0.19 25)' },
  { name: 'Green', value: 'oklch(56% 0.14 150)' },
  { name: 'Blue', value: 'oklch(52% 0.17 255)' },
  { name: 'Amber', value: 'oklch(80% 0.15 85)' },
];

// Per-tool stroke rendering. Highlighter is wide, translucent and multiplies
// into the page so text underneath stays readable.
export const TOOLS = {
  pen: { width: 3, opacity: 1, blend: 'normal' },
  highlighter: { width: 16, opacity: 0.32, blend: 'multiply' },
};

export const DEFAULT_COLOR = PALETTE[0].value;
