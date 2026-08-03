import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export function signAccessToken(userId: string, expiresIn: string | number = '15m'): string {
  const options: jwt.SignOptions = {
    expiresIn: expiresIn as string | number,
  };
  return jwt.sign({ userId }, env.JWT_SECRET, options);
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ userId }, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as { userId: string };
}
