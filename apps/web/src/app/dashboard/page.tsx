'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import type { Client } from '@/types';

export default function DashboardPage() {
  const { user, token, logout, loading } = useAuth();
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!token) return;

    apiFetch<{ clients: Client[] }>('/clients', {}, token)
      .then((data) => setClients(data.clients))
      .catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar clientes'))
      .finally(() => setClientsLoading(false));
  }, [token]);

  async function handleCreateClient(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    setCreating(true);
    setError('');

    try {
      const data = await apiFetch<{ client: Client }>(
        '/clients',
        {
          method: 'POST',
          body: JSON.stringify({
            name,
            email: email || undefined,
            company: company || undefined,
          }),
        },
        token
      );

      setClients((prev) => [data.client, ...prev]);
      setName('');
      setEmail('');
      setCompany('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear cliente');
    } finally {
      setCreating(false);
    }
  }

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Hola, {user.name}</h1>
          <button
            onClick={() => {
              logout();
              router.push('/login');
            }}
            className="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300"
          >
            Cerrar sesión
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>
        )}

        <form
          onSubmit={handleCreateClient}
          className="mt-6 space-y-3 rounded-lg bg-white p-6 shadow"
        >
          <h2 className="text-lg font-semibold text-gray-900">Nuevo cliente</h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              type="text"
              placeholder="Nombre"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
            <input
              type="email"
              placeholder="Correo (opcional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Empresa (opcional)"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={creating}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? 'Creando...' : 'Agregar cliente'}
          </button>
        </form>

        <div className="mt-6 rounded-lg bg-white shadow">
          <h2 className="border-b border-gray-100 p-4 text-lg font-semibold text-gray-900">
            Clientes
          </h2>

          {clientsLoading ? (
            <p className="p-4 text-sm text-gray-500">Cargando...</p>
          ) : clients.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">Aún no tienes clientes.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {clients.map((client) => (
                <li key={client.id} className="p-4">
                  <p className="font-medium text-gray-900">{client.name}</p>
                  {client.company && (
                    <p className="text-sm text-gray-500">{client.company}</p>
                  )}
                  {client.email && (
                    <p className="text-sm text-gray-500">{client.email}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}