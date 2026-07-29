import { AppShell } from "@/components/app-shell";
import { WorkflowEditor } from "@/components/workflow-editor";

export default async function WorkflowEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AppShell>
      <WorkflowEditor workflowId={id} />
    </AppShell>
  );
}
