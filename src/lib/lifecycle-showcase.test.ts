import assert from "node:assert/strict";
import test from "node:test";
import { lifecycleStage, rankLifecycleShowcase, type ShowcaseIdea } from "./lifecycle-showcase.ts";

const idea = (id: string, extra: Partial<ShowcaseIdea> = {}): ShowcaseIdea => ({
  id,
  updatedAt: "2026-09-01T00:00:00Z",
  attemptCount: 0,
  works: [],
  ...extra,
});

test("a full loop (work that grew a next idea) ranks ahead of newer unclaimed ideas", () => {
  const fresh = idea("fresh", { updatedAt: "2026-10-01T00:00:00Z" });
  const claimed = idea("claimed", { attemptCount: 2 });
  const shipped = idea("shipped", { attemptCount: 1, works: [{ id: "w1" }] });
  const looped = idea("looped", { attemptCount: 1, works: [{ id: "w2" }], updatedAt: "2026-08-01T00:00:00Z" });
  const child = idea("child", { source: { workId: "w2" } });
  const ranked = rankLifecycleShowcase([fresh, claimed, shipped, child, looped]).map((i) => i.id);
  assert.deepEqual(ranked.slice(0, 3), ["looped", "shipped", "claimed"]);
  assert.equal(ranked.at(-1), "child");
});

test("lifecycleStage reports how far an idea got", () => {
  const all = [idea("a"), idea("b", { attemptCount: 1 }), idea("c", { works: [{ id: "w" }] })];
  assert.equal(lifecycleStage(all[0], all), "idea");
  assert.equal(lifecycleStage(all[1], all), "attempt");
  assert.equal(lifecycleStage(all[2], all), "work");
  const withChild = [...all, idea("d", { source: { workId: "w" } })];
  assert.equal(lifecycleStage(withChild[2], withChild), "next_idea");
});

test("ties keep the most recently active idea first and never drop entries", () => {
  const older = idea("older", { updatedAt: "2026-01-01T00:00:00Z" });
  const newer = idea("newer", { updatedAt: "2026-02-01T00:00:00Z" });
  assert.deepEqual(rankLifecycleShowcase([older, newer]).map((i) => i.id), ["newer", "older"]);
  assert.equal(rankLifecycleShowcase([]).length, 0);
});
