import nodemailer from 'nodemailer';
import { env } from '../config/env';

export const transporter = nodemailer.createTransport({
  host: env.EMAIL_HOST,
  port: env.EMAIL_PORT,
  secure: false,
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASS,
  },
});

export async function send2FACode(email: string, code: string) {
  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: email,
    subject: 'EagleVision CloudBoard - Verification Code',
    text: `Your verification code is: ${code}\nIt expires in 10 minutes.`,
    html: `<p>Your verification code is: <strong>${code}</strong></p><p>It expires in 10 minutes.</p>`,
  });
}
