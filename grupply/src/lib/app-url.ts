import { headers } from "next/headers";

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export async function getAppOrigin() {
  const explicitUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicitUrl) {
    return trimTrailingSlash(explicitUrl);
  }

  const headerStore = await headers();
  const forwardedHost = headerStore.get("x-forwarded-host");
  const forwardedProto = headerStore.get("x-forwarded-proto");
  const host = forwardedHost ?? headerStore.get("host");

  if (host) {
    const protocol =
      forwardedProto ??
      (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
    return `${protocol}://${host}`;
  }

  return "http://localhost:3000";
}
