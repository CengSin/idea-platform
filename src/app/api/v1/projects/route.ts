import { NextResponse } from "next/server";
import { displayPitch, lastActivityAt, projectStatus, publicSections } from "@/lib/projects";
import { readShowcase } from "@/lib/store";
import type { Project } from "@/lib/types";

export const revalidate = 600;

/** Public, read-only feed of what the home page shows (for the personal site and others). */
export async function GET() {
  const showcase = await readShowcase();
  const { featured, building, others } = publicSections(showcase);
  const shape = (project: Project) => ({
    name: project.name,
    repo: project.fullName,
    url: project.url,
    homepage: project.homepage ?? null,
    pitch: displayPitch(project),
    language: project.language ?? null,
    stars: project.stars,
    status: projectStatus(project),
    last_activity_at: lastActivityAt(project),
    commits_30d: project.activity?.commits30d ?? 0,
    weekly_commits: project.activity?.weekly ?? [],
    imagination: project.curation ? { score: project.curation.score, reason: project.curation.reason } : null,
  });
  return NextResponse.json(
    {
      owner: showcase.owner ? { login: showcase.owner.login, name: showcase.owner.name, url: showcase.owner.url } : null,
      synced_at: showcase.syncedAt ?? null,
      featured: featured.map(shape),
      building: building.map(shape),
      others: others.map(shape),
    },
    { headers: { "Access-Control-Allow-Origin": "*" } },
  );
}
