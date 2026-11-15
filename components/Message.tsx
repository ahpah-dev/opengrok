"use client";
import { Children, isValidElement, useState, type ReactElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Check, ChevronRight, Copy, FileText, RefreshCw } from "lucide-react";
import { parse } from "@/lib/client";
import type { Msg } from "@/lib/types";
import "highlight.js/styles/github-dark.css";

const textOf = (n: ReactNode): string =>
  typeof n === "string" || typeof n === "number" ? String(n)
  : Array.isArray(n) ? n.map(textOf).join("")
  : isValidElement(n) ? textOf((n.props as { children?: ReactNode }).children)
  : "";

const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };

function CopyBtn({ text, label }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      title="Copy"
      onClick={() => navigator.clipboard.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 1500); })}
      className="flex items-center gap-1.5 rounded-lg p-1.5 text-mut hover:bg-hover hover:text-fg"
    >
      {ok ? <Check size={15} /> : <Copy size={15} />}
      {label && <span className="text-xs">{ok ? "Copied" : label}</span>}
    </button>
  );
}

function Pre({ children }: { children?: ReactNode }) {
  const code = Children.toArray(children)[0] as ReactElement<{ className?: string; children?: ReactNode }> | undefined;
  const lang = /language-([\w-]+)/.exec(code?.props?.className ?? "")?.[1] ?? "";
  return (
    <div className="my-3 overflow-hidden rounded-xl border border-line bg-[#0d1117] text-[#e6edf3]">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1 text-xs text-[#8b949e]">
        <span>{lang}</span>
        <span className="[&_button]:text-[#8b949e] [&_button:hover]:text-white"><CopyBtn text={textOf(code?.props?.children)} label="Copy" /></span>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed">{children}</pre>
    </div>
  );
}

const components = {
  pre: Pre,
  a: ({ href, children }: { href?: string; children?: ReactNode }) => (
    <a href={href} target="_blank" rel="noreferrer noopener">{children}</a>
  ),
  // Never auto-load remote images from model output (tracking/privacy); show a link instead.
  img: ({ src, alt }: { src?: string | Blob; alt?: string }) => (
    <a href={String(src)} target="_blank" rel="noreferrer noopener">[image: {alt || String(src)}]</a>
  ),
};

export function Message({ m, streaming, last, onRegen }: { m: Msg; streaming: boolean; last: boolean; onRegen: () => void }) {
  if (m.role === "user") {
    return (
      <div className="flex flex-col items-end gap-1.5">
        {m.files?.map((f, i) => (
          <span key={i} className="flex items-center gap-1.5 rounded-xl border border-line px-2.5 py-1 text-xs text-mut">
            <FileText size={13} /> {f.name}
          </span>
        ))}
        {m.content && <div className="max-w-[85%] whitespace-pre-wrap rounded-3xl bg-bubble px-4 py-2.5 leading-relaxed">{m.content}</div>}
      </div>
    );
  }

  const { think, text, open } = parse(m);
  const thinking = streaming && (!text || open);
  const label = !text && m.status ? m.status : "Thinking";
  const cited = m.sources?.length
    ? text.replace(/\[(\d{1,2})\](?!\()/g, (s, n) => (m.sources![+n - 1] ? `[[${n}]](${m.sources![+n - 1].url})` : s))
    : text;
  return (
    <div className="group">
      {(think || thinking) && (
        <details className="mb-2">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-sm text-mut [&::-webkit-details-marker]:hidden">
            <ChevronRight size={14} className="transition-transform [details[open]>summary>&]:rotate-90" />
            {thinking ? <span className="shimmer font-medium">{label}</span> : <span>Thought for {m.ms ? `${Math.max(1, Math.round(m.ms / 1000))}s` : "a moment"}</span>}
          </summary>
          {think && <div className="mt-2 whitespace-pre-wrap border-l-2 border-line pl-3 text-sm leading-relaxed text-mut">{think}</div>}
        </details>
      )}
      {text && (
        <div className="md">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={components}>{cited}</ReactMarkdown>
          {streaming && !open && <span className="ml-1 inline-block size-2 animate-pulse rounded-full bg-fg align-middle" />}
        </div>
      )}
      {!!m.sources?.length && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {m.sources.map((s, i) => (
            <a key={i} href={s.url} target="_blank" rel="noreferrer noopener" title={s.title} className="flex max-w-[220px] items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs text-mut hover:bg-hover hover:text-fg">
              <span className="font-medium text-fg">{i + 1}</span>
              <span className="truncate">{host(s.url)}</span>
            </a>
          ))}
        </div>
      )}
      {m.error && (
        <div className="mt-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {m.error}
        </div>
      )}
      {!streaming && (
        <div className="mt-1 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          {text && <CopyBtn text={text} />}
          {last && (
            <button title="Regenerate" onClick={onRegen} className="rounded-lg p-1.5 text-mut hover:bg-hover hover:text-fg">
              <RefreshCw size={15} />
            </button>
          )}
          {m.model && <span className="ml-2 text-xs text-mut">{m.model}</span>}
        </div>
      )}
    </div>
  );
}
