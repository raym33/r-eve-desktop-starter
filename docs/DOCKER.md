# Docker

Docker is useful for isolating the workbench runtime: Node, Eve, Python, the R bridge, and local skill dependencies run inside the container.

LM Studio usually stays on the host machine. The container reaches it through:

```text
http://host.docker.internal:1234/v1
```

## Quick Start

1. Start LM Studio on the host.
2. Enable the OpenAI-compatible local server.
3. Copy Docker env defaults:

Copy the Docker example into your local `.env` or merge the `DOCKER_` values into an existing `.env`:

```bash
cp .env.docker.example .env
```

4. Set the model id:

```bash
LM_STUDIO_MODEL=qwen2.5-7b-instruct
DOCKER_LM_STUDIO_BASE_URL=http://host.docker.internal:1234/v1
```

5. Build and run:

```bash
npm run docker:build
npm run docker:up
```

Open:

```text
http://127.0.0.1:5173
```

## Security Profile

The Compose service applies:

- non-privileged container defaults;
- `no-new-privileges`;
- Linux capabilities dropped with `cap_drop: ALL`;
- sensitive R skills blocked by default;
- only `skill-drafts/` mounted from the host.

This is safer than running every dependency directly on the host, but it is not a perfect sandbox. Treat generated skills as untrusted until reviewed.

## Notes

- Ports: `5173` for the UI and `4274` for Eve.
- Skill Forge drafts are written to `./skill-drafts`.
- Docker-specific host URLs use the `DOCKER_` prefix so they do not conflict with local-mode values like `http://127.0.0.1:1234/v1`.
- Web search providers can be passed through `.env`; use `DOCKER_SEARXNG_URL` for a host SearXNG instance.
- On macOS and Docker Desktop, `host.docker.internal` works out of the box.
- On Linux, Compose includes a `host-gateway` mapping for the same hostname.

## Local vs Docker

Use local mode for fast development:

```bash
npm install
npm run r:install
npm run r:catalog
npm run build
npm run start:local
npm run web:local
```

Inside Docker, the image uses `npm run start:docker` so Eve binds to `0.0.0.0` and the published `4274` port is reachable from the host.

Use Docker mode when you want stronger dependency isolation or a cleaner demo environment.
