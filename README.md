# OpenGrok

A fully local, Grok-style chat app. Bring your own API key or run a local model. Nothing leaves your machine except the requests you send to the provider you chose.

Not affiliated with xAI. "Grok" belongs to them; this is an independent look-alike.

## Features

- Grok-style UI: warm light / near-black dark theme (colors sampled from grok.com), collapsible icon-rail sidebar, history grouped by date with search, pill composer, model picker.
- Streaming responses, collapsible "Thinking" / "Thought for Ns" (native reasoning fields and `<think>` tags), markdown with tables and highlighted code + copy buttons, stop, regenerate.
- Grok persona as the default system prompt (editable, resettable).
- Projects: named workspaces with custom instructions and reference text files shared by all their chats (sidebar > Projects).
- Native web search (Search button in the chat box): the app itself searches (DuckDuckGo with no key, or your SearXNG / Brave key), reads the top pages, and hands the model numbered sources. Works with any model, local ones included. Answers get clickable [n] citations and source chips.
- Memory (facts added to every chat), history budget control, text-file attachments.
- Providers: xAI, OpenAI, Anthropic, Google (Gemini), OpenRouter, Ollama, LM Studio, llama.cpp, plus any OpenAI-compatible server. Model lists are fetched live from each provider.
- All data (chats, keys, settings) lives in your browser's localStorage. Export or wipe it in Settings.

## Run

Requires Node 20+. On Windows, double-click `Start OpenGrok.bat` (installs, builds on first run, opens the browser).

```bash
git clone https://github.com/ahpah-dev/opengrok && cd opengrok
npm install
npm run dev        # or: npm run build && npm start
```

Open http://127.0.0.1:3000, pick a model (bottom right of the box), and add a key in Settings if it's a cloud provider.

Local models: start Ollama (`ollama serve`), LM Studio (enable the local server) or `llama-server`, then pick a model from the list. Default ports are preconfigured.

## How it works

The browser calls a tiny local Next.js proxy (`app/api/chat`, `app/api/models`), which forwards to the provider and streams back normalized events. This avoids CORS and works the same for every provider. The server binds to 127.0.0.1 only; don't expose it, since it forwards whatever URL and key the page sends.

## Search notes

The query is your last message (no LLM query rewriting), so follow-ups like "and what about its price?" search poorly; rephrase. DuckDuckGo is scraped and can rate-limit; switch engines in Settings. Page fetching refuses localhost/LAN addresses. Search results are treated as untrusted data in the prompt.

## Not included

Tool calling, image generation, voice, accounts or sync. PRs welcome.

## License

[Unlicense](LICENSE): public domain.
