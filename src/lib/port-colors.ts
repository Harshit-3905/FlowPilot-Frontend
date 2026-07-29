/**
 * Map handle `dataType` → Magica port / edge stroke color (CSS var or hex).
 * See `docs/reference/tokens.md`.
 */

export type PortColorToken =
  | "text"
  | "image"
  | "video"
  | "number"
  | "audio"
  | "any";

const TOKEN_TO_CSS_VAR: Record<PortColorToken, string> = {
  text: "var(--port-text)",
  image: "var(--port-image)",
  video: "var(--port-video)",
  number: "var(--port-number)",
  audio: "var(--port-audio)",
  any: "var(--text-muted)",
};

/** Resolved hex for canvas edge strokes (React Flow style.stroke needs concrete color). */
const TOKEN_TO_HEX: Record<PortColorToken, string> = {
  text: "#f97316",
  image: "#3b82f6",
  video: "#22c55e",
  number: "#ec4899",
  audio: "#8b5cf6",
  any: "#8e8e93",
};

/**
 * Normalize registry dataType strings (`string`, `image[]`, `number`, …)
 * into a port token used for handle + edge coloring.
 */
export function portTokenForDataType(dataType: string): PortColorToken {
  const t = dataType.trim().toLowerCase();
  if (t === "any" || t === "*") return "any";
  if (t === "string" || t === "text" || t.startsWith("text")) return "text";
  if (t === "number" || t === "int" || t === "float" || t === "duration") {
    return "number";
  }
  if (t === "boolean" || t === "bool") return "number";
  if (t === "image" || t.startsWith("image")) return "image";
  if (t === "video" || t.startsWith("video")) return "video";
  if (t === "audio" || t.startsWith("audio")) return "audio";
  return "any";
}

/** CSS `var(--port-*)` for handle backgrounds. */
export function portCssVarForDataType(dataType: string): string {
  return TOKEN_TO_CSS_VAR[portTokenForDataType(dataType)];
}

/** Hex stroke for edges (matches port tokens). */
export function portColorForDataType(dataType: string): string {
  return TOKEN_TO_HEX[portTokenForDataType(dataType)];
}
