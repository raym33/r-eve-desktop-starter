import { defineTool } from "eve/tools";
import { z } from "zod";
import { runRBridge } from "../lib/rBridge.js";

export default defineTool({
  description:
    "Search tools inside the raym33/r catalog by keyword. Use this before r_call_tool when the exact skill or tool name is unknown.",
  inputSchema: z.object({
    query: z.string().min(2),
    limit: z.number().int().min(1).max(50).default(20),
  }),
  async execute({ query, limit }) {
    return runRBridge(["search", query, "--limit", String(limit)]);
  },
});
