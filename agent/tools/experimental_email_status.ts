import { defineTool } from "eve/tools";
import { z } from "zod";
import { emailStatus } from "../lib/experimentalConnectors.js";

export default defineTool({
  description:
    "Experimental. Check whether the secure email connector is configured. It reports provider, missing env vars, and safety rules without exposing secrets.",
  inputSchema: z.object({}),
  outputSchema: z.object({
    configured: z.boolean(),
    missing: z.array(z.string()),
    mode: z.enum(["read", "draft", "send-disabled", "send-enabled"]),
    provider: z.string().optional(),
    safety: z.array(z.string()),
  }),
  async execute() {
    return emailStatus();
  },
});
