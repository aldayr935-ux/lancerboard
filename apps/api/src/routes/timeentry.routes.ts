import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middlewares/auth';

const router = Router();
router.use(requireAuth);

const timeEntrySchema = z.object({
  hours: z.number().positive(),
  date: z.string().datetime(),
  note: z.string().optional(),
  billed: z.boolean().optional(),
  taskId: z.string(),
});

// Helper: confirma que la tarea pertenece (vía proyecto → cliente) al usuario
async function taskBelongsToUser(taskId: string, userId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { client: { userId } } },
  });
  return !!task;
}

// Crear registro de tiempo
router.post('/', async (req: AuthRequest, res) => {
  if (!req.userId) return res.status(401).json({ error: 'No autorizado' });

  const parsed = timeEntrySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const ownsTask = await taskBelongsToUser(parsed.data.taskId, req.userId);
  if (!ownsTask) return res.status(404).json({ error: 'Tarea no encontrada' });

  const timeEntry = await prisma.timeEntry.create({
    data: { ...parsed.data, date: new Date(parsed.data.date) },
  });

  res.status(201).json({ timeEntry });
});

// Listar registros de tiempo del usuario
router.get('/', async (req: AuthRequest, res) => {
  if (!req.userId) return res.status(401).json({ error: 'No autorizado' });

  const timeEntries = await prisma.timeEntry.findMany({
    where: { task: { project: { client: { userId: req.userId } } } },
    include: { task: true },
    orderBy: { date: 'desc' },
  });

  res.json({ timeEntries });
});

// Obtener un registro por id
router.get('/:id', async (req: AuthRequest, res) => {
  if (!req.userId) return res.status(401).json({ error: 'No autorizado' });

  const { id } = req.params;
  if (typeof id !== 'string') return res.status(400).json({ error: 'Id inválido' });

  const timeEntry = await prisma.timeEntry.findFirst({
    where: { id, task: { project: { client: { userId: req.userId } } } },
    include: { task: true },
  });

  if (!timeEntry) return res.status(404).json({ error: 'Registro no encontrado' });

  res.json({ timeEntry });
});

// Actualizar registro
router.put('/:id', async (req: AuthRequest, res) => {
  if (!req.userId) return res.status(401).json({ error: 'No autorizado' });

  const { id } = req.params;
  if (typeof id !== 'string') return res.status(400).json({ error: 'Id inválido' });

  const parsed = timeEntrySchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.timeEntry.findFirst({
    where: { id, task: { project: { client: { userId: req.userId } } } },
  });
  if (!existing) return res.status(404).json({ error: 'Registro no encontrado' });

  const { date, ...rest } = parsed.data;
  const task = await prisma.timeEntry.update({
    where: { id },
    data: { ...rest, ...(date ? { date: new Date(date) } : {}) },
  });

  res.json({ timeEntry: task });
});

// Eliminar registro
router.delete('/:id', async (req: AuthRequest, res) => {
  if (!req.userId) return res.status(401).json({ error: 'No autorizado' });

  const { id } = req.params;
  if (typeof id !== 'string') return res.status(400).json({ error: 'Id inválido' });

  const existing = await prisma.timeEntry.findFirst({
    where: { id, task: { project: { client: { userId: req.userId } } } },
  });
  if (!existing) return res.status(404).json({ error: 'Registro no encontrado' });

  await prisma.timeEntry.delete({ where: { id } });

  res.status(204).send();
});

export default router;