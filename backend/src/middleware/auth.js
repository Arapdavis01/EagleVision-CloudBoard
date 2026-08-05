const jwt = require('jsonwebtoken');
const { secret, cookieName } = require('../config/jwt');

module.exports = (req, res, next) => {
  const token = req.cookies[cookieName];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const decoded = jwt.verify(token, secret);
    req.adminId = decoded.adminId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
