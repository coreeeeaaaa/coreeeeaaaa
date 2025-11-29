# Egress Proxy Infrastructure

## Overview
Egress proxy enforces Zero-Exposure by controlling outbound requests with DPoP, mTLS, and allow-list domains.

## DPoP Token Structure
- JWT with `typ: "dpop+jwt"`.
- Claims: `iat`, `jti` (unique, no reuse), `htm`, `htu`, `ath`.
- Signed with client's private key.

## mTLS Setup
- Client certificates required for mutual TLS.
- Server validates client cert against CA.

## Audience/Nonce/JTI Handling
- Audience fixed to `coreeeeaaaa-fixed-audience`.
- Nonce prevents replay.
- JTI reuse blocked.

## Rate/Quota Policies
- Per-domain limits: 100 req/min.
- Burst handling via token bucket.

## Example Node.js Proxy (Prototype)
```javascript
const express = require('express');
const app = express();

app.use((req, res, next) => {
  // Validate DPoP, mTLS, audience, JTI
  if (!validateEgress(req)) {
    return res.status(403).send('Egress denied');
  }
  next();
});

function validateEgress(req) {
  // Implement validations
  return true; // Placeholder
}

app.listen(3000);
```

## Security Notes
- Allow-list: `api.github.com`, `firebase.googleapis.com`.
- Logs all requests for audit.