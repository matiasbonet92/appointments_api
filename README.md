# Appointments API (NestJS + Prisma + Postgres)

API backend for appointment booking (salon / aesthetics / barbershop).
Built to showcase production-style practices: Docker, healthchecks, DTO validation, pagination, and clean module structure.

## Stack
- NestJS
- Prisma
- PostgreSQL
- Docker Compose

## Run with Docker (recommended)
1) Create local env (optional for docker):
- Copy `.env.example` to `.env.local` (do not commit)

2) Start:
- `docker compose up --build`

API: `http://localhost:3000`

## Run local (DB in Docker + API in host)
1) Start DB only:
- `docker compose up -d db`

2) Install deps:
- `npm ci`

3) Apply migrations (first time):
- `npx prisma migrate dev`

4) Run:
- `npm run start:dev`

## Health
- `GET /health` (process is up)
- `GET /ready` (db reachable)

## Main endpoints
### Customers
- `POST /customers`
- `GET /customers?limit&offset&q`
- `GET /customers/:id`

### Services
- `POST /services`
- `GET /services?limit&offset&q&isActive`
- `GET /services/:id`
- `PATCH /services/:id`

### Staff
- `POST /staff`
- `GET /staff?limit&offset&q&isActive`
- `POST /staff/:id/availability`
- `GET /staff/:id/availability`
- `DELETE /staff/:id/availability/:ruleId`

## Notes
This repo is developed with feature branches + PRs to demonstrate a team-ready workflow.
