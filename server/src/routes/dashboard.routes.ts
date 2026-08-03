import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/stats', async (_req: AuthRequest, res: Response) => {
  try {
    const totalProjects = await prisma.project.count();
    const activeProjects = await prisma.project.count({ where: { status: 'active' } });
    const maintenanceProjects = await prisma.project.count({ where: { status: 'maintenance' } });
    const completedProjects = await prisma.project.count({ where: { status: 'completed' } });
    const onHoldProjects = await prisma.project.count({ where: { status: 'on-hold' } });

    const paymentAgg = await prisma.payment.aggregate({
      _sum: { amount: true },
    });
    const totalPaid = paymentAgg._sum.amount || 0;

    // Projects per hosting provider
    const hosting = await prisma.project.groupBy({
      by: ['hostingProvider'],
      _count: true,
      where: { hostingProvider: { not: null } },
    });

    // Projects per database provider
    const dbProvider = await prisma.project.groupBy({
      by: ['dbProvider'],
      _count: true,
      where: { dbProvider: { not: null } },
    });

    // Recent projects
    const recentProjects = await prisma.project.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, status: true, createdAt: true },
    });

    res.json({
      totalProjects,
      activeProjects,
      maintenanceProjects,
      completedProjects,
      onHoldProjects,
      totalPaid,
      hosting,
      dbProvider,
      recentProjects,
    });
  } catch (error) {
    res.status(500).json({ message: 'Dashboard stats failed' });
  }
});

export default router;
