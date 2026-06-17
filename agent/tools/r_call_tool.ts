import { defineTool } from "eve/tools";
import { z } from "zod";
import { runRBridge } from "../lib/rBridge.js";

export default defineTool({
  description:
    "Ejecuta una tool concreta del proyecto raym33/r. Primero usa r_search_tools o r_catalog si no sabes el esquema exacto.",
  inputSchema: z.object({
    skill: z.string().describe("Nombre de la skill de R, por ejemplo math, json, rss, pdf, git."),
    tool: z.string().describe("Nombre de la tool dentro de esa skill."),
    params: z.record(z.string(), z.unknown()).default({}).describe("Argumentos JSON para la tool."),
  }),
  async execute({ skill, tool, params }) {
    return runRBridge(["call", skill, tool, "--params", JSON.stringify(params)]);
  },
});
