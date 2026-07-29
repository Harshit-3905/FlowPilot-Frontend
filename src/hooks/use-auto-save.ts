"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditorStore } from "@/store/editor-store";
import { apiFetch, type GetToken } from "@/lib/api-client";
import { z } from "zod";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

const PatchResponseSchema = z.object({ id: z.string() }).passthrough();

export function useAutoSave(workflowId: string, getToken: GetToken, debounceMs = 800) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>(JSON.stringify(useEditorStore.getState().toGraphDTO()));
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const flush = useCallback(async () => {
    const dto = useEditorStore.getState().toGraphDTO();
    const snapshot = JSON.stringify(dto);
    if (snapshot === lastSavedRef.current) return;

    setStatus("saving");
    try {
      await apiFetch(`/api/v1/workflows/${workflowId}`, {
        getToken,
        schema: PatchResponseSchema,
        method: "PATCH",
        body: { graph: dto },
      });
      if (mountedRef.current) {
        lastSavedRef.current = snapshot;
        setStatus("saved");
      }
    } catch {
      if (mountedRef.current) setStatus("error");
    }
  }, [workflowId, getToken]);

  const scheduleSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { void flush(); }, debounceMs);
  }, [flush, debounceMs]);

  useEffect(() => {
    const unsub = useEditorStore.subscribe((state, prev) => {
      if (
        state.nodes !== prev.nodes ||
        state.edges !== prev.edges ||
        state.viewport !== prev.viewport
      ) {
        scheduleSave();
      }
    });
    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [scheduleSave]);

  return status;
}
