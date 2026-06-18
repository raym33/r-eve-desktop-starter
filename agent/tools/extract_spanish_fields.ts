import { defineTool } from "eve/tools";
import { z } from "zod";
import { runRBridge } from "../lib/rBridge.js";

export default defineTool({
  description:
    "Extract Spanish business-document fields: tax IDs (NIF/CIF/NIE), IBANs, euro amounts, dates, invoice numbers, and fiscal forms (modelo 303/347/...) from text. Read-only; pair it after PDF/OCR text extraction.",
  inputSchema: z.object({
    text: z.string().min(1),
  }),
  async execute({ text }) {
    return runRBridge(["extract-es-fields", "--text", text]);
  },
  toModelOutput(output) {
    return {
      type: "json",
      value: output,
    };
  },
});
