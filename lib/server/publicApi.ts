import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import { NextResponse } from "next/server";

type Bucket = {
  count: number;
  resetAt: number;
};

const requestBuckets = new Map<string, Bucket>();

export function getClientIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const firstForwardedIp = forwardedFor?.split(",")[0]?.trim();

  return (
    firstForwardedIp ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("true-client-ip") ||
    "unknown"
  );
}

export function applyRateLimit(
  req: Request,
  scope: string,
  options: { limit: number; windowMs: number },
) {
  const now = Date.now();
  const key = `${scope}:${getClientIp(req)}`;
  const current = requestBuckets.get(key);

  if (!current || current.resetAt <= now) {
    const resetAt = now + options.windowMs;
    requestBuckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: options.limit - 1, resetAt };
  }

  if (current.count >= options.limit) {
    return { allowed: false, remaining: 0, resetAt: current.resetAt };
  }

  current.count += 1;
  return { allowed: true, remaining: options.limit - current.count, resetAt: current.resetAt };
}

export function rateLimitResponse(message = "Too many requests") {
  return NextResponse.json({ error: message, code: "rate_limited" }, { status: 429 });
}

export function isPublicUrlError(error: unknown) {
  return error instanceof Error && (error.message === "invalid_url" || error.message === "blocked_url");
}

function isPrivateIPv4(ip: string) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }

  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

function isPrivateIPv6(ip: string) {
  const lower = ip.toLowerCase();
  return (
    lower === "::1" ||
    lower === "::" ||
    lower.startsWith("fc") ||
    lower.startsWith("fd") ||
    lower.startsWith("fe80:") ||
    lower.startsWith("::ffff:127.") ||
    lower.startsWith("::ffff:10.") ||
    lower.startsWith("::ffff:192.168.")
  );
}

function isBlockedIp(ip: string) {
  const version = isIP(ip);
  if (version === 4) return isPrivateIPv4(ip);
  if (version === 6) return isPrivateIPv6(ip);
  return true;
}

export async function assertPublicHttpUrl(value: unknown) {
  if (typeof value !== "string") throw new Error("invalid_url");

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("invalid_url");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("invalid_url");
  if (url.username || url.password) throw new Error("invalid_url");

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    !hostname ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new Error("blocked_url");
  }

  if (isIP(hostname)) {
    if (isBlockedIp(hostname)) throw new Error("blocked_url");
    return url.toString();
  }

  let records: Array<{ address: string; family: number }>;
  try {
    records = await lookup(hostname, { all: true, verbatim: false });
  } catch {
    throw new Error("blocked_url");
  }
  if (records.length === 0 || records.some((record) => isBlockedIp(record.address))) {
    throw new Error("blocked_url");
  }

  return url.toString();
}
