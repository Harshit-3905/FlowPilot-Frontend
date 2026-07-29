import { getNode, type NodeDefinition, type UiField } from "@/contracts";
import type { ReactNode } from "react";

type NodeConfigFormProps = {
  nodeType?: string;
  nodeDefinition?: NodeDefinition;
  showHandles?: boolean;
};

function resolveNodeDefinition({
  nodeType,
  nodeDefinition,
}: NodeConfigFormProps): NodeDefinition {
  if (nodeDefinition) {
    return nodeDefinition;
  }

  if (!nodeType) {
    throw new Error("NodeConfigForm requires `nodeDefinition` or `nodeType`.");
  }

  const foundNode = getNode(nodeType);
  if (!foundNode) {
    throw new Error(`Unknown node type: ${nodeType}`);
  }

  return foundNode;
}

function fieldDefaultValue(field: UiField): string | number {
  if (typeof field.default === "number") return field.default;
  if (typeof field.default === "string") return field.default;
  return "";
}

function renderFieldControl(field: UiField): ReactNode {
  const id = `node-field-${field.key}`;

  switch (field.control) {
    case "text":
      return <input id={id} name={field.key} type="text" defaultValue={fieldDefaultValue(field)} />;
    case "number":
      return (
        <input
          id={id}
          name={field.key}
          type="number"
          defaultValue={typeof field.default === "number" ? field.default : undefined}
        />
      );
    case "slider":
      return (
        <input
          id={id}
          name={field.key}
          type="range"
          min={0}
          max={100}
          defaultValue={typeof field.default === "number" ? field.default : 0}
        />
      );
    case "switch":
      return (
        <input
          id={id}
          name={field.key}
          type="checkbox"
          defaultChecked={Boolean(field.default)}
        />
      );
    case "file":
      return <input id={id} name={field.key} type="file" />;
    case "select": {
      const opts = field.options ?? [
        { value: String(fieldDefaultValue(field)), label: String(fieldDefaultValue(field) || "Select") },
      ];
      return (
        <select id={id} name={field.key} defaultValue={String(fieldDefaultValue(field))}>
          {opts.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }
    default:
      return <input id={id} name={field.key} type="text" defaultValue={fieldDefaultValue(field)} />;
  }
}

function NodeField({ field }: { field: UiField }) {
  const id = `node-field-${field.key}`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {field.label}
      </label>
      {renderFieldControl(field)}
    </div>
  );
}

export function NodeConfigForm(props: NodeConfigFormProps) {
  const nodeDefinition = resolveNodeDefinition(props);
  const primaryFields = nodeDefinition.ui.fields.filter((field) => !field.advanced);
  const advancedFields = nodeDefinition.ui.fields.filter((field) => Boolean(field.advanced));

  return (
    <section
      data-testid={`node-config-form-${nodeDefinition.type}`}
      className="rounded-md border border-black/10 p-4 dark:border-white/10"
    >
      <div className="mb-3">
        <h2 className="text-base font-semibold">{nodeDefinition.label}</h2>
        <p className="text-xs text-black/60 dark:text-white/60">{nodeDefinition.type}</p>
      </div>

      <form className="flex flex-col gap-3">
        {primaryFields.map((field) => (
          <NodeField key={field.key} field={field} />
        ))}

        {advancedFields.length > 0 ? (
          <details data-testid="node-config-advanced" className="rounded border border-black/10 p-3 dark:border-white/10">
            <summary className="cursor-pointer text-sm font-medium">Advanced</summary>
            <div className="mt-3 flex flex-col gap-3">
              {advancedFields.map((field) => (
                <NodeField key={field.key} field={field} />
              ))}
            </div>
          </details>
        ) : null}
      </form>

      {props.showHandles ? (
        <div data-testid="node-config-handles" className="mt-4 text-xs text-black/70 dark:text-white/70">
          <p className="font-medium">Handles</p>
          {nodeDefinition.ui.handles.inputs.map((handle) => (
            <p key={handle.id}>{handle.id}</p>
          ))}
          {nodeDefinition.ui.handles.outputs.map((handle) => (
            <p key={handle.id}>{handle.id}</p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
