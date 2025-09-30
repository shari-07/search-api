/**
 * Extracts the first Taobao short link or 1688 QR link from a larger text.
 * Returns an object with the platform name and cleaned link.
 */
export function extractRelevantLink(rawText: string): { platform: 'taobao' | '1688' | null, link: string | null } {
  // Match either Taobao or 1688 link up to first whitespace
  const match = rawText.match(/https?:\/\/(?:e\.tb\.cn|qr\.1688\.com)\/[^\s]*/);
  if (!match) {
    return { platform: null, link: null };
  }

  // Extracted URL
  let url = match[0];

  // Remove anything after "%20"
  const percent20Index = url.indexOf('%20');
  if (percent20Index !== -1) {
    url = url.substring(0, percent20Index);
  }

  // Remove anything after a space (if any slipped through)
  const spaceIndex = url.indexOf(' ');
  if (spaceIndex !== -1) {
    url = url.substring(0, spaceIndex);
  }

  // Determine platform based on URL
  let platform: 'taobao' | '1688' | null = null;
  if (url.includes('e.tb.cn')) {
    platform = 'taobao';
  } else if (url.includes('qr.1688.com')) {
    platform = '1688';
  }

  return { platform, link: url };
}
