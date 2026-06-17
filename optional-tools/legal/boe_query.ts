import { defineTool } from "eve/tools";
import { z } from "zod";

// Spanish official gazette (Boletín Oficial del Estado) open-data API for
// consolidated legislation. Read-only; no API key required.
// Pattern adapted from raym33/lexia's BOE ingestor.
const API = "https://www.boe.es/datosabiertos/api/legislacion-consolidada";
const PAGE_SIZE = 500;
const REQUEST_TIMEOUT_MS = 25_000;

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

async function getJson(url: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "Eve R Workbench (local)" },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`BOE request failed: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

const lawSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  departamento: z.string().optional(),
  rango: z.string().optional(),
  fechaPublicacion: z.string().optional(),
  estadoConsolidacion: z.string().optional(),
  urlConsolidada: z.string().optional(),
});

export default defineTool({
  description:
    "Query the Spanish official gazette (BOE) consolidated-legislation open data. Use `id` (e.g. BOE-A-1978-31229) for an authoritative lookup of a specific law, or `query` for a best-effort keyword search over a bounded slice of the index. Returns titles and the consolidated HTML URL; read the full text with fetch_page on that URL. For exhaustive search, find the BOE-A id with web_search first, then look it up here. Read-only; no approval needed.",
  inputSchema: z.object({
    id: z
      .string()
      .optional()
      .describe("BOE consolidated-law identifier, for example BOE-A-1978-31229. Most reliable mode."),
    query: z
      .string()
      .optional()
      .describe("Free-text keywords matched against law titles over a bounded slice of the index."),
    maxResults: z.number().int().min(1).max(20).default(8).describe("Max results for keyword search."),
    scanPages: z
      .number()
      .int()
      .min(1)
      .max(12)
      .default(4)
      .describe("How many index pages of 500 to scan in keyword mode. Higher is slower but covers more."),
  }),
  outputSchema: z.object({
    mode: z.enum(["law", "search"]),
    law: lawSchema.nullable().optional(),
    results: z.array(lawSchema).optional(),
    scanned: z.number().optional(),
    note: z.string(),
  }),
  async execute({ id, query, maxResults, scanPages }) {
    if (!id && !query) {
      throw new Error("Provide either an `id` (BOE-A-...) or a `query` keyword.");
    }

    if (id) {
      const clean = id.trim().toUpperCase();
      if (!/^BOE-[A-Z]-\d{4}-\d+$/.test(clean)) {
        throw new Error(`'${id}' does not look like a BOE consolidated id (expected e.g. BOE-A-1978-31229).`);
      }
      const payload = await getJson(`${API}/id/${clean}/metadatos`);
      const item = Array.isArray(payload?.data) ? payload.data[0] : payload?.data;
      if (!item) {
        return {
          mode: "law" as const,
          law: null,
          note: `No consolidated law found for ${clean}. Check the id or search the BOE website.`,
        };
      }
      return {
        mode: "law" as const,
        law: {
          id: item.identificador ?? clean,
          titulo: item.titulo ?? "",
          departamento: item.departamento?.texto,
          rango: item.rango?.texto,
          fechaPublicacion: item.fecha_publicacion,
          estadoConsolidacion: item.estado_consolidacion?.texto,
          urlConsolidada: item.url_html_consolidada ?? `https://www.boe.es/buscar/act.php?id=${clean}`,
        },
        note: "Authoritative metadata. Read the full consolidated text with fetch_page on urlConsolidada.",
      };
    }

    const tokens = normalize(query!).split(/\s+/).filter(Boolean);
    const matches: z.infer<typeof lawSchema>[] = [];
    let scanned = 0;
    for (let page = 0; page < scanPages && matches.length < maxResults; page += 1) {
      const payload = await getJson(`${API}?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`);
      const items: any[] = Array.isArray(payload?.data) ? payload.data : [];
      if (items.length === 0) {
        break;
      }
      scanned += items.length;
      for (const item of items) {
        const title = String(item.titulo ?? "");
        const haystack = normalize(title);
        if (tokens.every((token) => haystack.includes(token))) {
          matches.push({
            id: item.identificador ?? "",
            titulo: title,
            departamento: item.departamento?.texto,
            rango: item.rango?.texto,
            fechaPublicacion: item.fecha_publicacion,
            estadoConsolidacion: item.estado_consolidacion?.texto,
            urlConsolidada:
              item.url_html_consolidada ??
              (item.identificador ? `https://www.boe.es/buscar/act.php?id=${item.identificador}` : undefined),
          });
          if (matches.length >= maxResults) {
            break;
          }
        }
      }
    }

    return {
      mode: "search" as const,
      results: matches,
      scanned,
      note:
        matches.length > 0
          ? `Bounded keyword search over ${scanned} consolidated laws. Read full text with fetch_page on urlConsolidada.`
          : `No title matched in the scanned ${scanned} laws. Try web_search to find the BOE-A id, then look it up by id, or raise scanPages.`,
    };
  },
});
