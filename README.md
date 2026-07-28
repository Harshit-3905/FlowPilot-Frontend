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

| Path   | Access                                                                                      |
| :----- | :------------------------------------------------------------------------------------------ |
| `/`    | Public landing (Sign in / Sign up)                                                          |
| `/app` | Protected shell (Clerk middleware `auth.protect()`); loads `GET /api/v1/me` with Bearer JWT |

## Scripts

| Script       | Description                                                           |
| :----------- | :-------------------------------------------------------------------- |
| `pnpm dev`   | Dev server (Turbopack)                                                |
| `pnpm build` | Production build (requires Clerk + API env vars — see `.env.example`) |
| `pnpm start` | Start production server                                               |
| `pnpm lint`  | ESLint                                                                |
| `pnpm test`  | Vitest (node + jsdom RTL/MSW)                                         |

### Build note

`pnpm build` needs the Clerk keys and `NEXT_PUBLIC_API_URL` set (`.env.local` or CI secrets). Placeholder `pk_test_…` / `sk_test_…` values from a real Clerk test instance work; empty keys fail middleware/provider init.

## CI

GitHub Actions: `.github/workflows/ci.yml` — `pnpm test` + `pnpm build` with stub Clerk/API env (no real secrets required for smoke).
