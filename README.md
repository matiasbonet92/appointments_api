# appointments_api — Turnos MVP (NestJS + Prisma + PostgreSQL + Docker)

API backend para manejar turnos (estética/peluquería/etc): clientes, servicios, profesionales, reglas de disponibilidad, generación de slots y creación/reprogramación/cancelación de turnos con validación de solapamientos.

> Stack: **NestJS (TypeScript)** + **Prisma** + **PostgreSQL** + **Docker Compose**.

---

## Tabla de contenidos
- [Features](#features)
- [Arquitectura](#arquitectura)
- [Modelos de dominio](#modelos-de-dominio)
- [Requisitos](#requisitos)
- [Configuración de entornos](#configuración-de-entornos)
- [Correr el proyecto](#correr-el-proyecto)
  - [Opción A: Full Docker (API + DB)](#opción-a-full-docker-api--db)
  - [Opción B: DB en Docker + API local](#opción-b-db-en-docker--api-local)
- [Migraciones Prisma](#migraciones-prisma)
- [Healthchecks](#healthchecks)
- [Endpoints](#endpoints)
- [Ejemplos (curl)](#ejemplos-curl)

---

## Features
- CRUD básico:
  - Customers (clientes)
  - Services (servicios: duración, precio, activo)
  - Staff (profesionales)
  - Availability Rules (reglas de disponibilidad por día de semana y rango horario)
- Scheduling:
  - Generación de slots disponibles: `GET /staff/:id/slots`
  - Creación de turnos con validación:
    - existe customer/staff/service
    - turno dentro de disponibilidad
    - anti-solapamiento (409 Conflict)
- Lifecycle:
  - Cancelación (soft cancel) con `status = CANCELLED` + `cancelledAt`
  - Reprogramación (reschedule) recalculando `endAt` y revalidando reglas
- Health endpoints:
  - `GET /health` (app viva)
  - `GET /ready` (app + DB reachable)

---

## Arquitectura
Estructura típica NestJS:
- **Controller**: define rutas HTTP, parsea `@Body()`, `@Query()`, `@Param()`
- **Service**: lógica de negocio (validaciones, composición de queries, reglas)
- **Module**: agrupa controller + service y sus dependencias
- **PrismaService**: cliente Prisma centralizado, inyectable por DI

La API sigue un patrón **thin controller / fat service**: los controllers son finitos, la lógica vive en services.

---

## Modelos de dominio
Conceptos principales:
- **Customer**: persona que agenda (cliente)
- **Service**: servicio que se presta (duración en minutos, precio, activo)
- **StaffMember**: profesional (activo)
- **AvailabilityRule**: disponibilidad semanal del staff (día de semana + rango en minutos)
- **Appointment**: turno reservado con `startAt`, `endAt`, `status`

---

## Requisitos
- Node.js (LTS recomendado)
- Docker + Docker Compose
- Git

---

## Configuración de entornos
Este repo usa **3 archivos**:
- `.env.example` → ejemplo **comiteado** (sin secretos)
- `.env.local` → tu configuración local (NO comitear)
- `.env.docker` → usado por docker compose (NO comitear si tiene secretos)

### `.env.example` (ejemplo)
```env
PORT=3000
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/DB
PRISMA_ENV=local
```
### `.env.local` (ejemplo)
```env
PORT=3000
DATABASE_URL=postgresql://app:app@127.0.0.1:5432/app
PRISMA_ENV=local
```
### `.env.docker` (ejemplo)
```env
PORT=3000
DATABASE_URL=postgresql://app:app@db:5432/app
PRISMA_ENV=docker
```

---

## Correr el proyecto
## Opción A: Full Docker (API + DB)
Levanta todo para cualquiera que clone el repo.
docker compose up --build

La API queda en:
http://localhost:3000

Validación rápida:
GET /health
GET /ready

Detener:
docker compose down

---

## Opción B: DB en Docker + API local
Útil para desarrollo (hot reload, debugging).

Levantar solo DB:
docker compose up -d db

Instalar deps:
npm ci
Crear .env.local (a partir de .env.example) y apuntar a 127.0.0.1:5432

---

## Migrar DB:
npx prisma migrate dev

Correr API:
npm run start:dev
Migraciones Prisma

Crear una migración:
npx prisma migrate dev --name <nombre>

Generar cliente Prisma:
npx prisma generate

Reset DB (destructivo):
npx prisma migrate reset

## Healthchecks
GET /health → indica que la app está levantada (no chequea DB)
GET /ready → chequea conectividad a DB (ej: SELECT 1)

Esto sirve para Docker y orquestadores: un container puede estar “vivo” pero no “listo”.

---

## Endpoints
Nota: los nombres pueden variar según tu implementación final. Ajustá si renombraste módulos.

Customers:
POST /customers
GET /customers?limit=&offset=&q=
GET /customers/:id
PATCH /customers/:id
DELETE /customers/:id (si aplica)

Services:
POST /services
GET /services?limit=&offset=&q=&isActive=
GET /services/:id
PATCH /services/:id

Staff:
POST /staff
GET /staff?limit=&offset=&q=&isActive=
GET /staff/:id
PATCH /staff/:id

Availability Rules:
POST /staff/:id/availability
GET /staff/:id/availability
DELETE /staff/:id/availability/:ruleId (si aplica)

Slots:
GET /staff/:id/slots?date=YYYY-MM-DD&serviceId=<uuid>&stepMin=15
Devuelve slots disponibles (start/end) para ese día, con duración según el service.

Appointments:
POST /appointments
GET /appointments?staffId=<uuid>&from=<iso>&to=<iso>&limit=&offset=
PATCH /appointments/:id/cancel
PATCH /appointments/:id/reschedule

---

## Ejemplos (curl)
Reemplazá <customerId>, <serviceId>, <staffId>, <appointmentId>.

Health:
```
curl http://localhost:3000/health
curl http://localhost:3000/ready
```

Crear customer:
```
curl -X POST http://localhost:3000/customers \
  -H 'Content-Type: application/json' \
  -d '{"fullName":"Juan Perez","phone":"+54 11 5555-5555","email":"juan@test.com"}'
```

Crear service:
```
curl -X POST http://localhost:3000/services \
  -H 'Content-Type: application/json' \
  -d '{"name":"Corte","durationMin":30,"priceCents":8000}'
```

Crear staff:
```
curl -X POST http://localhost:3000/staff \
  -H 'Content-Type: application/json' \
  -d '{"fullName":"Sofi","isActive":true}'
```

Set availability (Lunes 09:00–18:00):
Minutos del día:
09:00 → 540
18:00 → 1080
```
curl -X POST http://localhost:3000/staff/<staffId>/availability \
  -H 'Content-Type: application/json' \
  -d '{"dayOfWeek":1,"startMin":540,"endMin":1080}'
```

Slots del día:
```
curl 'http://localhost:3000/staff/<staffId>/slots?date=2026-02-01&serviceId=<serviceId>&stepMin=15'
```

Crear appointment:
```
curl -X POST http://localhost:3000/appointments \
  -H 'Content-Type: application/json' \
  -d '{
    "customerId":"<customerId>",
    "staffId":"<staffId>",
    "serviceId":"<serviceId>",
    "startAt":"2026-02-01T13:30:00.000Z",
    "notes":"Cliente nuevo"
  }'
```

Cancelar appointment:
```
curl -X PATCH http://localhost:3000/appointments/<appointmentId>/cancel \
  -H 'Content-Type: application/json' \
  -d '{"reason":"Cliente canceló"}'
```

Reprogramar appointment:
```
curl -X PATCH http://localhost:3000/appointments/<appointmentId>/reschedule \
  -H 'Content-Type: application/json' \
  -d '{"startAt":"2026-02-01T15:00:00.000Z"}'
```

