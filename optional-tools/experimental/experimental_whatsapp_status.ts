import { defineTool } from "eve/tools";
import { z } from "zod";
import { whatsappStatus } from "#lib/experimentalConnectors.js";

export default defineTool({
  description:
    "Experimental. Check whether the WhatsApp Business Cloud API connector is configured and whether guarded sending is enabled.",
  inputSchema: z.object({}),
  outputSchema: z.object({
    configured: z.boolean(),
    missing: z.array(z.string()),
    mode: z.enum(["read", "draft", "send-disabled", "send-enabled"]),
    provider: z.string().optional(),
    safety: z.array(z.string()),
  }),
  async execute() {
    return whatsappStatus();
  },
});
