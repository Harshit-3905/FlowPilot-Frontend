# FlowPilot — Frontend

Next.js App Router UI for FlowPilot (visual workflow builder; Galaxy/Magica UI reference). Deployed independently (separate VPC from the backend). Talks to the backend only via public HTTPS APIs (`NEXT_PUBLIC_API_URL`).

## Requirements

- Node.js `22` (see `.nvmrc`)
- pnpm `9.15.9` (`packageManager` field)

## Setup

```bash
cd frontend
pnpm install
cp .env.example .env.local   # added in later slices
pnpm dev
```

Default local port: `3000`.

## Scripts

| Script | Description |
| :----- | :---------- |
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest unit/smoke tests |

## Topology notes

- No path dependency on `../backend` (separate VPC)
- Shared Zod/DTOs live in `src/contracts/` — keep identical to `backend/src/contracts/`
- After changing contracts, copy to the other repo and run from workspace root:
  `./scripts/check-contracts-sync.sh`
- Import via `@/contracts` (e.g. `import { ErrorEnvelopeSchema } from "@/contracts"`)
