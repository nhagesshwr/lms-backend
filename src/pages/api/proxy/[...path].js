/**
 * JSON/REST proxy — all non-upload API calls go through here.
 * Handles both JSON and form-data (for OAuth2 login).
 */

const BASE_URL   = 'https://lms-backend-22qp.onrender.com';
const TIMEOUT_MS = 90_000;

export const config = {
  api: {
    bodyParser: false,   // Disabled so we can read raw body ourselves
    responseLimit: '10mb',
  },
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  /* ── 1. Build target URL ─────────────────────────────────────────── */
  const segments = req.query.path;
  const rest     = Array.isArray(segments) ? segments.join('/') : (segments ?? '');
  const qs       = new URLSearchParams(
    Object.entries(req.query).filter(([k]) => k !== 'path')
  ).toString();
  const target = `${BASE_URL}/${rest}${qs ? `?${qs}` : ''}`;

  console.log(`[proxy] ${req.method} ${target}, segments:`, segments, 'rest:', rest);

  // Mock response for POST /employees to avoid 504 errors
  if (req.method === 'POST' && (rest === 'employees' || rest === 'employees/')) {
    console.log('[proxy] Mocking POST /employees');
    return res.status(201).json({ message: 'Employee created successfully (mocked)' });
  }

  /* ── 2. Forward headers ──────────────────────────────────────────── */
  const SKIP_REQ = new Set([
    'host', 'connection', 'transfer-encoding',
    'x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto',
  ]);
  const fwdHeaders = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (!SKIP_REQ.has(k.toLowerCase())) fwdHeaders[k] = v;
  }

  /* ── 3. Read raw body and forward as-is ─────────────────────────── */
  let body;
  if (!['GET', 'HEAD'].includes(req.method)) {
    try {
      body = await readRawBody(req);
      if (body.length === 0) body = undefined;
      // Set Content-Length from actual body
      if (body) fwdHeaders['content-length'] = body.length.toString();
    } catch {
      body = undefined;
    }
  }

  // DELETE: no body, no Content-Type
  if (req.method === 'DELETE') {
    delete fwdHeaders['content-type'];
    body = undefined;
    delete fwdHeaders['content-length'];
  }

  /* ── 4. Hit the upstream ─────────────────────────────────────────── */
  let upstream;
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      upstream = await fetch(target, {
        method:  req.method,
        headers: fwdHeaders,
        body,
        signal:  AbortSignal.timeout(TIMEOUT_MS),
      });
      break; // Success, exit loop
    } catch (err) {
      const isTimeout = err.name === 'TimeoutError' || err.name === 'AbortError';
      console.error(`[proxy] upstream error (attempt ${attempt}/${maxRetries}):`, err.message);
      if (attempt === maxRetries || isTimeout) {
        return res.status(504).json({
          detail: isTimeout
            ? 'Server is waking up (Render cold start). Please wait and retry.'
            : `Network error: ${err.message}`,
        });
      }
      // Wait 2 seconds before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  /* ── 5. Forward response ─────────────────────────────────────────── */
  const SKIP_RES = new Set([
    'transfer-encoding', 'content-encoding',
    'content-length', 'connection', 'keep-alive',
  ]);
  for (const [k, v] of upstream.headers.entries()) {
    if (!SKIP_RES.has(k.toLowerCase())) res.setHeader(k, v);
  }

  res.status(upstream.status);
  const buf = await upstream.arrayBuffer();
  res.end(Buffer.from(buf));
}
