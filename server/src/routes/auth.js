const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db');

const router = express.Router();

// Simple in‑memory token (single user)
let currentToken = null;

// Login – returns token
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    // Generate simple token (in production use JWT – but this works for single user)
    currentToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    res.json({ token: currentToken, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout – invalidate token
router.post('/logout', (req, res) => {
  currentToken = null;
  res.json({ message: 'Logged out' });
});

// Middleware to protect routes
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${currentToken}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Get current user
router.get('/me', authenticate, async (req, res) => {
  // In a real multi‑user system you’d decode the token, but we only have one user
  const result = await pool.query('SELECT id, email FROM "User" LIMIT 1');
  if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
  res.json(result.rows[0]);
});

module.exports = { router, authenticate };
