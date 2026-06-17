import { defineTool } from "eve/tools";
import { z } from "zod";
import { runRBridge } from "../lib/rBridge.js";

export default defineTool({
  description:
    "Busca tools dentro del catalogo raym33/r por palabra clave. Usala antes de r_call_tool cuando no sepas el nombre exacto de skill/tool.",
  inputSchema: z.object({
    query: z.string().min(2),
    limit: z.number().int().min(1).max(50).default(20),
  }),
  async execute({ query, limit }) {
    return runRBridge(["search", query, "--limit", String(limit)]);
  },
});
