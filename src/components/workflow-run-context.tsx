"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@clerk/nextjs";
import { ApiError } from "@/lib/api-client";
import {
  startNodeRun,
  startWorkflowRun,
  subscribeAfterStart,
} from "@/lib/start-run";

export type RunUiStatus =
  | { kind: "idle" }
  | { kind: "starting" }
  | { kind: "started"; runId: string; message: string }
  | { kind: "error"; message: string };

type WorkflowRunContextValue = {
  workflowId: string;
  status: RunUiStatus;
  lastRunId: string | null;
  isBusy: boolean;
  runWorkflow: () => Promise<void>;
  runNode: (nodeId: string) => Promise<void>;
  clearStatus: () => void;
};

const WorkflowRunContext = createContext<WorkflowRunContextValue | null>(null);

export function useWorkflowRun(): WorkflowRunContextValue | null {
  return useContext(WorkflowRunContext);
}

export function WorkflowRunProvider({
  workflowId,
  children,
}: {
  workflowId: string;
  children: ReactNode;
}) {
  const { getToken } = useAuth();
  const [status, setStatus] = useState<RunUiStatus>({ kind: "idle" });
  const [lastRunId, setLastRunId] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const busyRef = useRef(false);
  const subCloseRef = useRef<(() => void) | null>(null);
  const generationRef = useRef(0);

  const clearStatus = useCallback(() => {
    setStatus({ kind: "idle" });
  }, []);

  const resetRunState = useCallback(() => {
    generationRef.current += 1;
    subCloseRef.current?.();
    subCloseRef.current = null;
    busyRef.current = false;
    setIsBusy(false);
    setLastRunId(null);
    setStatus({ kind: "idle" });
  }, []);

  useEffect(() => {
    return () => {
      subCloseRef.current?.();
      subCloseRef.current = null;
    };
  }, []);

  useEffect(() => {
    resetRunState();
  }, [workflowId, resetRunState]);

  const afterStart = useCallback(
    async (runId: string, label: string, generation: number) => {
      if (generationRef.current !== generation) return;
      setLastRunId(runId);
      setStatus({
        kind: "started",
        runId,
        message: `${label} started (${runId})`,
      });
      try {
        subCloseRef.current?.();
        const sub = await subscribeAfterStart(runId, {
          getToken,
          log: (msg, event) => {
            console.log(msg, event);
          },
        });
        if (generationRef.current !== generation) {
          sub.close();
          return;
        }
        subCloseRef.current = sub.close;
      } catch (err) {
        // Subscribe is optional for Slice 8 — run already started.
        console.warn("subscribeAfterStart failed", err);
      }
    },
    [getToken],
  );

  const handleError = useCallback((err: unknown, generation: number) => {
    if (generationRef.current !== generation) return;
    const message =
      err instanceof ApiError
        ? err.message
        : err instanceof Error
          ? err.message
          : String(err);
    setStatus({ kind: "error", message });
  }, []);

  const runWorkflow = useCallback(async () => {
    if (busyRef.current) return;
    const generation = generationRef.current;
    busyRef.current = true;
    setIsBusy(true);
    setStatus({ kind: "starting" });
    try {
      const { runId } = await startWorkflowRun(workflowId, { getToken });
      await afterStart(runId, "Workflow run", generation);
    } catch (err) {
      handleError(err, generation);
    } finally {
      if (generationRef.current === generation) {
        busyRef.current = false;
        setIsBusy(false);
      }
    }
  }, [workflowId, getToken, afterStart, handleError]);

  const runNode = useCallback(
    async (nodeId: string) => {
      if (busyRef.current) return;
      const generation = generationRef.current;
      busyRef.current = true;
      setIsBusy(true);
      setStatus({ kind: "starting" });
      try {
        const { runId } = await startNodeRun(
          { workflowId, nodeId },
          { getToken },
        );
        await afterStart(runId, "Node run", generation);
      } catch (err) {
        handleError(err, generation);
      } finally {
        if (generationRef.current === generation) {
          busyRef.current = false;
          setIsBusy(false);
        }
      }
    },
    [workflowId, getToken, afterStart, handleError],
  );

  const value: WorkflowRunContextValue = {
    workflowId,
    status,
    lastRunId,
    isBusy,
    runWorkflow,
    runNode,
    clearStatus,
  };

  return (
    <WorkflowRunContext.Provider value={value}>
      {children}
    </WorkflowRunContext.Provider>
  );
}
