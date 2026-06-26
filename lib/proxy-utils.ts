// Allowlist of domains that can be proxied to prevent SSRF attacks.
const ALLOWED_DOMAINS = [
  'openapi.tuyaeu.com',
  'openapi.tuyacn.com',
  'openapi.tuyaus.com',
  'openapi.tuyain.com'
];

export function isValidProxyUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.protocol !== 'https:') {
      return false;
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    if (!ALLOWED_DOMAINS.includes(hostname)) {
      return false;
    }

    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Regex.test(hostname)) {
      const octets = hostname.split('.').map(Number);

      if (
        octets[0] === 10 ||
        (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
        (octets[0] === 192 && octets[1] === 168) ||
        octets[0] === 127
      ) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}
