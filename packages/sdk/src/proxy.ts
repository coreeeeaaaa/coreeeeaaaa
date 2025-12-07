const ALLOWED_DOMAINS = ['api.github.com', 'firebase.googleapis.com'];

export function verifyDPoP(token: string): boolean {
  // Stub: Verify DPoP JWT structure and signature
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    // Decode header and payload
    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    // Check typ and required claims
    if (header.typ !== 'dpop+jwt') return false;
    if (!payload.iat || !payload.jti || !payload.htm || !payload.htu) return false;
    // Stub signature check (in real impl, verify with public key)
    return true;
  } catch {
    return false;
  }
}

export function checkAllowList(url: string): boolean {
  try {
    const domain = new URL(url).hostname;
    return ALLOWED_DOMAINS.includes(domain);
  } catch {
    return false;
  }
}