import { defineTool } from "eve/tools";
import { z } from "zod";
import { listEmailMessages } from "../../agent/lib/experimentalConnectors.js";

export default defineTool({
  description:
    "Experimental read-only email connector. Lists recent Gmail or Microsoft 365 messages using an OAuth token from the environment. Returns metadata and snippets only, not full bodies.",
  inputSchema: z.object({
    limit: z.number().int().min(1).max(20).default(10).describe("Maximum messages to list."),
    query: z.string().optional().describe("Provider search query, for example from:client@example.com or invoice."),
  }),
  outputSchema: z.object({
    messages: z.array(
      z.object({
        date: z.string().optional(),
        from: z.string().optional(),
        id: z.string(),
        provider: z.enum(["gmail", "microsoft"]),
        snippet: z.string().optional(),
        subject: z.string().optional(),
      }),
    ),
    safety: z.string(),
  }),
  async execute({ limit, query }) {
    return {
      messages: await listEmailMessages({ limit, query }),
      safety: "Read-only metadata/snippet listing. No email was sent or modified.",
    };
  },
});
