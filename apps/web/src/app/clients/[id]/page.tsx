'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import type { ClientWithProjects, Project } from '@/types';

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, token, loading } = useAuth();
  const router = useRouter();

  const [client, setClient] = useState<ClientWithProjects | null>(null);
  const [clientLoading, setClientLoading] = useState(true);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (!token) return;

    apiFetch<{ client: ClientWithProjects }>(`/clients/${id}`, {}, token)
      .then((data) => setClient(data.client))
      .catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar cliente'))
      .finally(() => setClientLoading(false));
  }, [token, id]);

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !client) return;

    setCreating(true);
    setError('');

    try {
      const data = await apiFetch<{ project: Project }>(
        '/projects',
        {
          method: 'POST',
          body: JSON.stringify({
            name,
            clientId: client.id,
            hourlyRate: hourlyRate ? Number(hourlyRate) : undefined,
          }),
        },
        token
      );

      setClient((prev) => prev ? { ...prev, projects: [data.project, ...prev.projects] } : prev);
      setName('');
      setHourlyRate('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear proyecto');
    } finally {
      setCreating(false);
    }
  }

  if (loading || !user || clientLoading) return null;
  if (error && !client) return <p className="p-8 text-red-600">{error}</p>;
  if (!client) return null;

  const statusLabel: Record<Project['status'], string> = {
    ACTIVE: 'Activo',
    PAUSED: 'Pausado',
    COMPLETED: 'Completado',
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
          ← Volver al dashboard
        </Link>

        <h1 className="mt-2 text-2xl font-bold text-gray-900">{client.name}</h1>
        {client.company && <p className="text-gray-500">{client.company}</p>}
        {client.email && <p className="text-gray-500">{client.email}</p>}

        {error && (
          <p className="mt-4 rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>
        )}

        <form
          onSubmit={handleCreateProject}
          className="mt-6 space-y-3 rounded-lg bg-white p-6 shadow"
        >
          <h2 className="text-lg font-semibold text-gray-900">Nuevo proyecto</h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="projectName" className="sr-only">Nombre del proyecto</label>
              <input
                id="projectName"
                type="text"
                placeholder="Nombre del proyecto"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="hourlyRate" className="sr-only">Tarifa por hora</label>
              <input
                id="hourlyRate"
                type="number"
                min="0"
                step="0.01"
                placeholder="Tarifa por hora (opcional)"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={creating}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? 'Creando...' : 'Agregar proyecto'}
          </button>
        </form>

        <div className="mt-6 rounded-lg bg-white shadow">
          <h2 className="border-b border-gray-100 p-4 text-lg font-semibold text-gray-900">
            Proyectos
          </h2>

          {client.projects.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">Aún no hay proyectos para este cliente.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {client.projects.map((project) => (
                <li key={project.id} className="p-4">
                  <Link href={`/projects/${project.id}`} className="block hover:opacity-75">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900">{project.name}</p>
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                        {statusLabel[project.status]}
                      </span>
                    </div>
                    {project.hourlyRate && (
                      <p className="text-sm text-gray-500">${project.hourlyRate}/hora</p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}