import { defineTool } from "eve/tools";
import { z } from "zod";
import { runRBridge } from "../lib/rBridge.js";

export default defineTool({
  description:
    "List available skills from the locally installed raym33/r project, including tool counts and blocked status.",
  inputSchema: z.object({
    limit: z.number().int().min(1).max(100).default(100),
  }),
  async execute({ limit }) {
    return runRBridge(["catalog", "--limit", String(limit)]);
  },
});
