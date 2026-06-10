// ClassMarker encodes math in bracket codes inside otherwise-HTML bodies.
// [sqr]radicand[/sqr] is a square root — convert it to a radical sign with a
// vinculum (overline) spanning the radicand. Runs before sanitization, so the
// emitted markup must stay within QuestionHtml's allowed tags/attrs.
export function decodeCmMarkup(html) {
  return String(html).replace(
    /\[sqr\]([\s\S]*?)\[\/sqr\]/gi,
    (_, radicand) =>
      `<span class="cm-sqrt">&radic;<span class="cm-sqrt-radicand">${radicand.trim()}</span></span>`,
  );
}
