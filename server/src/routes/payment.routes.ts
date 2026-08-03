import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

const paymentSchema = z.object({
  amount: z.number().positive(),
  paymentDate: z.string().transform((str) => new Date(str)),
  method: z.string().optional(),
  notes: z.string().optional(),
});

// Add payment to a project
router.post('/project/:projectId', validate(paymentSchema), async (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;
  const data = req.body;
  try {
    const payment = await prisma.payment.create({
      data: {
        ...data,
        projectId,
      },
    });
    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ message: 'Failed to add payment' });
  }
});

// Get payments for a project
router.get('/project/:projectId', async (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;
  const payments = await prisma.payment.findMany({
    where: { projectId },
    orderBy: { paymentDate: 'desc' },
  });
  res.json(payments);
});

export default router;
