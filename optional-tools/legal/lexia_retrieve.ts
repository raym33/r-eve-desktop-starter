import { defineTool } from "eve/tools";
import { z } from "zod";
import { lexiaRetrieve } from "#lib/lexia.js";

export default defineTool({
  description:
    "Retrieve cited Spanish legal sources from the local Lexia RAG service before writing a legal answer. Returns numbered sources ([1], [2], ...) with citation, BOE url, and text. Use this when you will write the final answer yourself; preserve the source numbers exactly. Prefer Lexia over boe_query for legal research. If the service is offline, the result explains how to start it.",
  inputSchema: z.object({
    query: z.string().min(3).describe("Legal question in Spanish, e.g. '¿Cuándo cabe el despido disciplinario?'."),
    k: z.number().int().min(1).max(20).default(6).describe("Number of sources to retrieve (max 20)."),
  }),
  async execute({ query, k }) {
    return lexiaRetrieve(query, k);
  },
});
