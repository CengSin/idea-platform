import type { OwnerProfile, RepoActivity, RepoSnapshot } from "./types.ts";

const API = "https://api.github.com";
const DAY = 86_400_000;
const WEEK = 7 * DAY;
export const ACTIVITY_WEEKS = 12;
const MAX_COMMIT_PAGES = 3;

export class GitHubError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
  }
}

type Fetch = typeof fetch;

export interface GitHubClientOptions {
  token?: string;
  fetchImpl?: Fetch;
}

function client({ token, fetchImpl = fetch }: GitHubClientOptions) {
  return async function request<T>(path: string): Promise<{ data: T; link: string | null }> {
    const response = await fetchImpl(`${API}${path}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "project-showcase",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });
    if (!response.ok) {
      const remaining = response.headers.get("x-ratelimit-remaining");
      const hint = remaining === "0" ? "（GitHub 接口频率超限，稍后再试或配置 GITHUB_TOKEN）" : "";
      throw new GitHubError(`GitHub ${response.status} ${path}${hint}`, response.status);
    }
    return { data: (await response.json()) as T, link: response.headers.get("link") };
  };
}

function nextLink(link: string | null): string | null {
  const match = link?.match(/<https:\/\/api\.github\.com([^>]+)>;\s*rel="next"/);
  return match ? match[1] : null;
}

type ApiRepo = {
  full_name: string;
  name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  private: boolean;
  fork: boolean;
  archived: boolean;
  created_at: string;
  pushed_at: string | null;
  owner: { login: string };
};

type ApiUser = {
  login: string;
  name: string | null;
  bio: string | null;
  avatar_url: string;
  html_url: string;
};

type ApiCommit = {
  commit: { message: string; author: { date: string } | null; committer: { date: string } | null };
};

export function toSnapshot(repo: ApiRepo): RepoSnapshot {
  const homepage = repo.homepage?.trim();
  return {
    id: repo.full_name.toLowerCase(),
    fullName: repo.full_name,
    name: repo.name,
    description: repo.description?.trim() ?? "",
    url: repo.html_url,
    homepage: homepage && /^https?:\/\//i.test(homepage) ? homepage : undefined,
    language: repo.language ?? undefined,
    topics: repo.topics ?? [],
    stars: repo.stargazers_count,
    isPrivate: repo.private,
    isFork: repo.fork,
    isArchived: repo.archived,
    createdAt: repo.created_at,
    pushedAt: repo.pushed_at ?? repo.created_at,
  };
}

/** Bucket commit dates into ACTIVITY_WEEKS weekly counts ending at `now`. */
export function summarizeCommits(commits: ApiCommit[], now = Date.now()): Omit<RepoActivity, "fetchedAt"> {
  const weekly = new Array<number>(ACTIVITY_WEEKS).fill(0);
  let commits30d = 0;
  for (const item of commits) {
    const at = new Date(item.commit.author?.date ?? item.commit.committer?.date ?? 0).getTime();
    const age = now - at;
    if (age < 0 || age >= ACTIVITY_WEEKS * WEEK) continue;
    weekly[ACTIVITY_WEEKS - 1 - Math.floor(age / WEEK)] += 1;
    if (age < 30 * DAY) commits30d += 1;
  }
  const latest = commits[0];
  return {
    weekly,
    commits30d,
    lastCommitAt: latest ? latest.commit.author?.date ?? latest.commit.committer?.date : undefined,
    lastCommitMessage: latest ? latest.commit.message.split("\n")[0].slice(0, 140) : undefined,
  };
}

async function pool<T, R>(items: T[], size: number, run: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await run(items[index]);
      }
    }),
  );
  return results;
}

export interface GitHubListing {
  owner: OwnerProfile;
  repos: RepoSnapshot[];
  activity: Map<string, RepoActivity>;
}

/**
 * List the owner's repositories with recent commit activity.
 * With a token the authenticated user's private repos are included;
 * without one, `login` is required and only public repos come back.
 */
export async function fetchGitHubListing(
  options: GitHubClientOptions & { login?: string; now?: number },
): Promise<GitHubListing> {
  const request = client(options);
  const now = options.now ?? Date.now();
  if (!options.token && !options.login) {
    throw new Error("需要 GITHUB_TOKEN 或 GITHUB_USER 之一");
  }

  const user = options.token
    ? (await request<ApiUser>("/user")).data
    : (await request<ApiUser>(`/users/${encodeURIComponent(options.login!)}`)).data;
  if (options.login && user.login.toLowerCase() !== options.login.toLowerCase()) {
    throw new Error(`GITHUB_TOKEN 属于 ${user.login}，与 GITHUB_USER=${options.login} 不一致`);
  }

  const apiRepos: ApiRepo[] = [];
  let path: string | null = options.token
    ? "/user/repos?affiliation=owner&sort=pushed&per_page=100"
    : `/users/${encodeURIComponent(user.login)}/repos?type=owner&sort=pushed&per_page=100`;
  while (path) {
    const page: { data: ApiRepo[]; link: string | null } = await request<ApiRepo[]>(path);
    apiRepos.push(...page.data);
    path = nextLink(page.link);
  }
  const repos = apiRepos
    .filter((repo) => repo.owner.login.toLowerCase() === user.login.toLowerCase())
    .map(toSnapshot);

  const since = new Date(now - ACTIVITY_WEEKS * WEEK).toISOString();
  const recent = repos.filter((repo) => !repo.isArchived && new Date(repo.pushedAt).getTime() >= now - ACTIVITY_WEEKS * WEEK);
  const fetchedAt = new Date(now).toISOString();
  const activity = new Map<string, RepoActivity>();
  for (const repo of repos) {
    if (!recent.includes(repo)) activity.set(repo.id, { ...summarizeCommits([], now), fetchedAt });
  }
  await pool(recent, 6, async (repo) => {
    const commits: ApiCommit[] = [];
    let commitPath: string | null = `/repos/${repo.fullName}/commits?since=${since}&per_page=100`;
    try {
      for (let page = 0; commitPath && page < MAX_COMMIT_PAGES; page += 1) {
        const result: { data: ApiCommit[]; link: string | null } = await request<ApiCommit[]>(commitPath);
        commits.push(...result.data);
        commitPath = nextLink(result.link);
      }
    } catch (error) {
      // 409 = empty repository; anything else keeps the previous activity on merge.
      if (!(error instanceof GitHubError && error.status === 409)) return;
    }
    activity.set(repo.id, { ...summarizeCommits(commits, now), fetchedAt });
  });

  return {
    owner: {
      login: user.login,
      name: user.name?.trim() || user.login,
      bio: user.bio?.trim() ?? "",
      avatarUrl: user.avatar_url,
      url: user.html_url,
    },
    repos,
    activity,
  };
}

/** Raw README text, or "" when the repo has none. */
export async function fetchReadme(fullName: string, options: GitHubClientOptions): Promise<string> {
  const response = await (options.fetchImpl ?? fetch)(`${API}/repos/${fullName}/readme`, {
    headers: {
      Accept: "application/vnd.github.raw",
      "User-Agent": "project-showcase",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
  });
  if (response.status === 404) return "";
  if (!response.ok) throw new GitHubError(`GitHub ${response.status} README ${fullName}`, response.status);
  return response.text();
}
