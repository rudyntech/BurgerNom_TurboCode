import { NextResponse } from "next/server";
import { runMbcSync } from "@/lib/mbc/importer";
import { isAuthorizedSyncRequest } from "@/lib/mbc/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Manual sync trigger for local development/testing, e.g.:
 *
 *   curl -X POST http://localhost:3000/api/admin/sync \
 *     -H "Authorization: Bearer $CRON_SECRET"
 *
 * Requires the same CRON_SECRET bearer token as the scheduled cron route so
 * ordinary signed-in users cannot trigger a privileged, unrate-limited fetch
 * of an external URL from the server.
 */
export async function POST(request: Request) {
  if (!isAuthorizedSyncRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runMbcSync("manual");
  const httpStatus = result.status === "failure" ? 502 : 200;
  return NextResponse.json(result, { status: httpStatus });
}
