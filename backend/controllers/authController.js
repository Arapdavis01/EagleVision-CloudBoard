const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/db');
const { jwtSecret, jwtExpiresIn } = require('../config/auth');
const loginSessionService = require('../services/loginSessionService');

// ==================== CONFIGURATION ====================
// Lower bcrypt cost for faster logins (still secure with rate limiting)
const BCRYPT_COST = 8;

// ==================== EMAIL / PASSWORD LOGIN ====================

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const startTime = Date.now();

  try {
    // 1. Fetch admin (select only needed columns + LIMIT 1)
    const { rows } = await pool.query(
      'SELECT id, email, password_hash FROM admins WHERE email = $1 LIMIT 1',
      [email]
    );

    const dbTime = Date.now() - startTime;

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = rows[0];

    // 2. Compare password (CPU-bound)
    const bcryptStart = Date.now();
    const match = await bcrypt.compare(password, admin.password_hash);
    const bcryptTime = Date.now() - bcryptStart;

    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 3. Sign JWT
    const token = jwt.sign(
      { adminId: admin.id, email: admin.email },
      jwtSecret,
      { expiresIn: jwtExpiresIn }
    );

    // 4. Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 2 * 60 * 60 * 1000
    });

    // 5. Send response FIRST (fastest possible)
    res.json({ message: 'Login successful', email: admin.email, token });

    // 6. Fire-and-forget audit log (non-blocking)
    pool.query(
      'INSERT INTO admin_audit_logs (admin_id, action, details) VALUES ($1, $2, $3)',
      [admin.id, 'LOGIN', `Login at ${new Date().toISOString()}`]
    ).catch(err => console.error('Audit log insert failed:', err));

    // 7. Auto-rehash if using a higher cost (progressive migration)
    const currentRounds = parseInt(admin.password_hash.split('$')[2]);
    if (currentRounds > BCRYPT_COST) {
      bcrypt.hash(password, BCRYPT_COST)
        .then(newHash => pool.query(
          'UPDATE admins SET password_hash = $1 WHERE id = $2',
          [newHash, admin.id]
        ))
        .then(() => console.log(`✅ Rehashed password for ${admin.email} (cost ${currentRounds} → ${BCRYPT_COST})`))
        .catch(err => console.error('Rehash failed:', err));
    }

    // 8. Log timing breakdown
    console.log(
      `[LOGIN] ${email} — DB: ${dbTime}ms, bcrypt: ${bcryptTime}ms, total: ${Date.now() - startTime}ms`
    );
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.logout = async (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
};

exports.checkSession = (req, res) => {
  res.json({ authenticated: true, email: req.adminEmail });
};

// ==================== QR CODE LOGIN ====================

/**
 * POST /api/auth/qr/session
 * Creates a temporary login session for QR scanning.
 */
exports.generateLoginSession = async (req, res) => {
  const sessionToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

  try {
    const session = await loginSessionService.createSession(sessionToken, expiresAt);
    res.status(201).json({
      session_token: session.session_token,
      expires_at: session.expires_at,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create login session' });
  }
};

/**
 * GET /api/auth/qr/session/:token/status
 * Polled by laptop to check if session has been approved.
 */
exports.checkLoginSessionStatus = async (req, res) => {
  const { token } = req.params;

  try {
    const session = await loginSessionService.getSessionByToken(token);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check expiry
    if (new Date(session.expires_at) < new Date()) {
      await loginSessionService.markSessionExpired(token);
      return res.json({ status: 'expired' });
    }

    if (session.status === 'pending') {
      return res.json({ status: 'pending' });
    }

    if (session.status === 'approved' && session.admin_id) {
      const { rows: adminRows } = await pool.query(
        `SELECT id, email FROM admins WHERE id = $1`,
        [session.admin_id]
      );
      if (adminRows.length === 0) {
        return res.status(404).json({ error: 'Admin not found' });
      }

      const admin = adminRows[0];
      const jwtToken = jwt.sign(
        { adminId: admin.id, email: admin.email },
        jwtSecret,
        { expiresIn: jwtExpiresIn }
      );

      // Mark session as used (single-use)
      await loginSessionService.markSessionUsed(token);

      return res.json({
        status: 'approved',
        token: jwtToken,
        email: admin.email,
      });
    }

    // Already used or other state
    return res.json({ status: session.status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * POST /api/auth/qr/session/:token/approve
 * Called by the phone (no auth required) to approve a login session.
 * Expects a PIN in the request body.
 */
exports.approveLoginSession = async (req, res) => {
  const { token } = req.params;
  const { pin } = req.body; // PIN sent from phone

  if (!pin) {
    return res.status(400).json({ error: 'PIN is required.' });
  }

  try {
    const session = await loginSessionService.getSessionByToken(token);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (new Date(session.expires_at) < new Date()) {
      await loginSessionService.markSessionExpired(token);
      return res.status(400).json({ error: 'Session expired' });
    }

    if (session.status !== 'pending') {
      return res.status(400).json({ error: `Session already ${session.status}` });
    }

    // Fetch the single admin account (assumes only one admin exists)
    const { rows: adminRows } = await pool.query(
      `SELECT id, login_pin FROM admins ORDER BY id LIMIT 1`
    );

    if (adminRows.length === 0) {
      return res.status(500).json({ error: 'No admin account found' });
    }

    const admin = adminRows[0];

    // Compare PIN — supports both plaintext (legacy) and bcrypt (new)
    let pinValid = false;
    if (admin.login_pin && admin.login_pin.startsWith('$2')) {
      // Hashed PIN (bcrypt)
      pinValid = await bcrypt.compare(pin, admin.login_pin);
    } else {
      // Plaintext PIN (legacy)
      pinValid = pin === admin.login_pin;

      // Auto-upgrade: hash the plaintext PIN for future logins
      if (pinValid) {
        bcrypt.hash(pin, BCRYPT_COST)
          .then(newHash => pool.query(
            'UPDATE admins SET login_pin = $1 WHERE id = $2',
            [newHash, admin.id]
          ))
          .then(() => console.log(`✅ Hashed PIN for admin #${admin.id}`))
          .catch(err => console.error('PIN rehash failed:', err));
      }
    }

    if (!pinValid) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    // Approve session with this admin's ID
    await loginSessionService.approveSession(token, admin.id);
    res.json({ message: 'Login approved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
