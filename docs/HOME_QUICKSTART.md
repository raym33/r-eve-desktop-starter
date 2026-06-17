# Home Quickstart

This guide is for people running AI Native OS on a personal computer with LM Studio.

## 1. Start LM Studio

1. Open LM Studio.
2. Load a model with tool-calling support.
3. Start the OpenAI-compatible local server.
4. Confirm it works:

```bash
curl http://127.0.0.1:1234/v1/models
```

Recommended starter model:

```text
qwen2.5-7b-instruct
```

Recommended local-safe settings:

```text
LM_STUDIO_CONTEXT_TOKENS=1024
LM_STUDIO_MAX_OUTPUT_TOKENS=128
```

Large context windows are useful later, but many local models behave better during setup with a conservative Eve context. If you increase the loaded context inside LM Studio, set `LM_STUDIO_CONTEXT_TOKENS` to the same value.

## 2. Clone And Setup

```bash
git clone --recurse-submodules https://github.com/raym33/ainativeos.git
cd ainativeos
cp .env.example .env
npm run setup:home
```

If you cloned without submodules:

```bash
git submodule update --init --recursive
npm run r:install
npm run r:catalog
```

## 3. Check LM Studio

```bash
npm run doctor:lmstudio
```

Expected result:

```text
models: ok
chat: ok
tool-calling: ok
```

If `tool-calling` fails, try another local model in LM Studio and update `LM_STUDIO_MODEL` in `.env`.

## 4. Run AI Native OS

Terminal 1:

```bash
npm run build
npm run start:local
```

In another terminal, verify the real Eve agent turn:

```bash
npm run doctor:eve
```

This check times out instead of hanging forever. It verifies that the compact default agent can complete one `r_catalog` tool turn.

Terminal 2:

```bash
npm run web:local
```

Open the URL printed by Vite, usually:

```text
http://127.0.0.1:5173
```

If another app is already using `5173`, Vite will print `5174`, `5175`, etc.

## 5. Why Eve Uses Port 4274

Many personal Macs already have something on port `3000`. AI Native OS uses:

```text
Eve backend: http://127.0.0.1:4274
Web UI:      http://127.0.0.1:5173 or next free Vite port
```

The UI reads:

```text
VITE_EVE_TARGET=http://127.0.0.1:4274
```

The setup panel checks this and warns if the Eve backend is not reachable.

## 6. Run Tests

```bash
npm run typecheck
npm run build
npm run web:build
npm run test:python
npm run doctor:lmstudio
```

## 7. Local Model Notes

Some local models can call tools but repeat the same tool instead of answering. AI Native OS includes a duplicate-call guard for the R catalog tools. If you still see loops:

- reduce `LM_STUDIO_MAX_OUTPUT_TOKENS`;
- try `qwen2.5-7b-instruct`;
- ask for one tool call at a time;
- restart Eve after changing `.env`.

If a model hangs on plain chat but `doctor:eve` passes, prefer tool-oriented prompts or try a non-reasoning instruct model. Some reasoning-heavy local models stream internal reasoning slowly through Eve even when direct LM Studio chat works.

## 8. Optional Tool Packs

The home profile starts compact on purpose. Optional packs live in:

```text
optional-tools/research
optional-tools/forge
optional-tools/legal
optional-tools/news
optional-tools/experimental
```

To enable one, copy its `.ts` files into `agent/tools`, run `npm run build`, and restart Eve.

## 9. Optional Web Search

For stronger web research, configure one provider:

```bash
SEARXNG_URL=http://127.0.0.1:8080
BRAVE_SEARCH_API_KEY=...
TAVILY_API_KEY=...
```

Without a provider, AI Native OS uses a lightweight DuckDuckGo fallback.
