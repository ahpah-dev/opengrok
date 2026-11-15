import { friendly, headersFor, parseBase } from "@/lib/upstream";
import { research, sourcesBlock, type SearchCfg } from "@/lib/search";
import type { Kind } from "@/lib/types";

// Local proxy: browser -> here -> provider. Avoids CORS; keys never leave your machine except to the provider you chose.
// Streams NDJSON lines: {"t":"text"|"think"|"status"|"sources"|"error","d":string}

type Body = {
  kind: Kind;
  baseUrl: string;
  apiKey?: string;
  model: string;
  system: string;
  messages: { role: string; content: string }[];
  search?: SearchCfg & { query: string };
};

const enc = new TextEncoder();
const line = (t: string, d: string) => enc.encode(JSON.stringify({ t, d }) + "\n");

async function* sse(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n")) >= 0) {
      const l = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (l.startsWith("data:")) yield l.slice(5).trim();
    }
  }
}

export async function POST(req: Request) {
  let b: Body, base: string;
  try {
    b = await req.json();
    base = parseBase(b.baseUrl);
    if (!b.model || !Array.isArray(b.messages)) throw new Error("model and messages required");
  } catch (e) {
    return Response.json({ error: String((e as Error).message) }, { status: 400 });
  }

  const anth = b.kind === "anthropic";
  const url = anth ? `${base}/v1/messages` : `${base}/chat/completions`;

  const stream = new ReadableStream({
    async start(ctrl) {
      try {
        let system = b.system;
        const q = b.search?.query?.trim().slice(0, 300);
        if (b.search && q) {
          ctrl.enqueue(line("status", `Searching the web for “${q.slice(0, 80)}”`));
          try {
            const hits = await research(q, b.search, req.signal);
            ctrl.enqueue(line("sources", JSON.stringify(hits.map(({ title, url, snippet }) => ({ title, url, snippet })))));
            system += sourcesBlock(q, hits);
          } catch (e) {
            if (req.signal.aborted) return;
            ctrl.enqueue(line("error", `Search failed: ${(e as Error).message}. Answering without it.`));
            system += "\n\nA web search was attempted but failed. Tell the user you could not search, and answer from your own knowledge if you can.";
          }
          ctrl.enqueue(line("status", ""));
        }

        const payload = anth
          ? { model: b.model, max_tokens: 8192, system, messages: b.messages, stream: true }
          : { model: b.model, messages: [{ role: "system", content: system }, ...b.messages], stream: true };
        const r = await fetch(url, {
          method: "POST",
          headers: headersFor(b.kind, b.apiKey),
          body: JSON.stringify(payload),
          signal: req.signal,
        });
        if (!r.ok || !r.body) {
          ctrl.enqueue(line("error", `${r.status} ${r.statusText}: ${(await r.text()).slice(0, 600)}`));
          return;
        }
        for await (const data of sse(r.body)) {
          if (data === "[DONE]") break;
          let j;
          try { j = JSON.parse(data); } catch { continue; }
          if (anth) {
            if (j.type === "error") ctrl.enqueue(line("error", j.error?.message ?? "Anthropic error"));
            else if (j.type === "content_block_delta") {
              if (j.delta?.text) ctrl.enqueue(line("text", j.delta.text));
              if (j.delta?.thinking) ctrl.enqueue(line("think", j.delta.thinking));
            }
          } else {
            const d = j.choices?.[0]?.delta;
            const think = d?.reasoning_content ?? d?.reasoning; // DeepSeek/xAI/Ollama/OpenRouter
            if (think) ctrl.enqueue(line("think", think));
            if (d?.content) ctrl.enqueue(line("text", d.content));
            if (j.error) ctrl.enqueue(line("error", j.error.message ?? JSON.stringify(j.error)));
          }
        }
      } catch (e) {
        if (!req.signal.aborted) ctrl.enqueue(line("error", friendly(e, base)));
      } finally {
        try { ctrl.close(); } catch {} // already closed if the client aborted
      }
    },
  });

  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
  });
}
