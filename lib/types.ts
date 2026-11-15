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

export type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  files?: { name: string; text: string }[];
  thinking?: string;
  ms?: number; // how long the model thought before answering
  error?: string;
  model?: string;
};

export type Chat = { id: string; title: string; messages: Msg[]; updated: number };

export type Settings = {
  providers: Provider[];
  active: ModelRef | null;
  systemPrompt: string;
  memory: string;
  theme: "system" | "dark" | "light";
  contextChars: number; // history budget sent to the model (~4 chars per token)
};
