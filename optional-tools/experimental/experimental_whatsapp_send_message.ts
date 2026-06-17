import { defineTool } from "eve/tools";
import { z } from "zod";
import { sendWhatsAppMessage } from "../../agent/lib/experimentalConnectors.js";

export default defineTool({
  description:
    "Experimental guarded WhatsApp Business Cloud API sender. Requires WHATSAPP_EXPERIMENTAL_SEND=1 and explicit human approval. Use prepare_reply first whenever possible.",
  inputSchema: z.object({
    bodyText: z.string().min(1).max(4096).describe("WhatsApp text message body."),
    contactLabel: z.string().optional().describe("Human-readable contact label for approval context."),
    phoneNumber: z.string().min(5).describe("Destination phone number in international format."),
  }),
  outputSchema: z.object({
    messageId: z.string().optional(),
    phoneNumber: z.string(),
    status: z.literal("sent"),
  }),
  needsApproval: () => true,
  async execute(input) {
    return sendWhatsAppMessage(input);
  },
});
