import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readdir, readFile, stat } from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";

type HealthState = "ready" | "warning" | "offline" | "info";

type HealthCheck = {
  detail: string;
  key: string;
  label: string;
  state: HealthState;
};

const CHECK_TIMEOUT_MS = 1800;
const WORKSPACE_FOLDERS = ["Inbox", "Outputs", "Reports", "OCR", "Receipts", "Drafts", "Logs"];

function withTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timeout));
}

function json(res: import("node:http").ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload, null, 2));
}

function workspaceRoot(env: Record<string, string>) {
  const configured = env.AI_NATIVE_OS_WORKSPACE || "~/AI-Native-OS";
  if (configured.startsWith("~/")) {
    return resolve(process.env.HOME || process.cwd(), configured.slice(2));
  }
  return resolve(configured);
}

async function ensureWorkspace(env: Record<string, string>) {
  const root = workspaceRoot(env);
  await mkdir(root, { recursive: true });
  await Promise.all(WORKSPACE_FOLDERS.map((folder) => mkdir(join(root, folder), { recursive: true })));
  await mkdir(join(root, "Reports", "Research"), { recursive: true });
  return root;
}

async function listResearchNotes(env: Record<string, string>) {
  const root = await ensureWorkspace(env);
  const researchDir = join(root, "Reports", "Research");
  const entries = await readdir(researchDir, { withFileTypes: true });
  const notes = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map(async (entry) => {
        const path = join(researchDir, entry.name);
        const info = await stat(path);
        return {
          id: entry.name,
          modifiedAt: info.mtime.toISOString(),
          path,
          size: info.size,
          title: titleFromMarkdown(await readFile(path, "utf8"), entry.name),
        };
      }),
  );
  return {
    root,
    notes: notes.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt)),
  };
}

async function readResearchNote(env: Record<string, string>, id: string) {
  const safeId = basename(id);
  if (safeId !== id || !safeId.endsWith(".md")) {
    throw new Error("Invalid research note id.");
  }
  const root = await ensureWorkspace(env);
  const path = join(root, "Reports", "Research", safeId);
  const markdown = await readFile(path, "utf8");
  return {
    id: safeId,
    markdown,
    path,
    title: titleFromMarkdown(markdown, safeId),
  };
}

