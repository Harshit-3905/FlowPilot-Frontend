import type { NodeDefinition } from "./node-definition";

/**
 * Connector–setting parity: every `ui.fields` key must have a matching
 * input handle `in:<key>`. No UI-only settings (opt-out forbidden).
 */
export function connectorSettingParityErrors(def: NodeDefinition): string[] {
  const handleIds = new Set(def.ui.handles.inputs.map((h) => h.id));
  const missing: string[] = [];
  for (const field of def.ui.fields) {
    const expected = `in:${field.key}`;
    if (!handleIds.has(expected)) {
      missing.push(field.key);
    }
  }
  return missing;
}

/** Throws if any `ui.fields` key lacks an `in:<key>` handle. */
export function assertConnectorSettingParity(def: NodeDefinition): void {
  const missing = connectorSettingParityErrors(def);
  if (missing.length === 0) return;
  const listed = missing.map((key) => `in:${key}`).join(", ");
  throw new Error(
    `Node "${def.type}" connector–setting parity failed; missing input handles for ui.fields: ${listed}`,
  );
}
