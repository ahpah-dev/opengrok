import { useEffect, useState } from "react";
import type { Chat, Msg, Project, Provider, Settings } from "./types";

export const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// localStorage-backed state. Client-only (the app is loaded with ssr:false).
// shortcut: debounced 400ms write, so closing the tab mid-stream can lose the last tokens; upgrade to IndexedDB if chats get huge.
export function usePersisted<T>(key: string, init: T) {
  const [v, setV] = useState<T>(() => {
    try {
      const s = localStorage.getItem(key);
      if (s) {
        const j = JSON.parse(s);
        return (Array.isArray(init) ? j : { ...(init as object), ...j }) as T;
      }
    } catch {}
    return init;
  });
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [key, v]);
  return [v, setV] as const;
}

// Split reasoning out of a message: API-level `thinking` plus inline <think>…</think> (DeepSeek-R1 style local models).
export function parse(m: Msg) {
  let think = m.thinking ?? "";
  let open = false;
  const text = m.content.replace(/<think>([\s\S]*?)(<\/think>|$)/g, (_, t: string, close: string) => {
    think += (think ? "\n" : "") + t;
    if (!close) open = true;
    return "";
  });
  return { think: think.trim(), text: text.trimStart(), open };
}

const FENCE = "```";
const fenced = (f: { name: string; text: string }) => `${FENCE}${f.name}\n${f.text}\n${FENCE}`;

export function buildSystem(s: Settings, project?: Project) {
  return (
    `${s.systemPrompt}\n\nCurrent date: ${new Date().toDateString()}.` +
    (s.memory.trim() ? `\n\nThings the user asked you to remember:\n${s.memory.trim()}` : "") +
    (project
      ? `\n\nThis chat is inside the project "${project.name}". Follow its instructions:\n${project.instructions.trim() || "(none)"}` +
        (project.files.length ? `\n\nProject reference files:\n\n${project.files.map(fenced).join("\n\n")}` : "")
      : "")
  );
}

// Read text files picked by the user (size-capped; rejects binaries).
export async function readTextFiles(list: FileList | null) {
  const out: { name: string; text: string }[] = [];
  for (const f of Array.from(list ?? [])) {
    if (f.size > 200_000) { alert(`${f.name} is over 200 KB. Attach small text files only.`); continue; }
    const text = await f.text();
    if (text.includes("\u0000")) { alert(`${f.name} looks binary; only text files are supported.`); continue; }
    out.push({ name: f.name, text });
  }
  return out;
}

// Newest-first char budget; always keeps the latest message, never starts on an assistant turn.
export function history(msgs: Msg[], max: number) {
  const out: Msg[] = [];
  let n = 0;
  for (let i = msgs.length - 1; i >= 0; i--) {
    n += msgs[i].content.length;
    if (n > max && out.length) break;
    out.unshift(msgs[i]);
  }
  while (out[0]?.role === "assistant") out.shift();
  return out
    .map((m) => {
      if (m.role === "assistant") return { role: m.role, content: parse(m).text };
      const files = (m.files ?? []).map(fenced).join("\n\n");
      return { role: m.role, content: files ? `${files}\n\n${m.content}` : m.content };
    })
    .filter((m) => m.content.trim());
}

export async function streamChat(
  p: Provider,
  body: {
    model: string;
    system: string;
    messages: { role: string; content: string }[];
    search?: { engine: string; url: string; key: string; query: string };
  },
  signal: AbortSignal,
  on: (e: { t: "text" | "think" | "status" | "sources" | "error"; d: string }) => void,
) {
  const r = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind: p.kind, baseUrl: p.baseUrl, apiKey: p.apiKey, ...body }),
    signal,
  });
  if (!r.ok || !r.body) throw new Error((await r.json().catch(() => null))?.error ?? `HTTP ${r.status}`);
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n")) >= 0) {
      const l = buf.slice(0, i);
      buf = buf.slice(i + 1);
      if (l) on(JSON.parse(l));
    }
  }
}

export async function fetchModels(p: Provider): Promise<{ models?: string[]; error?: string }> {
  const r = await fetch("/api/models", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind: p.kind, baseUrl: p.baseUrl, apiKey: p.apiKey }),
  });
  return r.json();
}

export function group(chats: Chat[]) {
  const day = 864e5;
  const start = new Date().setHours(0, 0, 0, 0);
  const g: Record<string, Chat[]> = {};
  for (const c of [...chats].sort((a, b) => b.updated - a.updated)) {
    const k = c.updated >= start ? "Today" : c.updated >= start - day ? "Yesterday" : c.updated >= start - 7 * day ? "Previous 7 days" : "Older";
    (g[k] ??= []).push(c);
  }
  return Object.entries(g);
}
