const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { secret, cookieName, cookieOptions } = require('../config/jwt');

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ adminId: rows[0].id }, secret, { expiresIn: '1d' });
    res.cookie(cookieName, token, cookieOptions);
    return res.json({ success: true });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.logout = (req, res) => {
  res.clearCookie(cookieName, cookieOptions);
  res.json({ success: true });
};

exports.check = (req, res) => {
  res.json({ adminId: req.adminId });
};
