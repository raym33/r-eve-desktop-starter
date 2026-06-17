# Project Structure

AI Native OS is intentionally small at the top level. The app is split into a UI, an Eve agent, a Python bridge, and the embedded `raym33/r` submodule.

```text
.
  agent/              Eve agent, instructions, channels, and tools
  docs/               Product, Docker, and structure documentation
  permissions/        policy.json: single source for blocked and guarded tools
  public/             Generated static assets, including the R catalog
  r/                  raym33/r git submodule
  scripts/            Local bridge scripts
  skill-drafts/       Skill Forge drafts, ignored by default
  src/                React workbench UI
  Dockerfile          Container image for the full workbench
  compose.yaml        Local Docker runtime
```

## Runtime Shape

```text
Browser UI
  -> Vite dev proxy
  -> Eve backend
  -> LM Studio on host
  -> R bridge
  -> raym33/r skills
```

## Expansion Points

- Add Eve tools in `agent/tools/`.
- Add UI modules in `src/`.
- Add Python bridge commands in `scripts/r_bridge.py`.
- Change blocked/guarded permissions in `permissions/policy.json` (both the Python bridge and the UI read it; do not edit the lists in code).
- Generate missing capabilities in `skill-drafts/` through Skill Forge.
- Update the embedded R engine with `git submodule update --remote r`.

## Design Rules

- Keep the root directory boring and obvious.
- Keep user-facing copy in English.
- Keep generated drafts out of git until reviewed.
- Search existing skills before creating a new one.
- Prefer new output files over mutating originals.
