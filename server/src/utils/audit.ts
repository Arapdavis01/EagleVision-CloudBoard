import { prisma } from '../lib/prisma';

export async function auditAction(userId: string, action: string, projectId?: string | null, ip?: string) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        projectId: projectId || null,
        ip: ip || null,
      },
    });
  } catch (error) {
    console.error('Audit log failed:', error);
  }
}
