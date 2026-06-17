import { defineTool } from "eve/tools";
import { z } from "zod";
import { isGuardedTool } from "../lib/guardedTools.js";
import { duplicateToolCallGuard } from "../lib/localToolGuard.js";
import { runRBridge } from "../lib/rBridge.js";

export default defineTool({
  description:
    "Execute one specific tool from the raym33/r project. Use r_search_tools or r_catalog first when the exact schema is unknown. Outward or irreversible tools (such as sending an email) are gated: the app shows the user an approval prompt and runs the tool only after they approve. Call the tool normally; do not try to bypass the prompt.",
  inputSchema: z.object({
    skill: z.string().describe("R skill name, for example math, json, rss, pdf, git."),
    tool: z.string().describe("Tool name inside that skill."),
    params: z.record(z.string(), z.unknown()).default({}).describe("JSON arguments for the tool."),
  }),
  // Real human-in-the-loop gate: for outward or irreversible tools, Eve pauses
  // and asks the user to approve before this tool runs. The model cannot skip it.
  needsApproval: ({ toolInput }) => isGuardedTool(toolInput?.skill, toolInput?.tool),
  async execute({ skill, tool, params }, ctx) {
    const duplicate = duplicateToolCallGuard(ctx, "r_call_tool", { params, skill, tool });
    if (duplicate) {
      return duplicate;
    }
    const args = ["call", skill, tool, "--params", JSON.stringify(params)];
    // Reaching execute for a guarded tool means the user already approved via the
    // Eve approval prompt, so confirm the bridge-level gate too (avoids a double
    // confirmation). The bridge gate still protects non-UI callers.
    if (isGuardedTool(skill, tool)) {
      args.push("--confirm");
    }
    const result = await runRBridge(args);
    return {
      ...result,
      answerGuidance:
        "The requested R tool has already run. Do not repeat the same tool call unless the user changes the input. Explain the result now.",
    };
  },
  toModelOutput(output) {
    return {
      type: "json",
      value: output,
    };
  },
});
