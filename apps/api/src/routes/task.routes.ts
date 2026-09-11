import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

const taskSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  done: z.boolean().optional(),
  projectId: z.string(),
});

// Helper: confirma que el proyecto pertenece (via cliente) al usuario autenticado
async function projectBelongsToUser(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, client: { userId } },
  });
  return !!project;
}

// Crear tarea
router.post("/", async (req: AuthRequest, res) => {
  if (!req.userId) return res.status(401).json({ error: "No autorizado" });

  const parsed = taskSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });

  const ownsProject = await projectBelongsToUser(
    parsed.data.projectId,
    req.userId,
  );
  if (!ownsProject)
    return res.status(404).json({ error: "Proyecto no encontrado" });

  const task = await prisma.task.create({ data: parsed.data });

  res.status(201).json({ task });
});

// Listar tareas del usuario (a través de proyecto → cliente)
router.get("/", async (req: AuthRequest, res) => {
  if (!req.userId) return res.status(401).json({ error: "No autorizado" });

  const tasks = await prisma.task.findMany({
    where: { project: { client: { userId: req.userId } } },
    include: { project: true },
    orderBy: { createdAt: "desc" },
  });

  res.json({ tasks });
});

// Obtener una tarea por id
router.get("/:id", async (req: AuthRequest, res) => {
  if (!req.userId) return res.status(401).json({ error: "No autorizado" });

  const { id } = req.params;
  if (typeof id !== "string")
    return res.status(400).json({ error: "Id inválido" });

  const task = await prisma.task.findFirst({
    where: { id, project: { client: { userId: req.userId } } },
    include: { project: true, timeEntries: true },
  });

  if (!task) return res.status(404).json({ error: "Tarea no encontrada" });

  res.json({ task });
});

// Actualizar tarea
router.put("/:id", async (req: AuthRequest, res) => {
  if (!req.userId) return res.status(401).json({ error: "No autorizado" });

  const { id } = req.params;
  if (typeof id !== "string")
    return res.status(400).json({ error: "Id inválido" });

  const parsed = taskSchema.partial().safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.task.findFirst({
    where: { id, project: { client: { userId: req.userId } } },
  });
  if (!existing) return res.status(404).json({ error: "Tarea no encontrada" });

  const task = await prisma.task.update({
    where: { id },
    data: parsed.data,
  });

  res.json({ task });
});

// Eliminar tarea
router.delete("/:id", async (req: AuthRequest, res) => {
  if (!req.userId) return res.status(401).json({ error: "No autorizado" });

  const { id } = req.params;
  if (typeof id !== "string")
    return res.status(400).json({ error: "Id inválido" });

  const existing = await prisma.task.findFirst({
    where: { id, project: { client: { userId: req.userId } } },
  });
  if (!existing) return res.status(404).json({ error: "Tarea no encontrada" });

  await prisma.task.delete({ where: { id } });

  res.status(204).send();
});

export default router;
