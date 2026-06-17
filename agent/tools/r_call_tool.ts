import { defineTool } from "eve/tools";
import { z } from "zod";
import { runRBridge } from "../lib/rBridge.js";

export default defineTool({
  description:
    "Execute one specific tool from the raym33/r project. Use r_search_tools or r_catalog first when the exact schema is unknown.",
  inputSchema: z.object({
    skill: z.string().describe("R skill name, for example math, json, rss, pdf, git."),
    tool: z.string().describe("Tool name inside that skill."),
    params: z.record(z.string(), z.unknown()).default({}).describe("JSON arguments for the tool."),
  }),
  async execute({ skill, tool, params }) {
    return runRBridge(["call", skill, tool, "--params", JSON.stringify(params)]);
  },
});
