# MuktPay Backend

NestJS + TypeORM + PostgreSQL API for MuktPay. Base path: `/api`.

## Run locally

```bash
# from the repository root: start PostgreSQL
docker compose up -d

# from muktpay-backend/
cp .env.example .env
npm install
npm run start:dev
```

The API applies pending migrations when it starts (`DB_MIGRATIONS_RUN=true`).
Health check: `GET http://localhost:4000/api/health`

## Scripts

| Command | What it does |
|---|---|
| `npm run start:dev` | Start with auto-reload |
| `npm run build` / `npm run start:prod` | Compile and run the compiled app |
| `npm test` | Unit tests (includes a check that every entity has a migration) |
| `npm run test:e2e` | End-to-end tests (needs PostgreSQL running) |
| `npm run migration:run` / `migration:revert` / `migration:show` | Manage migrations |
| `npm run migration:generate -- src/migrations/Name` | Generate a migration from entity changes |

The schema changes ONLY through migrations (`synchronize` is off). Every new entity or column
needs a migration.

## Production

- Build the image: `docker build -t muktpay-api .`
- Environment variables: see `env.production.example`. The API refuses to start with missing,
  weak or development values.
- PostgreSQL 13 or newer, with `DB_SSL=true` for a managed database.
- Health endpoints:
  - `GET /api/health` always answers 200 and reports `database: up | down`.
  - `GET /api/health/ready` answers 503 when the database is unreachable. Point your host's
    health check at this one.
- Every response carries an `X-Request-Id` header, and the same id is in the access log line.
