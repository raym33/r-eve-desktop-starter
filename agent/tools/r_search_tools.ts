import { defineTool } from "eve/tools";
import { z } from "zod";
import { duplicateToolCallGuard } from "../lib/localToolGuard.js";
import { runRBridge } from "../lib/rBridge.js";

export default defineTool({
  description:
    "Search tools inside the raym33/r catalog by keyword. Use this before r_call_tool when the exact skill or tool name is unknown. Do not repeat the same query in one request; answer from the first result.",
  inputSchema: z.object({
    query: z.string().min(2),
    limit: z.number().int().min(1).max(50).default(20),
  }),
  async execute({ query, limit }, ctx) {
    const duplicate = duplicateToolCallGuard(ctx, "r_search_tools", { limit, query });
    if (duplicate) {
      return duplicate;
    }
    const result = await runRBridge(["search", query, "--limit", String(limit)]);
    return {
      ...result,
      answerGuidance:
        "You have the tool search result. Do not repeat r_search_tools with the same query. Pick the best match or ask one concise follow-up question.",
    };
  },
  toModelOutput(output) {
    return {
      type: "json",
      value: output,
    };
  },
});
