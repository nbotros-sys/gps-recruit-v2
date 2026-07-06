// Clean stray HTML that arrives in CV text (mainly LinkedIn's <br> line breaks and
// experience/summary descriptions) into readable plain text with real line breaks.
// Safe on already-clean text — leaves normal text untouched.
export function cleanCvText(text?: string | null): string {
  if (!text) return ""
  return text
    .replace(/<br\s*\/?>/gi, "\n")                                  // <br>, <br/>, <br />
    .replace(/<\/?p\s*\/?>/gi, "\n")                                // stray <p> / </p>
    .replace(/<\/?(strong|b|em|i|u|span|div|ul|ol|li|a)\b[^>]*>/gi, "") // strip other inline tags
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t]+\n/g, "\n")                                      // trailing spaces
    .replace(/\n{3,}/g, "\n\n")                                     // collapse blank lines
    .trim()
}
