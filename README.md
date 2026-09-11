# LancerBoard

Plataforma fullstack de gestión de proyectos freelance — clientes, proyectos, tareas, tiempo facturable y facturación. Construida como proyecto de portafolio para integrar un stack fullstack moderno junto con testing automatizado (E2E) y prácticas de DevOps (Docker, Kubernetes, CI/CD).

## Stack

- **Frontend:** Next.js (App Router), TypeScript, TailwindCSS v4
- **Backend:** Node.js, Express, TypeScript
- **Base de datos:** PostgreSQL + Prisma ORM
- **Autenticación:** JWT + bcrypt
- **Testing:** Playwright (E2E) — próximamente
- **DevOps:** Docker, Docker Compose, Kubernetes, GitHub Actions — próximamente

## Arquitectura

Monorepo con npm workspaces:

lancerboard/
├── apps/
│ ├── web/ # Frontend Next.js
│ └── api/ # Backend Express + Prisma
├── docker-compose.yml # PostgreSQL para desarrollo local
└── README.md


## Modelo de datos

User (freelancer/admin)
└── Client
└── Project (status: ACTIVE | PAUSED | COMPLETED)
├── Task
│ └── TimeEntry
└── Invoice (status: DRAFT | SENT | PAID)


## Requisitos previos

- Node.js 20+
- Docker Desktop (con WSL2 en Windows)

## Cómo levantarlo localmente

1. Clonar el repositorio
2. Instalar dependencias: `npm install`
3. Levantar PostgreSQL: `docker compose up -d`
4. Configurar variables de entorno en `apps/api/.env`:

DATABASE_URL="postgresql://lancerboard:lancerboard_dev@localhost:5432/lancerboard"
JWT_SECRET=<clave generada>
PORT=4000

5. Aplicar migraciones: `cd apps/api && npx prisma migrate dev`
6. Levantar el backend: `npm run dev -w api`
7. Levantar el frontend: `npm run dev -w web`

## Endpoints implementados

### Auth (`/api/auth`)
| Método | Ruta       | Descripción                  |
|--------|------------|-------------------------------|
| POST   | `/register`| Registro de usuario           |
| POST   | `/login`   | Login, devuelve JWT           |

### Usuarios (`/api/users`)
| Método | Ruta   | Descripción                       | Protegida |
|--------|--------|-----------------------------------|-----------|
| GET    | `/me`  | Datos del usuario autenticado     | ✅        |

### Clientes (`/api/clients`)
| Método | Ruta       | Descripción                          | Protegida |
|--------|------------|---------------------------------------|-----------|
| POST   | `/`        | Crear cliente                         | ✅        |
| GET    | `/`        | Listar clientes del usuario           | ✅        |
| GET    | `/:id`     | Obtener un cliente (con sus proyectos)| ✅        |
| PUT    | `/:id`     | Actualizar cliente                    | ✅        |
| DELETE | `/:id`     | Eliminar cliente                      | ✅        |

### Tareas (`/api/tasks`)
| Método | Ruta   | Descripción                                       | Protegida |
|--------|--------|----------------------------------------------------|-----------|
| POST   | `/`    | Crear tarea (valida que el proyecto sea propio)    | ✅        |
| GET    | `/`    | Listar tareas del usuario                          | ✅        |
| GET    | `/:id` | Obtener una tarea (con sus registros de tiempo)    | ✅        |
| PUT    | `/:id` | Actualizar tarea                                   | ✅        |
| DELETE | `/:id` | Eliminar tarea                                     | ✅        |

### Registro de tiempo (`/api/time-entries`)
| Método | Ruta   | Descripción                                    | Protegida |
|--------|--------|---------------------------------------------------|-----------|
| POST   | `/`    | Registrar horas trabajadas (valida tarea propia)   | ✅        |
| GET    | `/`    | Listar registros de tiempo del usuario             | ✅        |
| GET    | `/:id` | Obtener un registro                                | ✅        |
| PUT    | `/:id` | Actualizar registro                                | ✅        |
| DELETE | `/:id` | Eliminar registro                                  | ✅        |

### Facturas (`/api/invoices`)
| Método | Ruta                    | Descripción                                                  | Protegida |
|--------|-------------------------|----------------------------------------------------------------|-----------|
| POST   | `/`                     | Crear factura manual                                            | ✅        |
| POST   | `/generate/:projectId`  | Genera factura automática sumando horas no facturadas (transacción) | ✅   |
| GET    | `/`                     | Listar facturas del usuario                                     | ✅        |
| GET    | `/:id`                  | Obtener una factura                                              | ✅        |
| PUT    | `/:id`                  | Actualizar factura (marcar como pagada registra `paidAt`)        | ✅        |
| DELETE | `/:id`                  | Eliminar factura                                                 | ✅        |

## Seguridad y diseño de datos

- **Aislamiento por usuario en cascada**: cada entidad valida pertenencia siguiendo la cadena `User → Client → Project → Task → TimeEntry`. Ningún endpoint permite acceder, modificar o referenciar datos de otro usuario, aunque se conozca el `id`.
- **Transacciones de Prisma**: la generación automática de facturas (`POST /api/invoices/generate/:projectId`) usa `$transaction` para garantizar que la creación de la factura y el marcado de horas como facturadas ocurran de forma atómica.
- **Validación con Zod**: todos los endpoints de escritura validan el body antes de tocar la base de datos.

## Roadmap del proyecto

- [x] Fase 1: MVP — Auth (JWT + bcrypt)
- [x] Fase 1: CRUD completo de Client, Project, Task, TimeEntry, Invoice
- [ ] Fase 1: Dashboard en el frontend (Next.js)
- [ ] Fase 2: Testing E2E con Playwright
- [ ] Fase 3: Dockerización completa (web + api + db)
- [ ] Fase 4: CI/CD con GitHub Actions
- [ ] Fase 5: Despliegue con Kubernetes
- [ ] Fase 6: Documentación final y pulido de portafolio

## Decisiones técnicas

- **Monorepo con npm workspaces** en vez de repos separados, para facilitar scripts compartidos y despliegue coordinado.
- **Prisma con `prisma.config.ts`** para la configuración del datasource (versión 6.19+), separando la config de infraestructura del schema de datos.
- **Aislamiento por usuario a nivel de query**: todas las rutas de negocio filtran por el `userId` del token JWT a través de relaciones anidadas de Prisma, no solo por autenticación.