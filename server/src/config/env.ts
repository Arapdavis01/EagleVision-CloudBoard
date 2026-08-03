import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('4000'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string(),
  ENCRYPTION_KEY: z.string().length(64), // 32 bytes hex
  EMAIL_HOST: z.string(),
  EMAIL_PORT: z.string().transform(Number),
  EMAIL_USER: z.string(),
  EMAIL_PASS: z.string(),
  EMAIL_FROM: z.string(),
});

export const env = envSchema.parse(process.env);
