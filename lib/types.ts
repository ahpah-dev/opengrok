export type Kind = "openai" | "anthropic";

export type Provider = {
  id: string;
  name: string;
  kind: Kind; // "openai" = any OpenAI-compatible /chat/completions API
  baseUrl: string;
  apiKey: string;
  local?: boolean; // no API key needed
};

export type ModelRef = { providerId: string; model: string };

export type Source = { title: string; url: string; snippet: string };

export type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  files?: { name: string; text: string }[];
  thinking?: string;
  ms?: number; // how long the model thought before answering
  error?: string;
  model?: string;
  sources?: Source[];
  status?: string; // transient, e.g. "Searching the web…"
};

export type Chat = { id: string; title: string; messages: Msg[]; updated: number; projectId?: string };

// Like Grok Projects: a named set of instructions + reference files shared by its chats.
export type Project = { id: string; name: string; instructions: string; files: { name: string; text: string }[]; updated: number };

export type Settings = {
  providers: Provider[];
  active: ModelRef | null;
  systemPrompt: string;
  memory: string;
  theme: "system" | "dark" | "light";
  contextChars: number; // history budget sent to the model (~4 chars per token)
  searchOn: boolean;
  search: { engine: "ddg" | "searxng" | "brave"; url: string; key: string };
};
