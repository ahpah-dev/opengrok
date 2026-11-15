// Server-side helpers shared by the API routes.
import type { Kind } from "./types";

export function parseBase(raw: unknown): string {
  const u = new URL(String(raw));
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("baseUrl must be http(s)");
  return u.toString().replace(/\/+$/, "");
}

export function headersFor(kind: Kind, apiKey?: string): Record<string, string> {
  const h: Record<string, string> = { "content-type": "application/json" };
  if (kind === "anthropic") {
    h["x-api-key"] = apiKey ?? "";
    h["anthropic-version"] = "2023-06-01";
  } else if (apiKey) h.authorization = `Bearer ${apiKey}`;
  return h;
}

export function friendly(e: unknown, base: string): string {
  const err = e as { message?: string; cause?: { code?: string } };
  return err.cause?.code === "ECONNREFUSED" ? `Can't reach ${base}. Is it running?` : err.message ?? String(e);
}
