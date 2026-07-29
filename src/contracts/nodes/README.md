# Adding a node definition

One file under `nodes/` = one registry entry.

Sync guard workflow (required):

1. Edit contracts on one side (`frontend/src/contracts/` or `backend/src/contracts/`)
2. Copy the same change to the other side
3. Run `./scripts/check-contracts-sync.sh` from workspace root

No shared npm contracts package and no FE↔BE `file:` path dependencies.

## Template

1. Create `nodes/<slug>.ts` exporting a `NodeDefinition` (see `gpt-image-2.ts`).
2. Zod `input` / `output` schemas — settings live in `data.inputs`; apply `.default(...)` for product defaults.
3. `ui.fields`: primary fields first; mark Settings-only fields `advanced: true`. Use `subModelIds` when a field is mode-specific (e.g. I2I `image_urls`).
4. `ui.handles.inputs`: every field key gets `in:<key>`; outputs use `out:<key>` (product export convention).
5. Optional: `subModels`, `limits`, `provider` (stub until execution lands). Prefer `credits: { estimate }` or `{ static }` so `estimateCredits(type, input)` works.
6. Register in `node-definition.ts` → `nodeRegistry[def.type] = def`.
7. Add Vitest: invalid input rejected; empty/`{}` parse applies defaults; `getNode(type)` returns the def; credit estimate deterministic for sample inputs.
8. `assertConnectorSettingParity` must pass (CI runs it against all `listNodes()`).

## Do not

- Put execution / provider side-effects in definition files
- Update only one repo’s `src/contracts/`
- Invent FE-only schemas that diverge from BE
- Add UI-only settings without an `in:<key>` handle
