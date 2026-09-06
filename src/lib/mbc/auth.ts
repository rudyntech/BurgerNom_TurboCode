import "server-only";

export function isAuthorizedSyncRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  const authorized = Boolean(secret) && header === `Bearer ${secret}`;

  console.log("BurgerNom sync authorization", {
    secretConfigured: Boolean(secret),
    authorizationHeaderPresent: Boolean(header),
    bearerPrefixCorrect: header?.startsWith("Bearer ") ?? false,
    authorized,
  });

  return authorized;
}