# MuktPay

```
Mobile (Expo Go) ──┐
                   ├──▶ NestJS API ──▶ PostgreSQL
Web (React/Vite) ──┘         └── (UPI apps are launched from the phone, not the server)
```

| Folder | Stack | Dev port |
|---|---|---|
| `muktpay-backend/` | NestJS 11, TypeORM 0.3, PostgreSQL | 4000 |
| `muktpay-web/` | React 19, Vite, TypeScript, TanStack Query, Axios | 5173 |
| `muktpay-mobile/` | Expo (SDK 57), Expo Router, TanStack Query, Axios | 8081 |

## First-time setup (Windows PowerShell shown; use `cp` on macOS/Linux)

```powershell
# 0. Database (needs Docker Desktop running)
docker compose up -d

# 1. Backend
cd muktpay-backend
npm install
copy .env.example .env      # then put two DIFFERENT random secrets in JWT_* (see the file)
npm run start:dev           # applies DB migrations automatically, then serves http://localhost:4000/api

# 2. Web (new terminal)
cd muktpay-web
npm install
copy .env.example .env
npm run dev

# 3. Mobile (new terminal)
cd muktpay-mobile
npm install
npx expo start              # scan the QR with Expo Go
```

Phone and computer must be on the **same Wi-Fi**. Allow Node.js through the Windows firewall
(Private networks) the first time the backend starts.

## Database rules (this is a payments app)

- **Schema changes only through migrations** in `muktpay-backend/src/migrations`. `synchronize` is off.
- After editing an entity: `npm run migration:generate -- src/migrations/DescribeTheChange`, **read the
  generated SQL**, commit it. The API applies pending migrations at boot (`DB_MIGRATIONS_RUN`).
- `npm run migration:show` lists applied/pending; `npm run migration:revert` undoes the last one.
- Conventions: UUID primary keys · `timestamptz` timestamps · `snake_case` columns · money as
  integer paise · rows are revoked/flagged, not deleted.

## Tests

```powershell
cd muktpay-backend
npm run test:e2e            # needs the database running

cd muktpay-mobile
npm test                    # UPI parser/validator, money formatting (no phone needed)
```

## Auth API (all under /api)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/register` | public | 5/min/IP |
| POST | `/auth/login` | public | 5/min/IP |
| POST | `/auth/refresh` | public | rotates the refresh token; replay revokes all sessions |
| POST | `/auth/logout` | public | body: `{ refreshToken }` |
| POST | `/auth/logout-all` | Bearer | revokes every session |
| GET | `/users/me` | Bearer | current profile |
| POST | `/split/preview` | Bearer | body `{ totalPaise, strategy?, maxTranchePaise? }` → payment plan (creates nothing) |
| GET | `/health` | public | |

Every route requires a Bearer token unless marked `@Public()`.

## Split rules (backend/src/split)

Pure, deterministic, integer-paise maths: no randomness, no floats. Defaults (override in `.env`):
each payment ≤ ₹1,999 · each payment ≥ ₹1 (a tiny leftover is topped up from the previous payment) ·
at most 20 payments per order. Strategies: `greedy` (₹6,800 → 1,999 · 1,999 · 1,999 · 803) and
`balanced` (₹6,800 → 1,700 × 4). Callers may lower the cap but never raise it.
