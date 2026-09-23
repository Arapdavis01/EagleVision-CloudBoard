// ============================================================
// SPAM PROTECTION FOR PUBLIC FORMS
// ============================================================
// Two layers:
//   1. Honeypot — hidden field that bots fill, humans don't
//   2. In-memory rate limiting per IP
// ============================================================

// ---------- In-memory IP rate limit store ----------
// Structure: { ip: { count, firstAttempt, blockedUntil } }
const ipStore = new Map();

// Config
const WINDOW_MS = 60 * 60 * 1000;      // 1 hour window
const MAX_ATTEMPTS = 5;                 // 5 requests per window
const BLOCK_MS = 60 * 60 * 1000;        // block for 1 hour if exceeded

// Cleanup interval to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of ipStore.entries()) {
    if (now - data.firstAttempt > WINDOW_MS && (!data.blockedUntil || data.blockedUntil < now)) {
      ipStore.delete(ip);
    }
  }
}, 10 * 60 * 1000); // every 10 minutes

// ---------- Rate limit check ----------
function checkRateLimit(ip) {
  const now = Date.now();
  const entry = ipStore.get(ip);

  if (!entry) {
    ipStore.set(ip, { count: 1, firstAttempt: now });
    return { ok: true };
  }

  // If currently blocked
  if (entry.blockedUntil && entry.blockedUntil > now) {
    const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
    return {
      ok: false,
      retryAfter,
      reason: 'Too many requests. Please try again later.',
    };
  }

  // If window expired, reset
  if (now - entry.firstAttempt > WINDOW_MS) {
    ipStore.set(ip, { count: 1, firstAttempt: now });
    return { ok: true };
  }

  // Increment within window
  entry.count += 1;

  if (entry.count > MAX_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_MS;
    const retryAfter = Math.ceil(BLOCK_MS / 1000);
    return {
      ok: false,
      retryAfter,
      reason: 'Too many requests. Please try again later.',
    };
  }

  return { ok: true };
}

// ---------- Main middleware ----------
exports.publicFormProtection = (req, res, next) => {
  // 1. Honeypot check
  //    If a bot fills the hidden "website" field, we reject silently (200 with fake success)
  const honeypotValue = req.body.website || req.body.honeypot;
  if (honeypotValue && honeypotValue.trim() !== '') {
    console.warn(`[SPAM] Honeypot triggered from ${req.ip}`);
    // Return fake success so bots don't retry
    return res.status(200).json({
      reference_code: 'SYS-0000-0000',
      message: 'Thank you for your submission.',
    });
  }

  // 2. Rate limit check
  const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  const check = checkRateLimit(ip);

  if (!check.ok) {
    return res.status(429).json({
      error: check.reason,
      retry_after: check.retryAfter,
    });
  }

  // 3. Sanity check: reject if all major fields are suspiciously short or identical
  const { full_name, email, description } = req.body;
  if (
    full_name && email && description &&
    full_name === email &&
    email === description
  ) {
    console.warn(`[SPAM] Suspicious identical fields from ${ip}`);
    return res.status(400).json({ error: 'Invalid submission.' });
  }

  next();
};
