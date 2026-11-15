"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUp, FileText, Plus, Square, X } from "lucide-react";
import type { Msg } from "@/lib/types";

const MAX_FILE = 200_000;

export function Composer({ busy, onSend, onStop, picker, placeholder = "What do you want to know?", autoFocus }: {
  busy: boolean;
  onSend: (text: string, files: Msg["files"]) => void;
  onStop: () => void;
  picker: ReactNode;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<NonNullable<Msg["files"]>>([]);
  const ta = useRef<HTMLTextAreaElement>(null);
  const pickFile = useRef<HTMLInputElement>(null);
  const can = !busy && (text.trim() || files.length > 0);

  useEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 220) + "px";
  }, [text]);

  const submit = () => {
    if (!can) return;
    onSend(text.trim(), files.length ? files : undefined);
    setText("");
    setFiles([]);
  };

  async function attach(list: FileList | null) {
    for (const f of Array.from(list ?? [])) {
      if (f.size > MAX_FILE) { alert(`${f.name} is over 200 KB. Attach text files only, and keep them small.`); continue; }
      const t = await f.text();
      if (t.includes("\0")) { alert(`${f.name} looks binary; only text files are supported.`); continue; }
      setFiles((fs) => [...fs, { name: f.name, text: t }]);
    }
    if (pickFile.current) pickFile.current.value = "";
  }

  return (
    <div className="rounded-[28px] border border-line bg-surface px-3 py-2.5 shadow-sm">
      {files.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5 px-1">
          {files.map((f, i) => (
            <span key={i} className="flex items-center gap-1.5 rounded-xl bg-hover px-2.5 py-1 text-xs">
              <FileText size={13} /> {f.name}
              <button onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label="Remove"><X size={12} /></button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <button onClick={() => pickFile.current?.click()} title="Attach text file" className="grid size-8 shrink-0 place-items-center rounded-full bg-hover hover:opacity-80">
          <Plus size={18} />
        </button>
        <input ref={pickFile} type="file" multiple hidden onChange={(e) => attach(e.target.files)} />
        <textarea
          ref={ta}
          autoFocus={autoFocus}
          rows={1}
          value={text}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); }
          }}
          className="max-h-56 min-h-8 flex-1 resize-none bg-transparent py-1 leading-6 outline-none placeholder:text-mut"
        />
        {picker}
        {busy ? (
          <button onClick={onStop} title="Stop" className="grid size-8 shrink-0 place-items-center rounded-full bg-fg text-bg">
            <Square size={12} fill="currentColor" />
          </button>
        ) : (
          <button onClick={submit} disabled={!can} title="Send" className={`grid size-8 shrink-0 place-items-center rounded-full ${can ? "bg-fg text-bg" : "bg-hover text-mut"}`}>
            <ArrowUp size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
