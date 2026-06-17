import { defineTool } from "eve/tools";
import { z } from "zod";
import { prepareWhatsAppReply } from "../../agent/lib/experimentalConnectors.js";

export default defineTool({
  description:
    "Experimental safe WhatsApp workflow. Saves a WhatsApp reply as a local Markdown draft in the AI Native OS workspace. Does not contact WhatsApp or Meta.",
  inputSchema: z.object({
    bodyText: z.string().min(1).describe("Message body to prepare."),
    contactLabel: z.string().optional().describe("Human-readable contact label."),
    phoneNumber: z.string().min(5).describe("Destination phone number in international format, without sending."),
  }),
  outputSchema: z.object({
    path: z.string(),
    status: z.literal("local-draft"),
  }),
  async execute(input) {
    return prepareWhatsAppReply(input);
  },
});
