"use client";
import { useRef, useState, type ReactNode } from "react";
import { FileText, FolderPlus, Pencil, Plus, Trash2, X } from "lucide-react";
import { readTextFiles } from "@/lib/client";
import type { Chat, Project } from "@/lib/types";

const inp = "w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-mut";

export function ProjectsList({ projects, chats, onOpen, onNew }: {
  projects: Project[];
  chats: Chat[];
  onOpen: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 pb-10 pt-16">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[28px] font-[525] tracking-tight">Projects</h1>
        <button onClick={onNew} className="flex items-center gap-1.5 rounded-full bg-fg px-4 py-2 text-sm font-medium text-bg"><FolderPlus size={16} /> New project</button>
      </div>
      {projects.length === 0 ? (
        <p className="text-mut">Projects keep related chats together with shared instructions and reference files.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {[...projects].sort((a, b) => b.updated - a.updated).map((p) => (
            <button key={p.id} onClick={() => onOpen(p.id)} className="rounded-2xl border border-line bg-surface p-4 text-left hover:bg-hover">
              <div className="font-medium">{p.name}</div>
              <div className="mt-1 line-clamp-2 text-sm text-mut">{p.instructions || "No instructions"}</div>
              <div className="mt-3 text-xs text-mut">{chats.filter((c) => c.projectId === p.id).length} chats · {p.files.length} files</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProjectPage({ project, chats, composer, onEdit, onSelect }: {
  project: Project;
  chats: Chat[];
  composer: ReactNode;
  onEdit: () => void;
  onSelect: (id: string) => void;
}) {
  const mine = chats.filter((c) => c.projectId === project.id).sort((a, b) => b.updated - a.updated);
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-y-auto px-4 pb-10 pt-16">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h1 className="truncate text-[28px] font-[525] tracking-tight">{project.name}</h1>
        <button onClick={onEdit} className="flex shrink-0 items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm hover:bg-hover"><Pencil size={14} /> Edit</button>
      </div>
      <p className="mb-5 line-clamp-2 text-sm text-mut">{project.instructions || "No instructions yet."}{project.files.length > 0 && ` · ${project.files.length} files`}</p>
      {composer}
      <div className="mt-6">
        {mine.map((c) => (
          <button key={c.id} onClick={() => onSelect(c.id)} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left hover:bg-hover">
            <span className="truncate">{c.title}</span>
            <span className="ml-3 shrink-0 text-xs text-mut">{new Date(c.updated).toLocaleDateString()}</span>
          </button>
        ))}
        {mine.length === 0 && <p className="px-3 text-sm text-mut">No chats in this project yet. Ask something above.</p>}
      </div>
    </div>
  );
}

export function ProjectEditor({ initial, onSave, onDelete, onClose }: {
  initial: Project | null; // null = new
  onSave: (p: Pick<Project, "name" | "instructions" | "files">) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [instructions, setInstructions] = useState(initial?.instructions ?? "");
  const [files, setFiles] = useState(initial?.files ?? []);
  const pick = useRef<HTMLInputElement>(null);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-lg font-semibold">{initial ? "Edit project" : "New project"}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 hover:bg-hover"><X size={18} /></button>
        </div>
        <div className="space-y-5 overflow-y-auto px-6 py-5">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Name</span>
            <input autoFocus className={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Home server rebuild" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Instructions</span>
            <span className="mb-1.5 block text-sm text-mut">Added to the system prompt of every chat in this project.</span>
            <textarea className={inp + " h-36"} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Answer as a senior sysadmin. Prefer Debian. Be terse." />
          </label>
          <div>
            <span className="mb-1 block text-sm font-medium">Reference files</span>
            <span className="mb-2 block text-sm text-mut">Text files (200 KB each) the model sees in every chat here. They count toward the context window.</span>
            <div className="flex flex-wrap gap-1.5">
              {files.map((f, i) => (
                <span key={i} className="flex items-center gap-1.5 rounded-xl bg-hover px-2.5 py-1 text-xs">
                  <FileText size={13} /> {f.name}
                  <button onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label="Remove"><X size={12} /></button>
                </span>
              ))}
              <button onClick={() => pick.current?.click()} className="flex items-center gap-1 rounded-xl border border-line px-2.5 py-1 text-xs hover:bg-hover"><Plus size={13} /> Add files</button>
              <input ref={pick} type="file" multiple hidden onChange={async (e) => { const a = await readTextFiles(e.target.files); setFiles((fs) => [...fs, ...a]); e.target.value = ""; }} />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-line px-6 py-4">
          {onDelete ? (
            <button onClick={() => confirm("Delete this project? Its chats are kept.") && onDelete()} className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400"><Trash2 size={15} /> Delete</button>
          ) : <span />}
          <button
            disabled={!name.trim()}
            onClick={() => onSave({ name: name.trim(), instructions, files })}
            className="rounded-full bg-fg px-5 py-2 text-sm font-medium text-bg disabled:opacity-40"
          >Save</button>
        </div>
      </div>
    </div>
  );
}