async function listWorkspaceFiles(env: Record<string, string>, requestedPath: string) {
  const root = await ensureWorkspace(env);
  const resolvedRoot = resolve(root);
  const resolvedPath = resolve(resolvedRoot, requestedPath || ".");
  const insideRoot = resolvedPath === resolvedRoot || resolvedPath.startsWith(`${resolvedRoot}${sep}`);
  const relativePath = relative(resolvedRoot, resolvedPath);
  const displayPath = relativePath === "" ? "" : relativePath;
  const parent = displayPath === "" ? null : dirname(displayPath) === "." ? "" : dirname(displayPath);

  if (!insideRoot) {
    const error = "Path escapes the workspace root.";
    return {
      status: 400,
      payload: { root: resolvedRoot, path: displayPath, parent: null, entries: [], error },
    };
  }

  try {
    const entries = await Promise.all(
      (await readdir(resolvedPath, { withFileTypes: true })).map(async (entry) => {
        const info = await stat(join(resolvedPath, entry.name));
        return {
          name: entry.name,
          type: entry.isDirectory() ? "dir" : "file",
          size: info.size,
          modifiedAt: info.mtime.toISOString(),
        };
      }),
    );

    entries.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "dir" ? -1 : 1;
      }
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });

    return {
      status: 200,
      payload: { root: resolvedRoot, path: displayPath, parent, entries },
    };
  } catch (error) {
    return {
      status: 500,
      payload: {
        root: resolvedRoot,
        path: displayPath,
        parent: null,
        entries: [],
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

function titleFromMarkdown(markdown: string, fallback: string) {
  return markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || fallback.replace(/\.md$/, "");
}

async function buildHealth(env: Record<string, string>, root: string) {
  const checks: HealthCheck[] = [];
  const lmStudioBaseUrl = env.LM_STUDIO_BASE_URL || "http://127.0.0.1:1234/v1";
  const lmStudioModel = env.LM_STUDIO_MODEL || "qwen2.5-7b-instruct";
  const lexiaBaseUrl = env.LEXIA_BASE_URL || "http://127.0.0.1:5174";
  const eveTarget = env.VITE_EVE_TARGET || "http://127.0.0.1:4274";
  const workspace = env.AI_NATIVE_OS_WORKSPACE || "~/AI-Native-OS";
  const bridgePython = env.R_BRIDGE_PYTHON || resolve(root, ".venv/bin/python");
  const bridgeScript = env.R_BRIDGE_SCRIPT || resolve(root, "scripts/r_bridge.py");
  const catalogPath = resolve(root, "public/r-catalog.json");

  try {
    const response = await withTimeout(`${lmStudioBaseUrl.replace(/\/$/, "")}/models`, {
      headers: { authorization: `Bearer ${env.LM_STUDIO_API_KEY || "lm-studio"}` },
    });
    if (!response.ok) {
      checks.push({
        key: "lmstudio",
        label: "LM Studio",
        state: "offline",
        detail: `${response.status} ${response.statusText}`,
      });
    } else {
      const data = (await response.json()) as { data?: Array<{ id?: string }> };
      const ids = Array.isArray(data.data) ? data.data.map((model) => model.id).filter(Boolean) : [];
      checks.push({
        key: "lmstudio",
        label: "LM Studio",
        state: ids.includes(lmStudioModel) ? "ready" : "warning",
        detail: ids.includes(lmStudioModel)
          ? `${lmStudioModel} is available`
          : `${lmStudioModel} not found; ${ids.length} model(s) reported`,
      });
    }
  } catch {
    checks.push({
      key: "lmstudio",
      label: "LM Studio",
      state: "offline",
      detail: `Not reachable at ${lmStudioBaseUrl}`,
    });
  }

  try {
    const response = await withTimeout(`${eveTarget.replace(/\/$/, "")}/eve/v1/health`);
    let detail = `${response.status} ${response.statusText}`;
    if (response.ok) {
      try {
        const data = (await response.json()) as { ok?: boolean };
        detail = data.ok === false ? "Eve health returned ok=false" : `Reachable at ${eveTarget}`;
      } catch {
        detail = `Reachable at ${eveTarget}`;
      }
    }
    checks.push({
      key: "eve",
      label: "Eve backend",
      state: response.ok ? "ready" : "warning",
      detail,
    });
  } catch {
    checks.push({
      key: "eve",
      label: "Eve backend",
      state: "warning",
      detail: `Not reachable at ${eveTarget}. Run npm run start:local or set VITE_EVE_TARGET.`,
    });
  }

  if (existsSync(catalogPath)) {
    try {
      const catalog = JSON.parse(readFileSync(catalogPath, "utf8")) as {
        skillCount?: number;
        toolCount?: number;
      };
      checks.push({
        key: "catalog",
        label: "R catalog",
        state: catalog.skillCount && catalog.toolCount ? "ready" : "warning",
        detail: `${catalog.skillCount ?? 0} skills, ${catalog.toolCount ?? 0} tools`,
      });
    } catch {
      checks.push({
        key: "catalog",
        label: "R catalog",
        state: "warning",
        detail: "public/r-catalog.json exists but could not be parsed",
      });
    }
  } else {
    checks.push({
      key: "catalog",
      label: "R catalog",
      state: "warning",
      detail: "Run npm run r:catalog",
    });
  }

  checks.push({
    key: "bridge",
    label: "R bridge",
    state: existsSync(bridgePython) && existsSync(bridgeScript) ? "ready" : "warning",
    detail:
      existsSync(bridgePython) && existsSync(bridgeScript)
        ? "Python bridge files are present"
        : "Run npm run r:install",
  });

  try {
    const response = await withTimeout(`${lexiaBaseUrl.replace(/\/$/, "")}/api/agent/health`, {
      headers: env.LEXIA_AGENT_TOKEN ? { authorization: `Bearer ${env.LEXIA_AGENT_TOKEN}` } : undefined,
    });
    checks.push({
      key: "lexia",
      label: "Lexia",
      state: response.ok ? "ready" : "warning",
      detail: response.ok ? "Spanish legal RAG is reachable" : `${response.status} ${response.statusText}`,
    });
  } catch {
    checks.push({
      key: "lexia",
      label: "Lexia",
      state: "info",
      detail: "Optional legal RAG is not running",
    });
  }

  checks.push({
    key: "search",
    label: "Web search",
    state: env.SEARXNG_URL || env.BRAVE_SEARCH_API_KEY || env.TAVILY_API_KEY ? "ready" : "warning",
    detail: env.SEARXNG_URL
      ? "SearXNG configured"
      : env.BRAVE_SEARCH_API_KEY
        ? "Brave configured"
        : env.TAVILY_API_KEY
          ? "Tavily configured"
          : "DuckDuckGo fallback only",
  });

  checks.push({
    key: "reader",
    label: "Page reader",
    state: env.FIRECRAWL_API_KEY || env.FIRECRAWL_BASE_URL ? "ready" : "info",
    detail: env.FIRECRAWL_API_KEY || env.FIRECRAWL_BASE_URL
      ? "Firecrawl extraction configured"
      : "Direct page extraction only",
  });

  checks.push({
    key: "workspace",
    label: "Workspace",
    state: "info",
    detail: `${workspace}${env.R_BRIDGE_WORKSPACE_ONLY === "1" ? " (workspace-only)" : ""}`,
  });

  return {
    generatedAt: new Date().toISOString(),
    checks,
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),
      {
        name: "ai-native-os-health",
        configureServer(server) {
          server.middlewares.use("/api/health", async (_req, res) => {
            try {
              json(res, 200, await buildHealth(env, process.cwd()));
            } catch (error) {
              json(res, 500, {
                generatedAt: new Date().toISOString(),
                checks: [],
                error: error instanceof Error ? error.message : String(error),
              });
            }
          });
          server.middlewares.use("/api/research-notes", async (req, res) => {
            try {
              const url = new URL(req.url || "/", "http://127.0.0.1");
              const id = url.searchParams.get("id");
              if (id) {
                json(res, 200, await readResearchNote(env, id));
              } else {
                json(res, 200, await listResearchNotes(env));
              }
            } catch (error) {
              json(res, 500, {
                error: error instanceof Error ? error.message : String(error),
              });
            }
          });
          server.middlewares.use("/api/files", async (req, res) => {
            const url = new URL(req.url || "/", "http://127.0.0.1");
            const result = await listWorkspaceFiles(env, url.searchParams.get("path") ?? "");
            json(res, result.status, result.payload);
          });
        },
      },
    ],
    server: {
      port: 5173,
      proxy: {
        "/eve": {
          target: env.VITE_EVE_TARGET || "http://127.0.0.1:4274",
          changeOrigin: true,
        },
      },
    },
  };
});
