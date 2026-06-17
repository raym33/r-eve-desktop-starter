import { defineTool } from "eve/tools";
import { z } from "zod";
import { duplicateToolCallGuard } from "../lib/localToolGuard.js";
import { runRBridge } from "../lib/rBridge.js";

export default defineTool({
  description:
    "List available skills from the locally installed raym33/r project, including tool counts and blocked status. Call this at most once per user request; after the result, answer from it instead of calling it again.",
  inputSchema: z.object({
    limit: z.number().int().min(1).max(100).default(100),
  }),
  async execute({ limit }, ctx) {
    const duplicate = duplicateToolCallGuard(ctx, "r_catalog", { limit });
    if (duplicate) {
      return duplicate;
    }
    const result = await runRBridge(["catalog", "--limit", String(limit)]);
    return {
      ...result,
      answerGuidance:
        "You have the R catalog result. Do not call r_catalog again for this request. Summarize the matching skills/tools for the user now.",
    };
  },
  toModelOutput(output) {
    return {
      type: "json",
      value: output,
    };
  },
});
