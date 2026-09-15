export function isTrustedRequestOrigin(input: {
  origin: string | null;
  requestUrl: string;
  forwardedHost: string | null;
  host: string | null;
  forwardedProto: string | null;
  configuredAppUrl?: string;
}) {
  if (!input.origin) return false;
  const allowed = new Set<string>();

  if (input.configuredAppUrl) {
    try { allowed.add(new URL(input.configuredAppUrl).origin); } catch { /* invalid config is not trusted */ }
  }

  const host = input.forwardedHost?.split(",")[0]?.trim() || input.host?.trim();
  if (host && !/[\s/@\\]/.test(host)) {
    const requestProtocol = new URL(input.requestUrl).protocol.replace(":", "");
    const protocol = input.forwardedProto?.split(",")[0]?.trim() || requestProtocol;
    if (protocol === "https" || protocol === "http") allowed.add(`${protocol}://${host}`);
  }

  try { return allowed.has(new URL(input.origin).origin); } catch { return false; }
}
