"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Menu, MessageSquareQuote, Skull, Telescope } from "lucide-react";
import { DEFAULT_PROMPT, DEFAULT_SETTINGS, PROMPT_V1 } from "@/lib/defaults";
import { buildSystem, history, streamChat, uid, usePersisted } from "@/lib/client";
import type { Chat, Msg, Project, Provider, Settings } from "@/lib/types";
import { Composer } from "./Composer";
import { Logo } from "./Logo";
import { Message } from "./Message";
import { ModelPicker } from "./ModelPicker";
import { ProjectEditor, ProjectPage, ProjectsList } from "./Projects";
import { SettingsModal } from "./SettingsModal";
import { Sidebar } from "./Sidebar";

const SUGGESTIONS = [
  { icon: <Skull size={18} />, text: "Roast my tech stack, then tell me what to actually fix" },
  { icon: <Telescope size={18} />, text: "Explain something everyone gets wrong about nutrition" },
  { icon: <MessageSquareQuote size={18} />, text: "Steelman a position I strongly disagree with" },
];

export default function App() {
  const [settings, setSettings] = usePersisted<Settings>("opengrok:settings", DEFAULT_SETTINGS, (s) =>
    s.systemPrompt === PROMPT_V1 ? { ...s, systemPrompt: DEFAULT_PROMPT } : s,
  );
  const [chats, setChats] = usePersisted<Chat[]>("opengrok:chats", []);
  const [projects, setProjects] = usePersisted<Project[]>("opengrok:projects", []);
  const [activeId, setActiveId] = useState<string | null>(null); // open chat
  const [projectId, setProjectId] = useState<string | null>(null); // open project page (when no chat is open)
  const [showProjects, setShowProjects] = useState(false);
  const [editor, setEditor] = useState<Project | "new" | null>(null);
  const [sidebar, setSidebar] = useState(() => innerWidth >= 768);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  const chat = chats.find((c) => c.id === activeId) ?? null;
  const project = projects.find((p) => p.id === projectId) ?? null;
  const chatProject = projects.find((p) => p.id === chat?.projectId) ?? null;
  const patch = (p: Partial<Settings>) => setSettings((s) => ({ ...s, ...p }));

  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => document.documentElement.classList.toggle("dark", settings.theme === "dark" || (settings.theme === "system" && mq.matches));
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [settings.theme]);

  useEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [chat?.messages]);

  async function run(chatId: string, convo: Msg[], asstId: string, p: Provider, model: string, proj: Project | undefined, query: string) {
    const ctrl = new AbortController();
    abort.current = ctrl;
    setBusy(true);
    const t0 = Date.now();
    const edit = (f: (m: Msg) => Msg) =>
      setChats((cs) => cs.map((c) => (c.id !== chatId ? c : { ...c, updated: Date.now(), messages: c.messages.map((m) => (m.id === asstId ? f(m) : m)) })));
    try {
      await streamChat(
        p,
        {
          model,
          system: buildSystem(settings, proj),
          messages: history(convo, settings.contextChars),
          search: settings.searchOn ? { ...settings.search, query } : undefined,
        },
        ctrl.signal,
        (e) => {
          if (e.t === "error") return edit((m) => ({ ...m, error: m.error ? `${m.error}\n${e.d}` : e.d }));
          if (e.t === "status") return edit((m) => ({ ...m, status: e.d || undefined }));
          if (e.t === "sources") return edit((m) => ({ ...m, sources: JSON.parse(e.d) }));
          edit((m) => {
            const n = e.t === "think" ? { ...m, thinking: (m.thinking ?? "") + e.d } : { ...m, content: m.content + e.d, status: undefined };
            if (!n.ms && e.t === "text" && (n.thinking || n.content.includes("</think>"))) n.ms = Date.now() - t0;
            return n;
          });
        },
      );
    } catch (e) {
      if (!ctrl.signal.aborted) edit((m) => ({ ...m, error: (e as Error).message }));
    } finally {
      edit((m) => ({ ...m, status: undefined }));
      setBusy(false);
      abort.current = null;
    }
  }

  function send(text: string, files: Msg["files"]) {
    const a = settings.active;
    const p = settings.providers.find((x) => x.id === a?.providerId);
    if (!a?.model || !p) return setPickerOpen(true);
    const user: Msg = { id: uid(), role: "user", content: text, files };
    const asst: Msg = { id: uid(), role: "assistant", content: "", model: a.model };
    const id = chat?.id ?? uid();
    const pid = chat ? chat.projectId : project?.id;
    setChats((cs) =>
      chat
        ? cs.map((c) => (c.id === id ? { ...c, updated: Date.now(), messages: [...c.messages, user, asst] } : c))
        : [{ id, title: (text || files?.[0]?.name || "New chat").slice(0, 48), messages: [user, asst], updated: Date.now(), projectId: pid }, ...cs],
    );
    setActiveId(id);
    stick.current = true;
    run(id, [...(chat?.messages ?? []), user], asst.id, p, a.model, projects.find((x) => x.id === pid), text);
  }

  function regen() {
    const a = settings.active;
    const p = settings.providers.find((x) => x.id === a?.providerId);
    if (!chat || busy || chat.messages.at(-1)?.role !== "assistant") return;
    if (!a?.model || !p) return setPickerOpen(true);
    const asst: Msg = { id: uid(), role: "assistant", content: "", model: a.model };
    const prior = chat.messages.slice(0, -1);
    setChats((cs) => cs.map((c) => (c.id === chat.id ? { ...c, messages: [...prior, asst] } : c)));
    stick.current = true;
    run(chat.id, prior, asst.id, p, a.model, chatProject ?? undefined, prior.at(-1)?.content ?? "");
  }

  const del = (id: string) => {
    if (id === activeId) { abort.current?.abort(); setActiveId(null); }
    setChats((cs) => cs.filter((c) => c.id !== id));
  };

  const go = (v: { chat?: string | null; project?: string | null; list?: boolean }) => {
    setActiveId(v.chat ?? null);
    setProjectId(v.project ?? null);
    setShowProjects(!!v.list);
  };

  const saveProject = (f: Pick<Project, "name" | "instructions" | "files">) => {
    if (editor === "new") {
      const id = uid();
      setProjects((ps) => [...ps, { id, ...f, updated: Date.now() }]);
      go({ project: id });
    } else if (editor) {
      setProjects((ps) => ps.map((p) => (p.id === editor.id ? { ...p, ...f, updated: Date.now() } : p)));
    }
    setEditor(null);
  };

  const deleteProject = (id: string) => {
    setProjects((ps) => ps.filter((p) => p.id !== id));
    setChats((cs) => cs.map((c) => (c.projectId === id ? { ...c, projectId: undefined } : c)));
    setEditor(null);
    go({ list: true });
  };

  const picker = (up: boolean) => (
    <ModelPicker providers={settings.providers} active={settings.active} onPick={(m) => patch({ active: m })} open={pickerOpen} setOpen={setPickerOpen} up={up} />
  );
  const composer = (up: boolean, placeholder?: string) => (
    <Composer
      busy={busy}
      onSend={send}
      onStop={() => abort.current?.abort()}
      picker={picker(up)}
      search={settings.searchOn}
      onSearch={() => patch({ searchOn: !settings.searchOn })}
      placeholder={placeholder}
      autoFocus
    />
  );

  return (
    <div className="flex h-dvh">
      <Sidebar
        chats={chats}
        activeId={activeId}
        open={sidebar}
        theme={settings.theme}
        setOpen={setSidebar}
        onNew={() => go({})}
        onProjects={() => go({ list: true })}
        onSelect={(id) => go({ chat: id })}
        onDelete={del}
        onRename={(id, title) => setChats((cs) => cs.map((c) => (c.id === id ? { ...c, title } : c)))}
        onSettings={() => setSettingsOpen(true)}
        onTheme={(theme) => patch({ theme })}
      />
      <main className="relative flex min-w-0 flex-1 flex-col">
        <button onClick={() => setSidebar(true)} aria-label="Menu" className="absolute left-3 top-3 z-10 rounded-lg p-2 hover:bg-hover md:hidden"><Menu size={20} /></button>
        {chat ? (
          <>
            <div
              ref={scroller}
              onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120; }}
              className="flex-1 overflow-y-auto"
            >
              <div className="mx-auto flex max-w-3xl flex-col gap-7 px-4 pb-8 pt-16">
                {chatProject && (
                  <button onClick={() => go({ project: chatProject.id })} className="-mb-3 flex items-center gap-1 self-start text-sm text-mut hover:text-fg">
                    <ChevronLeft size={16} /> {chatProject.name}
                  </button>
                )}
                {chat.messages.map((m, i) => (
                  <Message key={m.id} m={m} last={i === chat.messages.length - 1} streaming={busy && i === chat.messages.length - 1} onRegen={regen} />
                ))}
              </div>
            </div>
            <div className="mx-auto w-full max-w-3xl px-4 pb-3">
              {composer(true, "Ask anything")}
              <p className="mt-2 text-center text-xs text-mut">OpenGrok can be wrong. Check anything that matters.</p>
            </div>
          </>
        ) : project ? (
          <ProjectPage project={project} chats={chats} composer={composer(false, `New chat in ${project.name}`)} onEdit={() => setEditor(project)} onSelect={(id) => go({ chat: id })} />
        ) : showProjects ? (
          <ProjectsList projects={projects} chats={chats} onOpen={(id) => go({ project: id })} onNew={() => setEditor("new")} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-4 pb-20">
            <div className="flex w-full max-w-3xl flex-col items-center">
              <div className="mb-6 flex items-center gap-3"><Logo size={40} /><span className="text-4xl font-semibold tracking-tight">OpenGrok</span></div>
              <h1 className="mb-6 text-[28px] font-[525] tracking-tight">What do you want to know?</h1>
              <div className="w-full">{composer(false)}</div>
              {!settings.active?.model && (
                <p className="mt-3 text-sm text-mut">
                  Pick a model at the right of the box. Add an API key in <button className="underline underline-offset-2" onClick={() => setSettingsOpen(true)}>Settings</button>, or start Ollama / LM Studio.
                </p>
              )}
              <div className="mt-4 w-full">
                {SUGGESTIONS.map((s) => (
                  <button key={s.text} onClick={() => send(s.text, undefined)} className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm text-mut hover:bg-hover hover:text-fg">
                    {s.icon} {s.text}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
      {settingsOpen && (
        <SettingsModal s={settings} chats={chats} patch={patch} onClose={() => setSettingsOpen(false)} onClear={() => { abort.current?.abort(); setActiveId(null); setChats([]); }} />
      )}
      {editor && (
        <ProjectEditor
          key={editor === "new" ? "new" : editor.id}
          initial={editor === "new" ? null : editor}
          onSave={saveProject}
          onDelete={editor === "new" ? undefined : () => deleteProject(editor.id)}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  );
}
