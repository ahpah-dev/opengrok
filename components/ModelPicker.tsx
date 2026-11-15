"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { fetchModels } from "@/lib/client";
import type { ModelRef, Provider } from "@/lib/types";

type Entry = { models?: string[]; error?: string };
const usable = (p: Provider) => p.local || !!p.apiKey;

export function ModelPicker({ providers, active, onPick, open, setOpen, up }: {
  providers: Provider[];
  active: ModelRef | null;
  onPick: (m: ModelRef) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  up: boolean;
}) {
  const [data, setData] = useState<Record<string, Entry>>({});
  const [q, setQ] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    for (const p of providers.filter(usable)) {
      fetchModels(p).then((r) => setData((d) => ({ ...d, [p.id]: r }))).catch((e) => setData((d) => ({ ...d, [p.id]: { error: String(e) } })));
    }
    const off = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", off);
    return () => document.removeEventListener("mousedown", off);
  }, [open, providers, setOpen]);

  const pick = (providerId: string, model: string) => { onPick({ providerId, model }); setOpen(false); setQ(""); };
  const ql = q.trim().toLowerCase();

  return (
    <div ref={box} className="relative">
      <button onClick={() => setOpen(!open)} className="flex h-8 items-center gap-1 rounded-lg px-2 text-sm font-medium hover:bg-hover">
        <span className="max-w-[160px] truncate">{active?.model || "Select model"}</span>
        <ChevronDown size={14} className="text-mut" />
      </button>
      {open && (
        <div className={`absolute right-0 z-40 w-80 overflow-hidden rounded-2xl border border-line bg-surface shadow-xl ${up ? "bottom-full mb-2" : "top-full mt-2"}`}>
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search or type a model id…"
            className="w-full border-b border-line bg-transparent px-4 py-3 text-sm outline-none"
          />
          <div className="max-h-80 overflow-y-auto p-1.5">
            {providers.map((p) => {
              const d = data[p.id];
              const list = (d?.models ?? []).filter((m) => m.toLowerCase().includes(ql));
              return (
                <div key={p.id} className="mb-1">
                  <div className="px-3 pb-1 pt-2 text-xs font-medium text-mut">{p.name}</div>
                  {!usable(p) ? (
                    <div className="px-3 py-1 text-xs text-mut">Add an API key in Settings</div>
                  ) : !d ? (
                    <div className="px-3 py-1 text-xs text-mut">Loading…</div>
                  ) : d.error ? (
                    <div className="px-3 py-1 text-xs text-mut">{d.error}</div>
                  ) : null}
                  {list.slice(0, 60).map((m) => (
                    <button key={m} onClick={() => pick(p.id, m)} className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-sm hover:bg-hover">
                      <span className="truncate">{m}</span>
                      {active?.providerId === p.id && active.model === m && <Check size={14} />}
                    </button>
                  ))}
                  {usable(p) && ql && !d?.models?.includes(q.trim()) && (
                    <button onClick={() => pick(p.id, q.trim())} className="w-full rounded-lg px-3 py-1.5 text-left text-sm text-mut hover:bg-hover">
                      Use “{q.trim()}” on {p.name}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
