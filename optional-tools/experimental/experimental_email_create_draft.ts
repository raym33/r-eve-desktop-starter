import { defineTool } from "eve/tools";
import { z } from "zod";
import { createEmailDraft } from "../../agent/lib/experimentalConnectors.js";

const DraftInput = z.object({
  bodyText: z.string().min(1).describe("Plain-text body for the email draft."),
  cc: z.array(z.string().email()).default([]).describe("Optional CC recipients."),
  subject: z.string().min(1).describe("Email subject."),
  to: z.array(z.string().email()).min(1).describe("Recipients."),
});

export default defineTool({
  description:
    "Experimental guarded email connector. Creates a Gmail or Microsoft 365 draft using OAuth from the environment. It never sends email; it only writes a draft after human approval.",
  inputSchema: DraftInput,
  outputSchema: z.object({
    id: z.string(),
    provider: z.enum(["gmail", "microsoft"]),
    status: z.literal("draft-created"),
    webUrl: z.string().optional(),
  }),
  needsApproval: () => true,
  async execute(input) {
    const draft = await createEmailDraft(input);
    return {
      ...draft,
      status: "draft-created" as const,
    };
  },
});
