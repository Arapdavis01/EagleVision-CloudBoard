import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { signAccessToken, verifyAccessToken } from '../lib/jwt';
import { send2FACode } from '../lib/email';
import { rateLimiter } from '../middleware/rateLimiter';
import { AuthRequest, authenticate } from '../middleware/auth';

const router = Router();

// Login: check email/password, send code
router.post('/login', rateLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate 6-digit code
    const code = crypto.randomInt(100000, 999999).toString();

    // Store the code in the database (expires in 10 minutes)
    await prisma.twoFactorCode.create({
      data: {
        userId: user.id,
        code,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    // Try to send the email – if it fails, we still return a response
    try {
      await send2FACode(email, code);
    } catch (emailError) {
      console.error('Failed to send 2FA email:', emailError);
      // Do NOT crash the server; inform the user that email may be delayed
      return res.status(500).json({ message: 'Failed to send verification email. Please try again later.' });
    }

    // Issue a temporary token for the verification step (5 minutes)
    const tempToken = signAccessToken(user.id, '5m');

    res.json({ tempToken, message: 'Code sent to your email' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Verify 2FA code and issue final tokens
router.post('/verify', async (req: AuthRequest, res: Response) => {
  try {
    const { tempToken, code } = req.body;

    let payload: { userId: string };
    try {
      payload = verifyAccessToken(tempToken) as { userId: string };
    } catch {
      return res.status(401).json({ message: 'Invalid or expired temporary token' });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const validCode = await prisma.twoFactorCode.findFirst({
      where: {
        userId: user.id,
        code,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!validCode) {
      return res.status(401).json({ message: 'Invalid or expired code' });
    }

    // Mark code as used
    await prisma.twoFactorCode.update({ where: { id: validCode.id }, data: { used: true } });

    // Issue final access token (15 minutes) and set as httpOnly cookie
    const accessToken = signAccessToken(user.id, '15m');
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
    });

    res.json({ message: 'Authenticated', user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/logout', (_req, res) => {
  res.clearCookie('accessToken');
  res.json({ message: 'Logged out' });
});

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
