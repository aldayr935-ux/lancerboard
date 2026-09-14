'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import type { ProjectWithTasks, Task, Invoice } from '@/types';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, token, loading } = useAuth();
  const router = useRouter();

  const [project, setProject] = useState<ProjectWithTasks | null>(null);
  const [projectLoading, setProjectLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [hoursInputs, setHoursInputs] = useState<Record<string, string>>({});
  const [dateInputs, setDateInputs] = useState<Record<string, string>>({});
  const [loggingTaskId, setLoggingTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (!token) return;

    apiFetch<{ project: ProjectWithTasks }>(`/projects/${id}`, {}, token)
      .then((data) => setProject(data.project))
      .catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar proyecto'))
      .finally(() => setProjectLoading(false));
  }, [token, id]);

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !project) return;

    setCreating(true);
    setError('');

    try {
      const data = await apiFetch<{ task: Task }>(
        '/tasks',
        {
          method: 'POST',
          body: JSON.stringify({ title, projectId: project.id }),
        },
        token
      );

      setProject((prev) => prev ? { ...prev, tasks: [data.task, ...prev.tasks] } : prev);
      setTitle('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear tarea');
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleTask(task: Task) {
    if (!token) return;

    try {
      const data = await apiFetch<{ task: Task }>(
        `/tasks/${task.id}`,
        {
          method: 'PUT',
          body: JSON.stringify({ done: !task.done }),
        },
        token
      );

      setProject((prev) =>
        prev
          ? {
            ...prev,
            tasks: prev.tasks.map((t) =>
              t.id === task.id ? { ...t, done: data.task.done } : t
            ),
          }
          : prev
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar tarea');
    }
  }

  async function handleGenerateInvoice() {
    if (!token || !project) return;

    setGenerating(true);
    setError('');
    setMessage('');

    try {
      const data = await apiFetch<{ invoice: Invoice; hoursIncluded: number }>(
        `/invoices/generate/${project.id}`,
        { method: 'POST' },
        token
      );

      setMessage(
        `Factura ${data.invoice.number} generada con ${data.hoursIncluded} horas — total: $${data.invoice.total}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar factura');
    } finally {
      setGenerating(false);
    }
  }

  async function handleLogTime(taskId: string) {
    if (!token) return;

    const hoursValue = hoursInputs[taskId];
    if (!hoursValue || Number(hoursValue) <= 0) return;

    const dateValue = dateInputs[taskId];
    const isoDate = dateValue ? new Date(dateValue).toISOString() : new Date().toISOString();

    setLoggingTaskId(taskId);
    setError('');

    try {
      await apiFetch(
        '/time-entries',
        {
          method: 'POST',
          body: JSON.stringify({
            hours: Number(hoursValue),
            date: isoDate,
            taskId,
          }),
        },
        token
      );

      setMessage(`Se registraron ${hoursValue} horas correctamente`);
      setHoursInputs((prev) => ({ ...prev, [taskId]: '' }));
      setDateInputs((prev) => ({ ...prev, [taskId]: '' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar horas');
    } finally {
      setLoggingTaskId(null);
    }
  }

  if (loading || !user || projectLoading) return null;
  if (error && !project) return <p className="p-8 text-red-600">{error}</p>;
  if (!project) return null;

  const totalHours = project.tasks.reduce(
    (sum, task) => sum + task.timeEntries.reduce((s, e) => s + Number(e.hours), 0),
    0
  );
  const totalUnbilled = project.tasks.reduce(
    (sum, task) =>
      sum + task.timeEntries.filter((e) => !e.billed).reduce((s, e) => s + Number(e.hours), 0),
    0
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-3xl">
        <Link href={`/clients/${project.client.id}`} className="text-sm text-blue-600 hover:underline">
          ← Volver a {project.client.name}
        </Link>

        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <button
            onClick={handleGenerateInvoice}
            disabled={generating}
            className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {generating ? 'Generando...' : 'Generar factura'}
          </button>
        </div>

        {project.hourlyRate && (
          <p className="text-gray-500">${project.hourlyRate}/hora</p>
        )}

        <p className="text-sm text-gray-500">
          Total: {totalHours}h — Sin facturar: {totalUnbilled}h
        </p>

        {message && (
          <p className="mt-4 rounded bg-green-50 p-2 text-sm text-green-700">{message}</p>
        )}
        {error && (
          <p className="mt-4 rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>
        )}


        <form
          onSubmit={handleCreateTask}
          className="mt-6 flex gap-3 rounded-lg bg-white p-6 shadow"
        >
          <div className="flex-1">
            <label htmlFor="taskTitle" className="sr-only">Título de la tarea</label>
            <input
              id="taskTitle"
              type="text"
              placeholder="Nueva tarea"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? 'Creando...' : 'Agregar'}
          </button>
        </form>

        <div className="mt-6 rounded-lg bg-white shadow">
          <h2 className="border-b border-gray-100 p-4 text-lg font-semibold text-gray-900">
            Tareas
          </h2>

          {project.tasks.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">Aún no hay tareas en este proyecto.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {project.tasks.map((task) => (
                <li key={task.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={() => handleToggleTask(task)}
                      className="h-4 w-4"
                    />
                    <span className={task.done ? 'text-gray-400 line-through' : 'text-gray-900'}>
                      {task.title}
                    </span>
                    <span className="ml-auto text-xs text-gray-400">
                      {task.timeEntries.reduce((sum, entry) => sum + Number(entry.hours), 0)}h registradas
                    </span>
                  </div>

                  <div className="mt-2 ml-7 flex flex-wrap items-center gap-2">
                    <label htmlFor={`hours-${task.id}`} className="sr-only">Horas trabajadas</label>
                    <input
                      id={`hours-${task.id}`}
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="Horas"
                      value={hoursInputs[task.id] || ''}
                      onChange={(e) => setHoursInputs((prev) => ({ ...prev, [task.id]: e.target.value }))}
                      className="w-24 rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                    />

                    <label htmlFor={`date-${task.id}`} className="sr-only">Fecha y hora</label>
                    <input
                      id={`date-${task.id}`}
                      type="datetime-local"
                      value={dateInputs[task.id] || ''}
                      onChange={(e) => setDateInputs((prev) => ({ ...prev, [task.id]: e.target.value }))}
                      className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                    />

                    <button
                      onClick={() => handleLogTime(task.id)}
                      disabled={loggingTaskId === task.id}
                      className="rounded bg-gray-700 px-3 py-1 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                    >
                      {loggingTaskId === task.id ? 'Guardando...' : 'Registrar tiempo'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}