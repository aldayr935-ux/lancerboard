import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middlewares/auth';

const router = Router();
router.use(requireAuth);

const projectSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED']).optional(),
  hourlyRate: z.number().positive().optional(),
  clientId: z.string(),
});

// Helper: confirma que el cliente pertenece al usuario autenticado
async function clientBelongsToUser(clientId: string, userId: string) {
  const client = await prisma.client.findFirst({ where: { id: clientId, userId } });
  return !!client;
}

// Crear proyecto
router.post('/', async (req: AuthRequest, res) => {
  if (!req.userId) return res.status(401).json({ error: 'No autorizado' });

  const parsed = projectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const ownsClient = await clientBelongsToUser(parsed.data.clientId, req.userId);
  if (!ownsClient) return res.status(404).json({ error: 'Cliente no encontrado' });

  const project = await prisma.project.create({ data: parsed.data });

  res.status(201).json({ project });
});

// Listar proyectos del usuario (a través de sus clientes)
router.get('/', async (req: AuthRequest, res) => {
  if (!req.userId) return res.status(401).json({ error: 'No autorizado' });

  const projects = await prisma.project.findMany({
    where: { client: { userId: req.userId } },
    include: { client: true },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ projects });
});

// Obtener un proyecto por id
router.get('/:id', async (req: AuthRequest, res) => {
  if (!req.userId) return res.status(401).json({ error: 'No autorizado' });

  const { id } = req.params;
  if (typeof id !== 'string') return res.status(400).json({ error: 'Id inválido' });

  const project = await prisma.project.findFirst({
    where: { id, client: { userId: req.userId } },
    include: { client: true, tasks: {include: { timeEntries : true  }}},
  });

  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

  res.json({ project });
});

// Actualizar proyecto
router.put('/:id', async (req: AuthRequest, res) => {
  if (!req.userId) return res.status(401).json({ error: 'No autorizado' });

  const { id } = req.params;
  if (typeof id !== 'string') return res.status(400).json({ error: 'Id inválido' });

  const parsed = projectSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.project.findFirst({
    where: { id, client: { userId: req.userId } },
  });
  if (!existing) return res.status(404).json({ error: 'Proyecto no encontrado' });

  const project = await prisma.project.update({
    where: { id },
    data: parsed.data,
  });

  res.json({ project });
});

// Eliminar proyecto
router.delete('/:id', async (req: AuthRequest, res) => {
  if (!req.userId) return res.status(401).json({ error: 'No autorizado' });

  const { id } = req.params;
  if (typeof id !== 'string') return res.status(400).json({ error: 'Id inválido' });

  const existing = await prisma.project.findFirst({
    where: { id, client: { userId: req.userId } },
  });
  if (!existing) return res.status(404).json({ error: 'Proyecto no encontrado' });

  await prisma.project.delete({ where: { id } });

  res.status(204).send();
});

export default router;