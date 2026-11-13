import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { applyCurations, sanitizeCurationResults } from "@/lib/projects";
import { checkBearer } from "@/lib/session";
import { mutateShowcase, readShowcase } from "@/lib/store";
import { syncFromGitHub } from "@/lib/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Owner-only access for `npm run curate` when it runs against the live site
 * (SHOWCASE_URL), so the laptop never needs the database credentials.
 * Auth: `Authorization: Bearer $ADMIN_PASSWORD`.
 */
function unauthorized(request: Request) {
  if (checkBearer(request.headers.get("authorization"))) return null;
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

const noStore = { "cache-control": "no-store" };

/** Full showcase, private projects and notes included. `?sync=1` pulls GitHub first. */
export async function GET(request: Request) {
  const denied = unauthorized(request);
  if (denied) return denied;
  try {
    const sync = new URL(request.url).searchParams.get("sync") === "1" ? await syncFromGitHub() : undefined;
    if (sync) {
      revalidatePath("/");
      revalidatePath("/admin");
    }
    return NextResponse.json({ sync, showcase: await readShowcase() }, { headers: noStore });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "failed" }, { status: 502 });
  }
}

/** Body: `{ curations: [{ repo, score, pitch, reason, basedOnPushedAt? }] }`. */
export async function POST(request: Request) {
  const denied = unauthorized(request);
  if (denied) return denied;
  let results;
  try {
    results = sanitizeCurationResults(((await request.json()) as { curations?: unknown }).curations);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "bad request" }, { status: 400 });
  }
  const curatedAt = new Date().toISOString();
  await mutateShowcase((doc) => ({ ...doc, projects: applyCurations(doc.projects, results, curatedAt), curatedAt }));
  revalidatePath("/");
  revalidatePath("/admin");
  return NextResponse.json({ saved: results.length, curatedAt }, { headers: noStore });
}
