import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { signAccessToken } from '../lib/jwt';
import { rateLimiter } from '../middleware/rateLimiter';
import { AuthRequest, authenticate } from '../middleware/auth';

const router = Router();

// Login: validate credentials, return access token in response body
router.post('/login', rateLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const accessToken = signAccessToken(user.id, '15m');

    // Send token in response body (no cookie)
    res.json({
      message: 'Authenticated',
      user: { id: user.id, email: user.email },
      accessToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Logout (no-op on server, client just deletes token)
router.post('/logout', (_req, res) => {
  res.json({ message: 'Logged out' });
});

// Return current user
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
