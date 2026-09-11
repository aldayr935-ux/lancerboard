import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middlewares/auth';

const router = Router();
router.use(requireAuth);

const clientSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional(),
  company: z.string().optional(),
});

// Crear cliente
router.post('/', async (req: AuthRequest, res) => {
  if (!req.userId) return res.status(401).json({ error: 'No autorizado' });

  const parsed = clientSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const client = await prisma.client.create({
    data: { ...parsed.data, userId: req.userId },
  });

  res.status(201).json({ client });
});

// Listar clientes del usuario autenticado
router.get('/', async (req: AuthRequest, res) => {
  if (!req.userId) return res.status(401).json({ error: 'No autorizado' });

  const clients = await prisma.client.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ clients });
});

// Obtener un cliente por id (solo si pertenece al usuario)
router.get('/:id', async (req: AuthRequest, res) => {
  if (!req.userId) return res.status(401).json({ error: 'No autorizado' });

  const { id } = req.params;
  if (typeof id !== 'string') return res.status(400).json({ error: 'Id inválido' });

  const client = await prisma.client.findFirst({
    where: { id, userId: req.userId },
    include: { projects: true },
  });

  if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });

  res.json({ client });
});

// Actualizar cliente
router.put('/:id', async (req: AuthRequest, res) => {
  if (!req.userId) return res.status(401).json({ error: 'No autorizado' });

  const { id } = req.params;
  if (typeof id !== 'string') return res.status(400).json({ error: 'Id inválido' });

  const parsed = clientSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.client.findFirst({
    where: { id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ error: 'Cliente no encontrado' });

  const client = await prisma.client.update({
    where: { id },
    data: parsed.data,
  });

  res.json({ client });
});

// Eliminar cliente
router.delete('/:id', async (req: AuthRequest, res) => {
  if (!req.userId) return res.status(401).json({ error: 'No autorizado' });

  const { id } = req.params;
  if (typeof id !== 'string') return res.status(400).json({ error: 'Id inválido' });

  const existing = await prisma.client.findFirst({
    where: { id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ error: 'Cliente no encontrado' });

  await prisma.client.delete({ where: { id } });

  res.status(204).send();
});

export default router;