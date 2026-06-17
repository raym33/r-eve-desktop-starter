import { defineTool } from "eve/tools";
import { z } from "zod";
import { writeNewWorkspaceFile } from "../lib/workspace.js";

const Source = z.object({
  note: z.string().optional(),
  title: z.string(),
  url: z.string().url(),
});

export default defineTool({
  description:
    "Save a source-backed research note as a Markdown file inside the AI Native OS workspace. Use after web_research or Lexia/BOE research when the user wants to keep the result.",
  inputSchema: z.object({
    title: z.string().min(2).describe("Short title for the research note."),
    question: z.string().min(2).describe("The user's research question."),
    summary: z.string().min(10).describe("Final answer or executive summary."),
    sources: z.array(Source).default([]).describe("Cited sources used in the note."),
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    path: z.string(),
    format: z.literal("markdown"),
  }),
  async execute({ title, question, summary, sources }) {
    const markdown = renderResearchNote({ question, sources, summary, title });
    const path = await writeNewWorkspaceFile("Reports/Research", title, "md", markdown);
    return { ok: true, path, format: "markdown" as const };
  },
});

function renderResearchNote({
  question,
  sources,
  summary,
  title,
}: {
  question: string;
  sources: Array<z.infer<typeof Source>>;
  summary: string;
  title: string;
}) {
  const sourceLines = sources.length
    ? sources.map((source, index) => {
        const note = source.note ? `\n  - ${source.note}` : "";
        return `${index + 1}. [${source.title}](${source.url})${note}`;
      }).join("\n")
    : "No sources were attached.";

  return [
    `# ${title}`,
    "",
    `Created: ${new Date().toISOString()}`,
    "",
    "## Question",
    "",
    question,
    "",
    "## Summary",
    "",
    summary,
    "",
    "## Sources",
    "",
    sourceLines,
    "",
  ].join("\n");
}
