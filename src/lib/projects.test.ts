import assert from "node:assert/strict";
import test from "node:test";
import {
  applyCurations,
  applyOwnerPatch,
  displayPitch,
  featuredProjects,
  mergeRepos,
  needsCuration,
  parseCurationOutput,
  projectStatus,
  publicSections,
} from "./projects.ts";
import type { Project, RepoActivity, RepoSnapshot } from "./types.ts";

const NOW = Date.parse("2026-11-13T00:00:00Z");
const daysAgo = (days: number) => new Date(NOW - days * 86_400_000).toISOString();

function repo(name: string, overrides: Partial<RepoSnapshot> = {}): RepoSnapshot {
  return {
    id: `me/${name}`.toLowerCase(),
    fullName: `me/${name}`,
    name,
    description: `${name} description`,
    url: `https://github.com/me/${name}`,
    topics: [],
    stars: 0,
    isPrivate: false,
    isFork: false,
    isArchived: false,
    createdAt: daysAgo(400),
    pushedAt: daysAgo(3),
    ...overrides,
  };
}

function project(name: string, overrides: Partial<Project> = {}): Project {
  return { ...repo(name), pinned: false, hidden: false, tagline: "", note: "", ...overrides };
}

test("status follows the latest commit, then pushedAt", () => {
  assert.equal(projectStatus(project("a", { pushedAt: daysAgo(5) }), NOW), "active");
  assert.equal(projectStatus(project("a", { pushedAt: daysAgo(30) }), NOW), "cooling");
  assert.equal(projectStatus(project("a", { pushedAt: daysAgo(90) }), NOW), "dormant");
  assert.equal(projectStatus(project("a", { isArchived: true }), NOW), "archived");
  const activity: RepoActivity = { weekly: [], commits30d: 0, lastCommitAt: daysAgo(100), fetchedAt: daysAgo(0) };
  assert.equal(projectStatus(project("a", { pushedAt: daysAgo(1), activity }), NOW), "dormant");
});

test("sync keeps owner fields and curation, refreshes GitHub fields, marks vanished repos", () => {
  const existing = [
    project("kept", {
      description: "old",
      pinned: true,
      note: "my thoughts",
      tagline: "custom",
      curation: { score: 80, pitch: "p", reason: "r", curatedAt: daysAgo(1), basedOnPushedAt: daysAgo(3) },
    }),
    project("gone", { note: "keep me" }),
  ];
  const merged = mergeRepos(existing, [repo("kept", { description: "new" }), repo("fresh")], new Map(), "T");
  const kept = merged.find((p) => p.name === "kept")!;
  assert.equal(kept.description, "new");
  assert.equal(kept.pinned, true);
  assert.equal(kept.note, "my thoughts");
  assert.equal(kept.tagline, "custom");
  assert.equal(kept.curation?.score, 80);
  const fresh = merged.find((p) => p.name === "fresh")!;
  assert.deepEqual([fresh.pinned, fresh.hidden, fresh.note], [false, false, ""]);
  const gone = merged.find((p) => p.name === "gone")!;
  assert.equal(gone.removedAt, "T");
  assert.equal(gone.note, "keep me");
});

test("a repo that comes back clears removedAt", () => {
  const merged = mergeRepos([project("back", { removedAt: "earlier" })], [repo("back")], new Map());
  assert.equal(merged[0].removedAt, undefined);
});

test("private, fork, hidden, removed and profile-README repos never reach public sections, even pinned", () => {
  const projects = [
    project("secret", { isPrivate: true, pinned: true, curation: { score: 99, pitch: "", reason: "", curatedAt: "", basedOnPushedAt: "" } }),
    project("forked", { isFork: true, pinned: true }),
    project("hidden", { hidden: true, pinned: true }),
    project("removed", { removedAt: "x", pinned: true }),
    project("me", { fullName: "me/me" }),
    project("open"),
  ];
  const sections = publicSections({ version: 1, projects }, NOW);
  const names = [...sections.featured, ...sections.building, ...sections.others].map((p) => p.name);
  assert.deepEqual(names, ["open"]);
});

test("featured: pinned first, then scores >= FEATURED_MIN_SCORE, capped", () => {
  const curated = (score: number) => ({ score, pitch: "", reason: "", curatedAt: "", basedOnPushedAt: "" });
  const projects = [
    project("low", { curation: curated(50) }),
    project("high", { curation: curated(90) }),
    project("mid", { curation: curated(75) }),
    project("pinned-low", { pinned: true, curation: curated(10) }),
  ];
  assert.deepEqual(featuredProjects(projects).map((p) => p.name), ["pinned-low", "high", "mid"]);
  assert.deepEqual(featuredProjects(projects, 2).map((p) => p.name), ["pinned-low", "high"]);
});

test("public sections split the rest by activity", () => {
  const projects = [project("busy", { pushedAt: daysAgo(2), note: "private" }), project("quiet", { pushedAt: daysAgo(200) })];
  const sections = publicSections({ version: 1, projects }, NOW);
  assert.equal(sections.building[0].note, "");
  assert.deepEqual(sections.building.map((p) => p.name), ["busy"]);
  assert.deepEqual(sections.others.map((p) => p.name), ["quiet"]);
});

test("owner patch trims tagline and ignores unknown types", () => {
  const next = applyOwnerPatch(project("a"), { tagline: "  hi  ", pinned: true, hidden: "yes" as never });
  assert.equal(next.tagline, "hi");
  assert.equal(next.pinned, true);
  assert.equal(next.hidden, false);
  assert.equal(displayPitch(next), "hi");
  assert.equal(displayPitch(project("b")), "b description");
});

test("needsCuration: new, stale after a push, never forks", () => {
  const curation = { score: 1, pitch: "", reason: "", curatedAt: "", basedOnPushedAt: daysAgo(3) };
  assert.equal(needsCuration(project("new")), true);
  assert.equal(needsCuration(project("same", { curation })), false);
  assert.equal(needsCuration(project("pushed", { curation, pushedAt: daysAgo(1) })), true);
  assert.equal(needsCuration(project("same", { curation }), { all: true }), true);
  assert.equal(needsCuration(project("fork", { isFork: true })), false);
});

test("parseCurationOutput tolerates fences, filters unknown repos and clamps", () => {
  const text = 'Sure!\n```json\n[{"repo":"ME/A","score":120,"pitch":" x ","reason":"r"},{"repo":"me/zzz","score":5},{"repo":"me/b","score":"n/a"}]\n```';
  assert.deepEqual(parseCurationOutput(text, ["me/a", "me/b"]), [{ repo: "me/a", score: 100, pitch: "x", reason: "r" }]);
  assert.throws(() => parseCurationOutput("no json here", ["me/a"]));
});

test("applyCurations records which push it judged", () => {
  const [result] = applyCurations([project("a")], [{ repo: "me/a", score: 70, pitch: "p", reason: "r", basedOnPushedAt: "old" }], "now");
  assert.deepEqual(result.curation, { score: 70, pitch: "p", reason: "r", curatedAt: "now", basedOnPushedAt: "old" });
});
