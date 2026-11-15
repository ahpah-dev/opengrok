import { friendly, headersFor, parseBase } from "@/lib/upstream";

export async function POST(req: Request) {
  let base: string;
  const { kind, baseUrl, apiKey } = await req.json().catch(() => ({}));
  try {
    base = parseBase(baseUrl);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
  const url = kind === "anthropic" ? `${base}/v1/models?limit=1000` : `${base}/models`;
  try {
    const r = await fetch(url, { headers: headersFor(kind, apiKey), signal: AbortSignal.timeout(8000) });
    if (!r.ok) return Response.json({ error: `${r.status} ${r.statusText}` });
    const j = await r.json();
    const list: { id?: string; name?: string }[] = j.data ?? j.models ?? [];
    const models = list.map((m) => String(m.id ?? m.name).replace(/^models\//, "")).sort();
    return Response.json({ models });
  } catch (e) {
    return Response.json({ error: friendly(e, base) });
  }
}
