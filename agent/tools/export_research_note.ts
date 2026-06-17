import { defineTool } from "eve/tools";
import { z } from "zod";
import { markdownToPlainText, plainTextPdf } from "../lib/simplePdf.js";
import { readResearchMarkdown, writeNewWorkspaceBuffer, writeNewWorkspaceFile } from "../lib/workspace.js";

export default defineTool({
  description:
    "Export a saved research Markdown note to PDF and/or clipboard-safe plain text files inside the AI Native OS workspace.",
  inputSchema: z.object({
    id: z.string().min(1).describe("Saved research note filename, for example 20260617T-topic.md."),
    formats: z.array(z.enum(["pdf", "txt"])).default(["txt"]).describe("Export formats."),
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    source: z.string(),
    outputs: z.array(z.object({ format: z.enum(["pdf", "txt"]), path: z.string() })),
  }),
  async execute({ id, formats }) {
    const note = await readResearchMarkdown(id);
    const text = markdownToPlainText(note.markdown);
    const outputs: Array<{ format: "pdf" | "txt"; path: string }> = [];

    if (formats.includes("txt")) {
      outputs.push({
        format: "txt",
        path: await writeNewWorkspaceFile("Reports/Research/Exports", note.title, "txt", text),
      });
    }

    if (formats.includes("pdf")) {
      outputs.push({
        format: "pdf",
        path: await writeNewWorkspaceBuffer(
          "Reports/Research/Exports",
          note.title,
          "pdf",
          plainTextPdf(note.title, text),
        ),
      });
    }

    return {
      ok: true,
      source: note.path,
      outputs,
    };
  },
});
