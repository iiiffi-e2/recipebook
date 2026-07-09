export type PrepPhase = "idle" | "preparing" | "grouping" | "error";

export type PrepItem = {
  id: string;
  fileName: string;
  previewUrl?: string;
  kind: "image" | "file";
};

export type PrepState = {
  phase: PrepPhase;
  total: number;
  ready: number;
  items: PrepItem[];
  error: string | null;
};

export function createPrepState(total: number): PrepState {
  return {
    phase: "preparing",
    total,
    ready: 0,
    items: [],
    error: null,
  };
}

export function appendPrepItem(state: PrepState, item: PrepItem): PrepState {
  return {
    ...state,
    ready: state.ready + 1,
    items: [...state.items, item],
  };
}

export function beginGrouping(state: PrepState): PrepState {
  return { ...state, phase: "grouping", error: null };
}

export function prepProgressRatio(state: PrepState): number {
  if (state.phase === "grouping") return 1;
  if (state.total <= 0) return 0;
  return state.ready / state.total;
}

export function createPrepError(state: PrepState, message: string): PrepState {
  return { ...state, phase: "error", error: message };
}

export function clearPrepState(): PrepState {
  return {
    phase: "idle",
    total: 0,
    ready: 0,
    items: [],
    error: null,
  };
}
