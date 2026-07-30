# FlowPilot — Frontend

Next.js App Router UI for FlowPilot (visual workflow builder; Galaxy/Magica UI reference). Deployed independently (separate VPC from the backend). Talks to the backend only via public HTTPS APIs (`NEXT_PUBLIC_API_URL`).

## Requirements

- Node.js `22` (see `.nvmrc`)
- pnpm `9.15.9` (`packageManager` field)
- Clerk application (publishable + secret keys)

## Setup

```bash
cd frontend
pnpm install
cp .env.example .env.local
# Fill NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, NEXT_PUBLIC_API_URL
pnpm dev
```

Default local port: **`:3000`**. Backend listens on **`:3001`**. Never hardcode the API host in app code — always `NEXT_PUBLIC_API_URL`.

### Split-origin local setup

| App           | Origin                  | Key env                                     |
| :------------ | :---------------------- | :------------------------------------------ |
| This frontend | `http://localhost:3000` | `NEXT_PUBLIC_API_URL=http://localhost:3001` |
| Backend       | `http://localhost:3001` | `FRONTEND_ORIGIN=http://localhost:3000`     |

`apiFetch` / `fetchMe` throw if `NEXT_PUBLIC_API_URL` is missing. Backend CORS must allow this FE origin (see `backend/README.md`).

### Deploy targets

| Target            | Host                            | Notes                                                                                                |
| :---------------- | :------------------------------ | :--------------------------------------------------------------------------------------------------- |
| **This frontend** | **Vercel** (recommended)        | Set env in project settings; each preview URL needs matching BE `FRONTEND_ORIGIN` (or a preview BE). |
| Backend           | Railway / Fly.io / Render / VPS | Separate VPC; public HTTPS only — see `backend/README.md`.                                           |

Required absolute env on Vercel:

| Variable                            | Example                                       |
| :---------------------------------- | :-------------------------------------------- |
| `NEXT_PUBLIC_API_URL`               | `https://api.example.com` (no trailing slash) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard → API keys                    |
| `CLERK_SECRET_KEY`                  | Clerk Dashboard → API keys                    |

### Preview / deploy (Vercel FE + separate BE host)

1. Point `NEXT_PUBLIC_API_URL` at the public backend HTTPS origin (not localhost).
2. Ensure the BE `FRONTEND_ORIGIN` matches this Vercel URL (production domain or preview URL).
3. Clerk Dashboard: allow the Vercel origin(s). Session JWT is attached as Bearer — no shared cookie domain required.

### Smoke: FE → BE health (public URL)

From this repo (uses `Origin` like a browser would):

```bash
NEXT_PUBLIC_API_URL=https://api.example.com \
FRONTEND_ORIGIN=https://your-app.vercel.app \
./scripts/check-api-health.sh
```

Or raw curl:

```bash
curl -sS -D - \
  -H "Origin: https://your-app.vercel.app" \
  -H "Accept: application/json" \
  "https://api.example.com/api/v1/health"
# expect 200 + {"status":"ok"} and Access-Control-Allow-Origin matching FRONTEND_ORIGIN
```

Local: `NEXT_PUBLIC_API_URL=http://localhost:3001 ./scripts/check-api-health.sh`

### Env

| Variable                            | Required | Purpose                                                                                     |
| :---------------------------------- | :------- | :------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | yes      | Clerk browser SDK                                                                           |
| `CLERK_SECRET_KEY`                  | yes      | Clerk middleware / server auth                                                              |
| `NEXT_PUBLIC_API_URL`               | yes      | Absolute backend origin (local: `http://localhost:3001`; deploy: `https://api.example.com`) |

No `DATABASE_URL` on the frontend.

### Auth routes

| Path | Access |
| :---- | :---- |
| `/` | Protected workflows dashboard (Clerk `auth.protect()`); signed-out → `/sign-in` |
| `/workflows/[id]` | Protected canvas editor |
| `/sign-in`, `/sign-up` | Public Clerk auth pages; redirect to `/` on success |

## Scripts

