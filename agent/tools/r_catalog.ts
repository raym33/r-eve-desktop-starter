import { defineTool } from "eve/tools";
import { z } from "zod";
import { runRBridge } from "../lib/rBridge.js";

export default defineTool({
  description:
    "Lista las skills disponibles del proyecto raym33/r instalado localmente, con numero de tools y estado de bloqueo.",
  inputSchema: z.object({
    limit: z.number().int().min(1).max(100).default(100),
  }),
  async execute({ limit }) {
    return runRBridge(["catalog", "--limit", String(limit)]);
  },
});
