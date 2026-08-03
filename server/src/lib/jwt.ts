import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export function signAccessToken(userId: string) {
  return jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: '15m' });
}

export function signRefreshToken(userId: string) {
  return jwt.sign({ userId }, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as { userId: string };
}
