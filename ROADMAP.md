# Roadmap

R Workbench is a local-first automation console for personal computers. The roadmap prioritizes trust, clarity, and useful vertical workflows before broad agent autonomy.

## Phase 1: Local Foundation

- LM Studio as the default local model endpoint.
- Eve runtime with streaming and tool calls.
- `raym33/r` catalog bridge.
- Visual skill explorer.
- Permission summary and blocked sensitive skills.
- Session tool history.
- Guided PDF workbench.
- Skill Forge draft generator.

Status: implemented in this starter.

## Phase 2: Professional Document Workflows

- File picker with scoped folders.
- Drag-and-drop PDF intake.
- Persistent output folder.
- Result previews for generated PDFs.
- OCR language presets.
- Batch PDF actions.
- Run receipts with input paths, output paths, tool name, and timestamp.

## Phase 2.5: Skill Forge

- Detect missing capabilities after catalog search.
- Generate draft skill packages under `skill-drafts/`.
- Include manifest, code skeleton, tests, and approval checklist.
- Classify permissions before implementation.
- Require human approval before installation.
- Add reusable templates for document, web, file, data, and code skills.

## Phase 3: Research Workflows

- Firecrawl integration for page extraction.
- Source cards with title, URL, snippet, and fetch status.
- Research collections.
- Export to Markdown, PDF, and clipboard-safe text.
- Better handling for weak fallback search providers.

## Phase 4: Permission System

- Per-tool permission prompts.
- Allow once, allow for session, always allow, deny.
- Workspace folder allowlist.
- Sensitive action preview before execution.
- Audit log and replay controls.

## Phase 5: Power User Surface

- Browser-use for interactive browser tasks.
- Local file automations.
- Multi-step task templates.
- Tool favorites.
- Model profile presets for LM Studio, Ollama, and remote APIs.

## Design Principles

- Minimal by default, inspectable when needed.
- Buttons describe actions; tooltips explain consequences.
- Never hide tool execution from the user.
- Never install generated skills automatically.
- Preserve original files unless explicitly told otherwise.
- Keep the model context focused by searching tools instead of loading every capability.