| Script          | Description                                                           |
| :-------------- | :-------------------------------------------------------------------- |
| `pnpm dev`      | Dev server (Turbopack)                                                |
| `pnpm build`    | Production build (requires Clerk + API env vars — see `.env.example`) |
| `pnpm start`    | Start production server                                               |
| `pnpm lint`     | ESLint                                                                |
| `pnpm test`     | Vitest (node + jsdom RTL/MSW)                                         |
| `pnpm test:e2e` | Playwright L4 E2E (`e2e/`; separate `FE_BASE_URL` + `API_BASE_URL`)   |

### Build note

`pnpm build` needs the Clerk keys and `NEXT_PUBLIC_API_URL` set (`.env.local` or CI secrets). Placeholder `pk_test_…` / `sk_test_…` values from a real Clerk test instance work; empty keys fail middleware/provider init.

### Playwright E2E (L4)

Config: `playwright.config.ts` — **never** assumes same-origin FE+API.

| Variable | Default | Purpose |
| :------- | :------ | :------ |
| `FE_BASE_URL` | `http://localhost:3000` | Playwright `baseURL` (frontend deploy / local) |
| `API_BASE_URL` | `http://localhost:3001` | Direct / CORS checks against backend |
| `E2E_CLERK_USER_EMAIL` | — | Test user email (or `E2E_CLERK_USER_USERNAME`) |
| `E2E_CLERK_USER_PASSWORD` | — | Test user password |
| `CLERK_SECRET_KEY` / `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | — | Required for `@clerk/testing` token + sign-in |
| `E2E_API_KEY` / `E2E_WORKFLOW_ID` | — | E2E-07 public API start + poll (owned workflow) |
| `E2E_FFMPEG` | — | Reserved (`1`); E2E-08 is BE ffmpeg IT today |

```bash
# Always-on: config gate (+ CORS smoke soft-skips if API down)
pnpm test:e2e

# Full E2E-01..06 (Clerk email+password enabled on test instance)
# Backend: EXECUTION_MODE=inline, STUB_PROVIDER_DELAY_MS=0 recommended for run specs
FE_BASE_URL=http://localhost:3000 \
API_BASE_URL=http://localhost:3001 \
E2E_CLERK_USER_EMAIL=... \
E2E_CLERK_USER_PASSWORD=... \
CLERK_SECRET_KEY=sk_test_... \
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_... \
pnpm test:e2e

# E2E-07 only (API key — no Clerk UI)
API_BASE_URL=http://localhost:3001 \
E2E_API_KEY=fp_... \
E2E_WORKFLOW_ID=... \
pnpm test:e2e -- e2e/e2e-07-api-key-run.spec.ts
```

| Spec | What it covers |
| :--- | :------------- |
| E2E-01/02 | Create/save/reload; invalid connection |
| E2E-03 | Linear stub run → history completed + canvas statuses |
| E2E-04 | Parallel diamond → both branches completed |
| E2E-05 | Insufficient credits banner (`insufficient_credits`) |
| E2E-06 | Failed node → partial outputs + attempts |
| E2E-07 | Public API key start + status poll (`inDetails`) |
| E2E-08 | BE `merge-videos` ffmpeg IT (L4 stub skip-gated) |

First time: `pnpm exec playwright install chromium`. Without Clerk / API-key credentials, gated specs **skip**; the config assert still runs. Full evaluator smoke: workspace `docs/evaluator-smoke.md`.

## CI

GitHub Actions: `.github/workflows/ci.yml` — **L1** `pnpm test` (contracts Vitest + inventory + RTL/MSW) + `pnpm build` with stub Clerk/API env. Playwright is **not** on every PR (nightly / local with credentials).

**L2 FE≡BE contracts sync** cannot run in this repo alone (split VPC). From the trial workspace root that contains both trees:

```bash
./scripts/ci-l2-contracts.sh
```

Coverage map: `docs/integration-coverage.md` (in the trial docs tree).

## Contracts sync workflow

`src/contracts/` in this repo must remain identical to `../backend/src/contracts/` (no package publish, no `file:` path dependency between repos).

When you change contracts:

1. Edit one side (`frontend/src/contracts/` **or** `backend/src/contracts/`)
2. Copy the same changes to the other repo’s `src/contracts/`
3. From workspace root (`Magica Work Trial/`), run:

```bash
./scripts/ci-l2-contracts.sh
# equivalent: ./scripts/check-contracts-sync.sh
```

Local/dev note: this sync check runs from the shared workspace root, not from inside `frontend/` alone.
