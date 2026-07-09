import { describe, it, expect } from "vitest";
import {
  appendPrepItem,
  beginGrouping,
  clearPrepState,
  createPrepError,
  createPrepState,
  prepProgressRatio,
  type PrepItem,
} from "./prep-progress";

const sampleItem = (id: string): PrepItem => ({
  id,
  fileName: `${id}.jpg`,
  previewUrl: `blob:${id}`,
  kind: "image",
});

describe("prep-progress", () => {
  it("createPrepState starts preparing with zero ready", () => {
    const state = createPrepState(3);
    expect(state).toEqual({
      phase: "preparing",
      total: 3,
      ready: 0,
      items: [],
      error: null,
    });
  });

  it("appendPrepItem adds the item and increments ready", () => {
    let state = createPrepState(2);
    state = appendPrepItem(state, sampleItem("a"));
    expect(state.ready).toBe(1);
    expect(state.items).toHaveLength(1);
    state = appendPrepItem(state, sampleItem("b"));
    expect(state.ready).toBe(2);
    expect(state.items.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("beginGrouping switches phase and keeps items", () => {
    let state = createPrepState(1);
    state = appendPrepItem(state, sampleItem("a"));
    state = beginGrouping(state);
    expect(state.phase).toBe("grouping");
    expect(state.items).toHaveLength(1);
    expect(state.ready).toBe(1);
  });

  it("prepProgressRatio is ready/total, 1 when grouping, 0 when total is 0", () => {
    expect(prepProgressRatio(createPrepState(4))).toBe(0);
    expect(prepProgressRatio(appendPrepItem(createPrepState(4), sampleItem("a")))).toBe(0.25);
    expect(prepProgressRatio(beginGrouping(createPrepState(2)))).toBe(1);
    expect(prepProgressRatio(createPrepState(0))).toBe(0);
  });

  it("createPrepError keeps items and sets message", () => {
    let state = createPrepState(1);
    state = appendPrepItem(state, sampleItem("a"));
    state = createPrepError(state, "Grouping failed");
    expect(state.phase).toBe("error");
    expect(state.error).toBe("Grouping failed");
    expect(state.items).toHaveLength(1);
  });

  it("clearPrepState returns idle empty state", () => {
    expect(clearPrepState()).toEqual({
      phase: "idle",
      total: 0,
      ready: 0,
      items: [],
      error: null,
    });
  });
});
