/**
 * Extracts the first “https://e.tb.cn/…” substring from a larger text.
 * Returns `null` if none found.
 */
export function extractShortTbLink(rawText: string): string | null {
  // 1) Find the first substring starting with "http(s)://e.tb.cn/" up to whitespace
  const match = rawText.match(/https?:\/\/e\.tb\.cn\/[^\s]*/);
  if (!match) {
    return null;
  }

  // 2) Once we have the matched substring, drop anything after "%20"
  let url = match[0];
  const percent20Index = url.indexOf('%20');
  if (percent20Index !== -1) {
    url = url.substring(0, percent20Index);
  }

  return url;
}
