const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { secret, cookieName, cookieOptions } = require('../config/jwt');

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const admin = rows[0];
    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ adminId: admin.id }, secret, { expiresIn: '1d' });
    res.cookie(cookieName, token, cookieOptions);

    // Update last login + audit log (optional, catch errors so they don't crash)
    try {
      await pool.query('UPDATE admins SET last_login_at = CURRENT_TIMESTAMP, last_login_ip = $1 WHERE id = $2', [req.ip, admin.id]);
      await pool.query('INSERT INTO admin_audit_logs (admin_id, action, ip_address, user_agent) VALUES ($1,$2,$3,$4)', [admin.id, 'LOGIN', req.ip, req.headers['user-agent']]);
    } catch (auditErr) {
      console.error('Audit log error:', auditErr);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.logout = (req, res) => {
  res.clearCookie(cookieName, cookieOptions);
  res.json({ success: true });
};

exports.check = (req, res) => {
  res.json({ adminId: req.adminId });
};
