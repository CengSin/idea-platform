import assert from "node:assert/strict";
import test from "node:test";
import { ACTIVITY_WEEKS, fetchGitHubListing, summarizeCommits, toSnapshot } from "./github.ts";

const NOW = Date.parse("2026-11-13T00:00:00Z");
const commit = (daysAgo: number, message = "msg") => ({
  commit: { message, author: { date: new Date(NOW - daysAgo * 86_400_000).toISOString() }, committer: null },
});

test("summarizeCommits buckets by week, newest week last", () => {
  const result = summarizeCommits([commit(0, "latest\n\nbody"), commit(1), commit(8), commit(40), commit(200)], NOW);
  assert.equal(result.weekly.length, ACTIVITY_WEEKS);
  assert.equal(result.weekly[ACTIVITY_WEEKS - 1], 2);
  assert.equal(result.weekly[ACTIVITY_WEEKS - 2], 1);
  assert.equal(result.weekly.reduce((a, b) => a + b, 0), 4);
  assert.equal(result.commits30d, 3);
  assert.equal(result.lastCommitMessage, "latest");
});

test("toSnapshot drops non-http homepages", () => {
  const base = {
    full_name: "Me/Repo", name: "Repo", description: null, html_url: "u", language: null,
    stargazers_count: 1, private: false, fork: false, archived: false,
    created_at: "c", pushed_at: null, owner: { login: "Me" },
  };
  const snap = toSnapshot({ ...base, homepage: "javascript:alert(1)" });
  assert.equal(snap.homepage, undefined);
  assert.equal(snap.id, "me/repo");
  assert.equal(snap.pushedAt, "c");
  assert.equal(toSnapshot({ ...base, homepage: " https://x.dev " }).homepage, "https://x.dev");
});

test("fetchGitHubListing paginates, keeps only owned repos and survives an empty repo", async () => {
  const pushed = new Date(NOW - 86_400_000).toISOString();
  const repo = (name: string, owner = "me") => ({
    full_name: `${owner}/${name}`, name, description: "", html_url: "", homepage: null, language: "Go",
    stargazers_count: 0, private: false, fork: false, archived: false,
    created_at: pushed, pushed_at: pushed, owner: { login: owner },
  });
  const routes: Record<string, { body: unknown; status?: number; link?: string }> = {
    "/user": { body: { login: "me", name: null, bio: null, avatar_url: "a", html_url: "h" } },
    "/user/repos?affiliation=owner&sort=pushed&per_page=100": {
      body: [repo("one"), repo("theirs", "org")],
      link: '<https://api.github.com/user/repos?page=2>; rel="next"',
    },
    "/user/repos?page=2": { body: [repo("empty")] },
  };
  const fetchImpl = (async (url: string) => {
    const path = url.replace("https://api.github.com", "");
    const commitsFor = path.match(/^\/repos\/me\/(\w+)\/commits/);
    if (commitsFor) {
      if (commitsFor[1] === "empty") return new Response("{}", { status: 409 });
      return Response.json([commit(0, "hello")]);
    }
    const route = routes[path];
    if (!route) return new Response("nope", { status: 404 });
    return Response.json(route.body, { status: route.status ?? 200, headers: route.link ? { link: route.link } : {} });
  }) as typeof fetch;

  const listing = await fetchGitHubListing({ token: "t", fetchImpl, now: NOW });
  assert.equal(listing.owner.name, "me");
  assert.deepEqual(listing.repos.map((r) => r.name), ["one", "empty"]);
  assert.equal(listing.activity.get("me/one")?.lastCommitMessage, "hello");
  assert.equal(listing.activity.get("me/empty")?.commits30d, 0);
});

test("token for a different user than GITHUB_USER is rejected", async () => {
  const fetchImpl = (async () => Response.json({ login: "someone", avatar_url: "", html_url: "" })) as unknown as typeof fetch;
  await assert.rejects(fetchGitHubListing({ token: "t", login: "me", fetchImpl }), /不一致/);
});
