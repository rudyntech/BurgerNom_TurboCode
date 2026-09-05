import { NextResponse } from "next/server";
import { runMbcSync } from "@/lib/mbc/importer";
import { isAuthorizedSyncRequest } from "@/lib/mbc/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily scheduled sync, invoked by Vercel Cron (see vercel.json). Vercel
 * automatically sends `Authorization: Bearer $CRON_SECRET` when CRON_SECRET
 * is set as a project environment variable, which we verify here so this
 * cannot be triggered by arbitrary callers.
 */
export async function GET(request: Request) {
  if (!isAuthorizedSyncRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runMbcSync("cron");
  const httpStatus = result.status === "failure" ? 502 : 200;
  return NextResponse.json(result, { status: httpStatus });
}
