"use client";

import { useState } from "react";

/**
 * Client-side analysis model selection.
 *
 * Persisted per-browser in localStorage (client-side selection, no SQL). The
 * chosen model id is sent with each realtime session's `start_session` message
 * so the AI service uses exactly the selected model for every chunk.
 */
export type ModelId = "aasist_voiceprint" | "aasist" | "heuristic";

export const MODEL_OPTIONS: Array<{ id: ModelId; label: string; hint: string }> = [
  {
    id: "aasist_voiceprint",
    label: "AASIST-L + Voiceprint (Recommended)",
    hint: "Anti-spoof model plus speaker verification against your trained voiceprint.",
  },
  {
    id: "aasist",
    label: "AASIST-L only",
    hint: "Anti-spoof model only — no speaker similarity scoring.",
  },
  {
    id: "heuristic",
    label: "Fast heuristic (no model)",
    hint: "DSP-only analysis. Fastest, weakest accuracy.",
  },
];

const STORAGE_KEY = "voxverity.model";

const DEFAULTS: ModelId = "aasist_voiceprint";

function isModelId(v: string | null): v is ModelId {
  return v === "aasist_voiceprint" || v === "aasist" || v === "heuristic";
}

export function getModelPreference(): ModelId {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return isModelId(v) ? v : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function setModelPreference(model: ModelId): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, model);
  } catch {
    /* storage unavailable — in-memory only */
  }
}

/** Reactive model preference for client components. */
export function useModelPreference(): [ModelId, (m: ModelId) => void] {
  // Lazy initializer reads localStorage on first client render (guarded for SSR).
  const [model, setModel] = useState<ModelId>(() => getModelPreference());

  const update = (next: ModelId) => {
    setModel(next);
    setModelPreference(next);
  };

  return [model, update];
}