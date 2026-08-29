import { dataExportToken } from "@/lib/data-backend";
import { exportDataDump } from "@/lib/json-store";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: Request) {
  const expected = dataExportToken();
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  const bearer = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : "";
  const query = new URL(req.url).searchParams.get("token") ?? "";
  return bearer === expected || query === expected;
}

export async function GET(req: Request) {
  if (!dataExportToken()) {
    return NextResponse.json(
      { error: "DATA_EXPORT_TOKEN is not configured" },
      { status: 503 },
    );
  }
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const dump = await exportDataDump();
    return NextResponse.json(dump);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "export failed" },
      { status: 500 },
    );
  }
}
