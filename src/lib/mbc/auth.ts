import "server-only";

/** True if the request carries a valid `Authorization: Bearer <CRON_SECRET>` header. */
export function isAuthorizedSyncRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}
