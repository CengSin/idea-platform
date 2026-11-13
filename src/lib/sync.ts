import { fetchGitHubListing, type GitHubClientOptions } from "./github.ts";
import { mergeRepos } from "./projects.ts";
import { mutateShowcase } from "./store.ts";

export interface SyncSummary {
  total: number;
  added: number;
  removed: number;
  syncedAt: string;
}

/** Pull repositories from GitHub and fold them into the store. */
export async function syncFromGitHub(
  options: GitHubClientOptions & { login?: string } = {},
): Promise<SyncSummary> {
  const token = options.token ?? (process.env.GITHUB_TOKEN?.trim() || undefined);
  const login = options.login ?? (process.env.GITHUB_USER?.trim() || undefined);
  const listing = await fetchGitHubListing({ ...options, token, login });
  const syncedAt = new Date().toISOString();
  let added = 0;
  let removed = 0;
  await mutateShowcase((doc) => {
    const known = new Set(doc.projects.map((project) => project.id));
    const projects = mergeRepos(doc.projects, listing.repos, listing.activity, syncedAt);
    added = listing.repos.filter((repo) => !known.has(repo.id)).length;
    removed = projects.filter((project) => project.removedAt === syncedAt).length;
    return { ...doc, owner: listing.owner, projects, syncedAt };
  });
  return { total: listing.repos.length, added, removed, syncedAt };
}
