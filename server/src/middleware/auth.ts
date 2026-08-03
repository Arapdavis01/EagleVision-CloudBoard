import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt';

export interface AuthRequest extends Request {
  userId?: string;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyAccessToken(token) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ message: 'Token invalid or expired' });
  }
}
