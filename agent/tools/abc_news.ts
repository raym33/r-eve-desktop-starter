import { defineTool } from "eve/tools";
import { z } from "zod";

const FeedKind = z.enum(["portada", "ultima_hora"]);

const NewsItem = z.object({
  title: z.string(),
  url: z.string(),
  summary: z.string(),
  publishedAt: z.string(),
});

const NewsOutput = z.object({
  source: z.string(),
  feed: FeedKind,
  updatedAt: z.string().optional(),
  items: z.array(NewsItem),
});

type NewsItem = z.infer<typeof NewsItem>;

const FEEDS: Record<z.infer<typeof FeedKind>, string> = {
  portada: "https://www.abc.es/rss/2.0/portada",
  ultima_hora: "https://www.abc.es/rss/atom/ultima-hora",
};

export default defineTool({
  description:
    "Lee directamente los titulares de ABC.es desde sus feeds oficiales. Usala para preguntas como 'las 3 noticias mas importantes en abc.es', 'portada de ABC' o 'ultima hora en ABC'.",
  inputSchema: z.object({
    feed: FeedKind.default("portada").describe("Usa portada para noticias destacadas y ultima_hora para las mas recientes."),
    limit: z.number().int().min(1).max(10).default(3).describe("Numero de noticias a devolver."),
  }),
  outputSchema: NewsOutput,
  async execute({ feed, limit }) {
    const response = await fetch(FEEDS[feed], {
      headers: {
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
        "User-Agent": "Eve LM Studio local ABC news reader",
      },
    });

    if (!response.ok) {
      throw new Error(`ABC feed failed: ${response.status} ${response.statusText}`);
    }

    const xml = await response.text();
    return {
      source: "ABC.es",
      feed,
      updatedAt: firstMatch(xml, /<(?:lastBuildDate|updated)>([\s\S]*?)<\/(?:lastBuildDate|updated)>/),
      items: parseFeed(xml, feed).slice(0, limit),
    };
  },
});

function parseFeed(xml: string, feed: z.infer<typeof FeedKind>): NewsItem[] {
  if (feed === "ultima_hora") {
    return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((match) => {
      const entry = match[1] ?? "";
      return {
        title: clean(firstMatch(entry, /<title>([\s\S]*?)<\/title>/)),
        url: clean(firstMatch(entry, /<link[^>]+rel="alternate"[^>]+href="([^"]+)"/)),
        summary: clean(firstMatch(entry, /<summary>([\s\S]*?)<\/summary>/)),
        publishedAt: clean(firstMatch(entry, /<updated>([\s\S]*?)<\/updated>/)),
      };
    });
  }

  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => {
    const item = match[1] ?? "";
    return {
      title: clean(firstMatch(item, /<title>([\s\S]*?)<\/title>/)),
      url: clean(firstMatch(item, /<link>([\s\S]*?)<\/link>/)),
      summary: clean(firstMatch(item, /<description>([\s\S]*?)<\/description>/)).slice(0, 900),
      publishedAt: clean(firstMatch(item, /<pubDate>([\s\S]*?)<\/pubDate>/)),
    };
  });
}

function firstMatch(input: string, regex: RegExp) {
  return input.match(regex)?.[1] ?? "";
}

function clean(value: string) {
  return decodeXml(value)
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeXml(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)));
}
