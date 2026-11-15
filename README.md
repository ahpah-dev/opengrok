# OpenGrok

A fully local, Grok-style chat app. Bring your own API key or run a local model. Nothing leaves your machine except the requests you send to the provider you chose.

Not affiliated with xAI. "Grok" belongs to them; this is an independent look-alike.

## Features

- Grok-style UI: warm light / near-black dark theme (colors sampled from grok.com), collapsible icon-rail sidebar, history grouped by date with search, pill composer, model picker.
- Streaming responses, collapsible "Thinking" / "Thought for Ns" (native reasoning fields and `<think>` tags), markdown with tables and highlighted code + copy buttons, stop, regenerate.
- Grok persona as the default system prompt (editable, resettable).
- Memory (facts added to every chat), history budget control, text-file attachments.
- Providers: xAI, OpenAI, Anthropic, Google (Gemini), OpenRouter, Ollama, LM Studio, llama.cpp, plus any OpenAI-compatible server. Model lists are fetched live from each provider.
- All data (chats, keys, settings) lives in your browser's localStorage. Export or wipe it in Settings.

## Run

Requires Node 20+.

```bash
git clone https://github.com/ahpah-dev/opengrok && cd opengrok
npm install
npm run dev        # or: npm run build && npm start
```

Open http://127.0.0.1:3000, pick a model (bottom right of the box), and add a key in Settings if it's a cloud provider.

Local models: start Ollama (`ollama serve`), LM Studio (enable the local server) or `llama-server`, then pick a model from the list. Default ports are preconfigured.

## How it works

The browser calls a tiny local Next.js proxy (`app/api/chat`, `app/api/models`), which forwards to the provider and streams back normalized events. This avoids CORS and works the same for every provider. The server binds to 127.0.0.1 only; don't expose it, since it forwards whatever URL and key the page sends.

## Not included

Web search / tool use, image generation, voice, accounts or sync. PRs welcome.

## License

[Unlicense](LICENSE): public domain.
