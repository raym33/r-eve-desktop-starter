import { defineTool } from "eve/tools";
import { z } from "zod";
import { lexiaAnswer } from "#lib/lexia.js";

export default defineTool({
  description:
    "Ask the local Lexia RAG service to produce a cited Spanish legal answer ([n] citations grounded in BOE sources). Use when Lexia should write the answer itself. Always relay the citations and remind the user it is general legal information for a lawyer to review, not personalized legal advice. If the service is offline, the result explains how to start it.",
  inputSchema: z.object({
    query: z.string().min(3).describe("Legal question in Spanish."),
    k: z.number().int().min(1).max(20).default(6).describe("Number of grounding sources (max 20)."),
  }),
  async execute({ query, k }) {
    return lexiaAnswer(query, k);
  },
});
