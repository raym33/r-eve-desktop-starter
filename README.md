# R Workbench

A local-first AI workbench for LM Studio, Eve, web search, and the `raym33/r` skill catalog.

The goal is to feel less like a generic chat app and more like a small operating system for personal automation: clear status, visible tools, safe defaults, and task-first controls.

## Features

- Local model routing through LM Studio's OpenAI-compatible server.
- Eve agent runtime with streaming and tool calls.
- Web search through SearXNG, Brave, Tavily, or DuckDuckGo Instant Answer fallback.
- `raym33/r` bridge with catalog search and targeted tool execution.
- Guided PDF workbench for OCR, summaries, merging, page extraction, repair, and report generation.
- Skill Forge for drafting missing R skills when no existing tool fits.
- Permission panel that shows ready and blocked skill families.
- Session tool history for auditability.
- Minimal responsive UI with button tooltips.

## Requirements

- Node.js and npm.
- LM Studio with the local server enabled.
- A local model with reliable tool calling.
- Python virtual environment created by the setup flow.
- Optional: SearXNG, Brave Search API key, or Tavily API key for stronger web search.

## Clone

This repository embeds `raym33/r` as a git submodule at `./r`.

```bash
git clone --recurse-submodules https://github.com/raym33/r-eve-desktop-starter.git
cd r-eve-desktop-starter
```

If you already cloned without submodules:

```bash
git submodule update --init --recursive
```

## Configure LM Studio

1. Open LM Studio.
2. Load a model with good tool-calling behavior.
3. Start the local OpenAI-compatible server.
4. Confirm that it responds:

```bash
curl http://127.0.0.1:1234/v1/models
```

Copy the model `id` into `.env`.

## Configure The App

```bash
cp .env.example .env
npm install
npm run r:install
npm run r:catalog
```

Edit:

```bash
LM_STUDIO_MODEL=your-local-model-id
LM_STUDIO_CONTEXT_TOKENS=65536
LM_STUDIO_MAX_OUTPUT_TOKENS=4096
```

For web search, configure one provider:

```bash
SEARXNG_URL=http://127.0.0.1:8080
BRAVE_SEARCH_API_KEY=...
TAVILY_API_KEY=...
```

If no provider is configured, the app uses DuckDuckGo Instant Answer as a lightweight fallback. That is useful for smoke tests, but it is not a full web search replacement.

## Run

Terminal 1:

```bash
npm run build
npm run start
```

Terminal 2:

```bash
npm run web
```

Open:

```text
http://127.0.0.1:5173
```

If Eve is not running at `http://127.0.0.1:3000`, change `VITE_EVE_TARGET` in `.env`.

`npm run dev` opens Eve's interactive development mode. For a predictable local LM Studio start, `build` plus `start` is usually simpler.

## R Skills

This starter includes a bridge to `raym33/r`:

- `r_catalog`: lists available skills.
- `r_search_tools`: searches tools by keyword.
- `r_call_tool`: executes one specific tool.

The R repository lives inside this repo at `./r` as a submodule and is installed editable inside `.venv` with:

```bash
npm run r:install
```

The UI loads `public/r-catalog.json` to display a visual skill and tool explorer. It also shows a permission panel with ready skills and sensitive blocked families.

Quick check:

```bash
.venv/bin/python scripts/r_bridge.py export-catalog --output public/r-catalog.json
.venv/bin/python scripts/r_bridge.py catalog --limit 5
.venv/bin/python scripts/r_bridge.py call math calculate --params '{"expression":"sqrt(144)"}'
```

## PDF Workbench

The first screen includes guided document actions:

- summarize PDFs with text extraction or OCR;
- convert scanned PDFs into searchable PDFs;
- merge multiple PDFs;
- extract pages or ranges;
- generate PDF reports from text or Markdown;
- rotate or compress documents.

Each action asks for paths and options before running `r_call_tool`. The recommended workflow is to create a new output file and preserve originals.

## Skill Forge

Skill Forge is the safe self-extension path:

```text
request -> search existing tools -> explain the gap -> draft skill -> review -> test -> approve -> install
```

When the agent cannot find a suitable R skill, it can call `skill_forge` to create a reviewable draft under `skill-drafts/<name>/`.

Drafts include:

- `manifest.json` with status, request, related existing tools, and permission profile;
- `skill.py` with a conservative R skill skeleton;
- `tests/test_skill.py` proving the draft is not executable before implementation;
- `APPROVAL.md` with a human review checklist;
- `README.md` with the original request and review flow.

Drafts are ignored by git by default and are never installed or executed automatically.

## Safety

The bridge blocks sensitive skill families by default, including `ssh`, `docker`, `email`, `power`, `wifi`, `clipboard`, and similar capabilities.

To unlock them for the backend process:

```bash
R_BRIDGE_ALLOW_DANGEROUS=1 npm run start
```

For daily use, keep this disabled and let Eve propose a plan before actions that can modify the system.

## Documentation

- [Product MVP](docs/R_DESKTOP_MVP.md)
- [Roadmap](ROADMAP.md)
