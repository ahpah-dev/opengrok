"use client";
import { useState, type ReactNode } from "react";
import { Folder, Monitor, Moon, Pencil, Search, Settings as Cog, SquarePen, Sun, Trash2 } from "lucide-react";
import { Logo } from "./Logo";
import { group } from "@/lib/client";
import type { Chat, Settings } from "@/lib/types";

type Theme = Settings["theme"];
const NEXT: Record<Theme, Theme> = { system: "dark", dark: "light", light: "system" };
const THEME_ICON = { system: <Monitor size={20} />, dark: <Moon size={20} />, light: <Sun size={20} /> };

export function Sidebar(p: {
  chats: Chat[];
  activeId: string | null;
  open: boolean;
  theme: Theme;
  setOpen: (v: boolean) => void;
  onNew: () => void;
  onProjects: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onSettings: () => void;
  onTheme: (t: Theme) => void;
}) {
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState("");
  const { open } = p;

  const row = (icon: ReactNode, label: string, onClick: () => void) => (
    <button onClick={onClick} title={label} className="flex h-10 w-full shrink-0 items-center gap-3 rounded-xl px-2.5 text-sm hover:bg-hover">
      {icon}
      {open && <span className="truncate">{label}</span>}
    </button>
  );

  const ql = q.toLowerCase();
  const shown = ql ? p.chats.filter((c) => c.title.toLowerCase().includes(ql) || c.messages.some((m) => m.content.toLowerCase().includes(ql))) : p.chats;
  const select = (id: string) => { p.onSelect(id); if (innerWidth < 768) p.setOpen(false); };

  return (
    <>
      {open && <div className="fixed inset-0 z-20 bg-black/40 md:hidden" onClick={() => p.setOpen(false)} />}
      <aside className={`z-30 flex shrink-0 flex-col gap-1 border-r border-line bg-bg p-2 transition-[width] max-md:fixed max-md:inset-y-0 max-md:left-0 ${open ? "w-[272px]" : "w-14 max-md:hidden"}`}>
        {row(<Logo size={20} />, "OpenGrok", () => p.setOpen(!open))}
        {row(<SquarePen size={20} />, "New chat", () => { p.onNew(); if (innerWidth < 768) p.setOpen(false); })}
        {row(<Search size={20} />, "Search", () => { p.setOpen(true); setSearching(true); })}
        {row(<Folder size={20} />, "Projects", () => { p.onProjects(); if (innerWidth < 768) p.setOpen(false); })}
        {open && searching && (
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onBlur={() => !q && setSearching(false)}
            placeholder="Search chats…"
            className="mx-1 mb-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm outline-none"
          />
        )}
        <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
          {open && group(shown).map(([label, items]) => (
            <div key={label} className="mb-3">
              <div className="px-3 pb-1 text-xs text-mut">{label}</div>
              {items.map((c) => (
                <div key={c.id} className={`group flex items-center rounded-xl hover:bg-hover ${c.id === p.activeId ? "bg-hover" : ""}`}>
                  <button onClick={() => select(c.id)} className="min-w-0 flex-1 truncate px-3 py-2 text-left text-sm">{c.title}</button>
                  <button
                    title="Rename"
                    onClick={() => { const t = prompt("Rename chat", c.title); if (t?.trim()) p.onRename(c.id, t.trim()); }}
                    className="hidden p-1.5 text-mut hover:text-fg group-hover:block"
                  ><Pencil size={14} /></button>
                  <button
                    title="Delete"
                    onClick={() => confirm("Delete this chat?") && p.onDelete(c.id)}
                    className="mr-1 hidden p-1.5 text-mut hover:text-fg group-hover:block"
                  ><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          ))}
          {open && shown.length === 0 && <div className="px-3 text-sm text-mut">{q ? "No matches" : "No chats yet"}</div>}
        </div>
        {row(THEME_ICON[p.theme], `Theme: ${p.theme}`, () => p.onTheme(NEXT[p.theme]))}
        {row(<Cog size={20} />, "Settings", p.onSettings)}
      </aside>
    </>
  );
}
