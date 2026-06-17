import { defineTool } from "eve/tools";
import { z } from "zod";
import { runRBridge } from "../lib/rBridge.js";

export default defineTool({
  description:
    "Create a safe draft for a missing R skill. Use only after r_search_tools cannot find a good existing fit. Drafts are not installed or executed automatically.",
  inputSchema: z.object({
    request: z.string().min(10).describe("User capability request that needs a new skill."),
    suggestedName: z
      .string()
      .min(2)
      .optional()
      .describe("Optional snake_case-ish name for the draft skill."),
    force: z.boolean().default(false).describe("Overwrite an existing draft with the same name."),
  }),
  async execute({ request, suggestedName, force }) {
    const args = ["draft-skill", "--request", request];
    if (suggestedName) {
      args.push("--suggested-name", suggestedName);
    }
    if (force) {
      args.push("--force");
    }
    return runRBridge(args);
  },
});
