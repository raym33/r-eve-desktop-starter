import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description:
    "Descarga una pagina web concreta y devuelve texto limpio. Usala despues de web_search cuando necesites leer una fuente.",
  inputSchema: z.object({
    url: z.string().url().describe("URL de la pagina que hay que leer."),
  }),
  outputSchema: z.object({
    url: z.string(),
    title: z.string().optional(),
    text: z.string(),
  }),
  async execute({ url }) {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html, text/plain;q=0.9, */*;q=0.5",
        "User-Agent": "Eve LM Studio local research agent",
      },
    });
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 12000);

    return { url, title, text };
  },
});
