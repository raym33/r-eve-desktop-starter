// Client for the local Lexia Spanish legal RAG service (raym33/lexia).
// Endpoints: /api/agent/health, /retrieve, /answer, /draft. The service runs
// separately (default http://localhost:5174) and may be offline, so callers get
// a clear, non-throwing message instead of an opaque network error.
const LEXIA_BASE_URL = (process.env.LEXIA_BASE_URL ?? "http://localhost:5174").replace(/\/+$/, "");
const LEXIA_AGENT_TOKEN = process.env.LEXIA_AGENT_TOKEN ?? "";
const REQUEST_TIMEOUT_MS = 60_000;

export type LexiaResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; serviceDown?: boolean };

function headers(): Record<string, string> {
  const base: Record<string, string> = { "content-type": "application/json" };
  if (LEXIA_AGENT_TOKEN) {
    base.Authorization = `Bearer ${LEXIA_AGENT_TOKEN}`;
  }
  return base;
}

async function lexiaPost<T>(path: string, body: unknown): Promise<LexiaResult<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${LEXIA_BASE_URL}${path}`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return {
        ok: false,
        error: `Lexia ${path} failed: ${response.status} ${response.statusText}. ${detail.slice(0, 300)}`.trim(),
      };
    }
    return { ok: true, data: (await response.json()) as T };
  } catch (error) {
    return {
      ok: false,
      serviceDown: true,
      error: `Lexia service not reachable at ${LEXIA_BASE_URL}. Start it with \`npm start\` in the lexia repo, then retry. (${
        error instanceof Error ? error.message : String(error)
      })`,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function lexiaRetrieve(query: string, k: number): Promise<LexiaResult<unknown>> {
  return lexiaPost("/api/agent/retrieve", { query, k });
}

export async function lexiaAnswer(query: string, k: number): Promise<LexiaResult<unknown>> {
  return lexiaPost("/api/agent/answer", { query, k });
}

export async function lexiaDraft(
  tipo: string,
  hechos: string,
  instrucciones: string | undefined,
  k: number,
): Promise<LexiaResult<unknown>> {
  return lexiaPost("/api/agent/draft", { tipo, hechos, instrucciones, k });
}
