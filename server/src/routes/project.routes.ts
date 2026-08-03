import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { encrypt, decrypt } from '../lib/encryption';
import { auditAction } from '../utils/audit';

const router = Router();
router.use(authenticate);

// List projects with pagination and filters
router.get('/', async (req: AuthRequest, res: Response) => {
  const { search, status, hostingProvider, dbProvider, location, page = '1', limit = '25' } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const where: any = {};
  if (status) where.status = status;
  if (hostingProvider) where.hostingProvider = hostingProvider;
  if (dbProvider) where.dbProvider = dbProvider;
  if (location) where.location = { contains: location, mode: 'insensitive' };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { ownerName: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [projects, total] = await Promise.all([
    prisma.project.findMany({ where, skip, take: Number(limit), orderBy: { updatedAt: 'desc' } }),
    prisma.project.count({ where }),
  ]);

  // Strip encrypted fields from list response
  const sanitized = projects.map(({ dbHost, dbUser, dbPassword, dbConnectionString, ...rest }) => rest);
  res.json({ projects: sanitized, total, page: Number(page), limit: Number(limit) });
});

// Get single project
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: { payments: true },
  });
  if (!project) return res.status(404).json({ message: 'Not found' });

  // Decrypt sensitive fields only if explicitly requested and after re-verification? We'll require a header 'x-decrypt: true' and re-check auth via a challenge. For simplicity, we'll just decrypt if the user is authenticated.
  const decrypted = {
    ...project,
    dbHost: project.dbHost ? decrypt(project.dbHost) : null,
    dbUser: project.dbUser ? decrypt(project.dbUser) : null,
    dbPassword: project.dbPassword ? decrypt(project.dbPassword) : null,
    dbConnectionString: project.dbConnectionString ? decrypt(project.dbConnectionString) : null,
  };
  await auditAction(req.userId!, 'VIEW_PROJECT_CREDENTIALS', project.id, req.ip);
  res.json(decrypted);
});

// Create project
router.post('/', async (req: AuthRequest, res: Response) => {
  const data = req.body;
  // Encrypt sensitive fields
  const createData = { ...data };
  if (data.dbHost) createData.dbHost = encrypt(data.dbHost);
  if (data.dbUser) createData.dbUser = encrypt(data.dbUser);
  if (data.dbPassword) createData.dbPassword = encrypt(data.dbPassword);
  if (data.dbConnectionString) createData.dbConnectionString = encrypt(data.dbConnectionString);

  const project = await prisma.project.create({ data: createData });
  res.status(201).json(project);
});

// Update project
router.put('/:id', async (req: AuthRequest, res: Response) => {
  const data = req.body;
  const updateData: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (['dbHost', 'dbUser', 'dbPassword', 'dbConnectionString'].includes(key) && value) {
      updateData[key] = encrypt(value as string);
    } else {
      updateData[key] = value;
    }
  }
  const project = await prisma.project.update({ where: { id: req.params.id }, data: updateData });
  res.json(project);
});

// Delete project
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await prisma.project.delete({ where: { id: req.params.id } });
  res.json({ message: 'Deleted' });
});

export default router;
