import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middlewares/auth';

const router = Router();
router.use(requireAuth);

const invoiceSchema = z.object({
  number: z.string().min(1),
  status: z.enum(['DRAFT', 'SENT', 'PAID']).optional(),
  total: z.number().positive(),
  projectId: z.string(),
});

async function projectBelongsToUser(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, client: { userId } },
  });
  return project;
}

// Crear factura manual
router.post('/', async (req: AuthRequest, res) => {
  if (!req.userId) return res.status(401).json({ error: 'No autorizado' });

  const parsed = invoiceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const project = await projectBelongsToUser(parsed.data.projectId, req.userId);
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

  const invoice = await prisma.invoice.create({ data: parsed.data });

  res.status(201).json({ invoice });
});

// Generar factura automáticamente desde horas no facturadas
router.post('/generate/:projectId', async (req: AuthRequest, res) => {
  if (!req.userId) return res.status(401).json({ error: 'No autorizado' });

  const { projectId } = req.params;
  if (typeof projectId !== 'string') return res.status(400).json({ error: 'Id inválido' });

  const project = await projectBelongsToUser(projectId, req.userId);
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

  const unbilledEntries = await prisma.timeEntry.findMany({
    where: { billed: false, task: { projectId } },
  });

  if (unbilledEntries.length === 0) {
    return res.status(400).json({ error: 'No hay horas pendientes de facturar' });
  }

  const totalHours = unbilledEntries.reduce((sum, entry) => sum + Number(entry.hours), 0);
  const rate = project.hourlyRate ? Number(project.hourlyRate) : 0;
  const total = totalHours * rate;

  const invoice = await prisma.$transaction(async (tx) => {
    const created = await tx.invoice.create({
      data: {
        number: `INV-${Date.now()}`,
        total,
        projectId,
      },
    });

    await tx.timeEntry.updateMany({
      where: { id: { in: unbilledEntries.map((e) => e.id) } },
      data: { billed: true },
    });

    return created;
  });

  res.status(201).json({ invoice, hoursIncluded: totalHours });
});

// Listar facturas del usuario
router.get('/', async (req: AuthRequest, res) => {
  if (!req.userId) return res.status(401).json({ error: 'No autorizado' });

  const invoices = await prisma.invoice.findMany({
    where: { project: { client: { userId: req.userId } } },
    include: { project: true },
    orderBy: { issuedAt: 'desc' },
  });

  res.json({ invoices });
});

// Obtener una factura por id
router.get('/:id', async (req: AuthRequest, res) => {
  if (!req.userId) return res.status(401).json({ error: 'No autorizado' });

  const { id } = req.params;
  if (typeof id !== 'string') return res.status(400).json({ error: 'Id inválido' });

  const invoice = await prisma.invoice.findFirst({
    where: { id, project: { client: { userId: req.userId } } },
    include: { project: true },
  });

  if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });

  res.json({ invoice });
});

// Actualizar estado de factura (ej. marcar como pagada)
router.put('/:id', async (req: AuthRequest, res) => {
  if (!req.userId) return res.status(401).json({ error: 'No autorizado' });

  const { id } = req.params;
  if (typeof id !== 'string') return res.status(400).json({ error: 'Id inválido' });

  const parsed = invoiceSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.invoice.findFirst({
    where: { id, project: { client: { userId: req.userId } } },
  });
  if (!existing) return res.status(404).json({ error: 'Factura no encontrada' });

  const data: typeof parsed.data & { paidAt?: Date } = { ...parsed.data };
  if (parsed.data.status === 'PAID') data.paidAt = new Date();

  const invoice = await prisma.invoice.update({ where: { id }, data });

  res.json({ invoice });
});

// Eliminar factura
router.delete('/:id', async (req: AuthRequest, res) => {
  if (!req.userId) return res.status(401).json({ error: 'No autorizado' });

  const { id } = req.params;
  if (typeof id !== 'string') return res.status(400).json({ error: 'Id inválido' });

  const existing = await prisma.invoice.findFirst({
    where: { id, project: { client: { userId: req.userId } } },
  });
  if (!existing) return res.status(404).json({ error: 'Factura no encontrada' });

  await prisma.invoice.delete({ where: { id } });

  res.status(204).send();
});

export default router;