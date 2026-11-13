import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { syncFromGitHub } from "@/lib/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(header: string | null) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || !header) return false;
  const a = crypto.createHash("sha256").update(header).digest();
  const b = crypto.createHash("sha256").update(`Bearer ${secret}`).digest();
  return crypto.timingSafeEqual(a, b);
}

/** Daily GitHub sync, called by Vercel Cron with `Authorization: Bearer $CRON_SECRET`. */
export async function GET(request: Request) {
  if (!authorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const summary = await syncFromGitHub();
    revalidatePath("/");
    revalidatePath("/admin");
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "sync failed" },
      { status: 502 },
    );
  }
}
