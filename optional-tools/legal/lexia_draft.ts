import { defineTool } from "eve/tools";
import { z } from "zod";
import { lexiaDraft } from "../../agent/lib/lexia.js";

export default defineTool({
  description:
    "Draft a Spanish legal document with the local Lexia RAG service (cited, with placeholders such as {{nombre del cliente}}). For lawyer-reviewed drafts only, never a final filing. Always tell the user the draft must be reviewed by a lawyer and that placeholders need filling. If the service is offline, the result explains how to start it.",
  inputSchema: z.object({
    tipo: z
      .string()
      .describe("Document type: demanda, contrato, recurso, requerimiento, clausula, dictamen, or free text."),
    hechos: z.string().min(5).describe("Facts and context for the document, in Spanish."),
    instrucciones: z.string().optional().describe("Optional drafting instructions, e.g. tone or deadlines."),
    k: z.number().int().min(1).max(20).default(6).describe("Number of grounding sources (max 20)."),
  }),
  async execute({ tipo, hechos, instrucciones, k }) {
    return lexiaDraft(tipo, hechos, instrucciones, k);
  },
});
