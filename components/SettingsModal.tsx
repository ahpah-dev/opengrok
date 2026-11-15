"use client";
import type { ReactNode } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { DEFAULT_PROMPT } from "@/lib/defaults";
import { uid } from "@/lib/client";
import type { Chat, Provider, Settings } from "@/lib/types";

const inp = "w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-mut";

const Section = ({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) => (
  <section className="border-b border-line px-6 py-5 last:border-0">
    <h3 className="font-semibold">{title}</h3>
    {hint && <p className="mb-3 mt-0.5 text-sm text-mut">{hint}</p>}
    {children}
  </section>
);

export function SettingsModal({ s, chats, patch, onClose, onClear }: {
  s: Settings;
  chats: Chat[];
  patch: (p: Partial<Settings>) => void;
  onClose: () => void;
  onClear: () => void;
}) {
  const upd = (id: string, p: Partial<Provider>) => patch({ providers: s.providers.map((x) => (x.id === id ? { ...x, ...p } : x)) });
  const remove = (id: string) => patch({ providers: s.providers.filter((x) => x.id !== id), active: s.active?.providerId === id ? null : s.active });

  const exportChats = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(chats, null, 2)], { type: "application/json" }));
    a.download = "opengrok-chats.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 hover:bg-hover"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto">
          <Section title="Models" hint="Keys are stored in this browser only and sent to the provider you pick, via your local server. Local servers need no key.">
            <div className="space-y-3">
              {s.providers.map((p) => (
                <div key={p.id} className="rounded-xl border border-line p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <input className={inp + " font-medium"} value={p.name} onChange={(e) => upd(p.id, { name: e.target.value })} />
                    <select className={inp + " w-auto"} value={p.kind} onChange={(e) => upd(p.id, { kind: e.target.value as Provider["kind"] })}>
                      <option value="openai">OpenAI-compatible</option>
                      <option value="anthropic">Anthropic</option>
                    </select>
                    <button onClick={() => remove(p.id)} title="Remove" className="rounded-lg p-2 text-mut hover:bg-hover hover:text-fg"><Trash2 size={16} /></button>
                  </div>
                  <input className={inp + " mb-2"} value={p.baseUrl} placeholder="Base URL" onChange={(e) => upd(p.id, { baseUrl: e.target.value })} />
                  <div className="flex items-center gap-3">
                    <input className={inp} type="password" autoComplete="off" value={p.apiKey} placeholder={p.local ? "API key (optional)" : "API key"} onChange={(e) => upd(p.id, { apiKey: e.target.value })} />
                    <label className="flex shrink-0 items-center gap-1.5 text-sm text-mut">
                      <input type="checkbox" checked={!!p.local} onChange={(e) => upd(p.id, { local: e.target.checked })} /> No key needed
                    </label>
                  </div>
                </div>
              ))}
              <button
                onClick={() => patch({ providers: [...s.providers, { id: uid(), name: "Custom", kind: "openai", baseUrl: "http://localhost:8000/v1", apiKey: "", local: true }] })}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm hover:bg-hover"
              ><Plus size={16} /> Add provider</button>
            </div>
          </Section>

          <Section title="Personality" hint="The system prompt. Default is the Grok-style persona.">
            <textarea className={inp + " h-56 font-mono text-xs leading-relaxed"} value={s.systemPrompt} onChange={(e) => patch({ systemPrompt: e.target.value })} />
            <button onClick={() => patch({ systemPrompt: DEFAULT_PROMPT })} className="mt-2 text-sm text-mut underline underline-offset-2 hover:text-fg">Reset to default</button>
          </Section>

          <Section title="Memory" hint="Facts about you, added to every chat. One per line.">
            <textarea className={inp + " h-28"} value={s.memory} placeholder="I'm a backend dev. I prefer Rust. Metric units." onChange={(e) => patch({ memory: e.target.value })} />
          </Section>

          <Section title="Context" hint="Max characters of chat history sent per request (about 4 per token). Older messages are dropped first.">
            <input className={inp + " w-40"} type="number" min={2000} step={2000} value={s.contextChars} onChange={(e) => patch({ contextChars: Math.max(2000, +e.target.value || 60000) })} />
          </Section>

          <Section title="Data" hint={`${chats.length} chats stored in this browser.`}>
            <div className="flex gap-2">
              <button onClick={exportChats} className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-hover">Export chats</button>
              <button onClick={() => confirm("Delete ALL chats? This can't be undone.") && onClear()} className="rounded-lg border border-line px-3 py-1.5 text-sm text-red-600 hover:bg-hover dark:text-red-400">Delete all chats</button>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
