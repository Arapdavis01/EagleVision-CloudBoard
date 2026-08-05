const jwt = require('jsonwebtoken');
const { secret, cookieName, cookieOptions } = require('../config/jwt');

// Temporary admin – no database required
const TEMP_ADMIN = {
  email: 'dancun6742@gmail.com',
  password: '000000',
  id: 1
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  // Check against hardcoded credentials
  if (email === TEMP_ADMIN.email && password === TEMP_ADMIN.password) {
    const token = jwt.sign({ adminId: TEMP_ADMIN.id }, secret, { expiresIn: '1d' });
    res.cookie(cookieName, token, cookieOptions);
    return res.json({ success: true });
  }

  return res.status(401).json({ error: 'Invalid credentials' });
};

exports.logout = (req, res) => {
  res.clearCookie(cookieName, cookieOptions);
  res.json({ success: true });
};

exports.check = (req, res) => {
  res.json({ adminId: req.adminId });
};
