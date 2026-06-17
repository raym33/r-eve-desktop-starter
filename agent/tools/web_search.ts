import { defineTool } from "eve/tools";
import { z } from "zod";

const SearchResult = z.object({
  title: z.string(),
  url: z.string(),
  snippet: z.string(),
  source: z.string(),
});

const SearchOutput = z.object({
  query: z.string(),
  provider: z.string(),
  results: z.array(SearchResult),
});

type SearchResult = z.infer<typeof SearchResult>;

export default defineTool({
  description:
    "Search the current web. Use it for news, recent facts, links, prices, current documentation, or anything that may have changed.",
  inputSchema: z.object({
    query: z.string().min(2).describe("Web search query."),
    maxResults: z.number().int().min(1).max(8).default(5).describe("Maximum number of results."),
  }),
  outputSchema: SearchOutput,
  async execute({ query, maxResults }) {
    if (process.env.SEARXNG_URL) {
      return {
        query,
        provider: "searxng",
        results: await searchSearxng(query, maxResults),
      };
    }

    if (process.env.BRAVE_SEARCH_API_KEY) {
      return {
        query,
        provider: "brave",
        results: await searchBrave(query, maxResults),
      };
    }

    if (process.env.TAVILY_API_KEY) {
      return {
        query,
        provider: "tavily",
        results: await searchTavily(query, maxResults),
      };
    }

    return {
      query,
      provider: "duckduckgo-instant-answer",
      results: await searchDuckDuckGoInstantAnswer(query, maxResults),
    };
  },
});

async function searchSearxng(query: string, maxResults: number): Promise<SearchResult[]> {
  const baseUrl = process.env.SEARXNG_URL?.replace(/\/$/, "");
  const url = new URL(`${baseUrl}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("language", "en-US");

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`SearXNG search failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as {
    results?: Array<{ title?: string; url?: string; content?: string; engine?: string }>;
  };

  return (data.results ?? [])
    .filter((item) => item.title && item.url)
    .slice(0, maxResults)
    .map((item) => ({
      title: item.title ?? "",
      url: item.url ?? "",
      snippet: item.content ?? "",
      source: item.engine ?? "searxng",
    }));
}

async function searchBrave(query: string, maxResults: number): Promise<SearchResult[]> {
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(maxResults));
  url.searchParams.set("search_lang", "en");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY ?? "",
    },
  });
  if (!response.ok) {
    throw new Error(`Brave search failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as {
    web?: { results?: Array<{ title?: string; url?: string; description?: string }> };
  };

  return (data.web?.results ?? []).slice(0, maxResults).map((item) => ({
    title: item.title ?? "",
    url: item.url ?? "",
    snippet: item.description ?? "",
    source: "brave",
  }));
}

async function searchTavily(query: string, maxResults: number): Promise<SearchResult[]> {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      max_results: maxResults,
      search_depth: "basic",
      include_answer: false,
    }),
  });
  if (!response.ok) {
    throw new Error(`Tavily search failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as {
    results?: Array<{ title?: string; url?: string; content?: string }>;
  };

  return (data.results ?? []).slice(0, maxResults).map((item) => ({
    title: item.title ?? "",
    url: item.url ?? "",
    snippet: item.content ?? "",
    source: "tavily",
  }));
}

async function searchDuckDuckGoInstantAnswer(
  query: string,
  maxResults: number,
): Promise<SearchResult[]> {
  const url = new URL("https://api.duckduckgo.com/");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("no_html", "1");
  url.searchParams.set("skip_disambig", "1");

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`DuckDuckGo instant answer failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as {
    AbstractText?: string;
    AbstractURL?: string;
    Heading?: string;
    RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>;
  };

  const results: SearchResult[] = [];
  if (data.AbstractText && data.AbstractURL) {
    results.push({
      title: data.Heading || query,
      url: data.AbstractURL,
      snippet: data.AbstractText,
      source: "duckduckgo",
    });
  }

  for (const item of data.RelatedTopics ?? []) {
    if (results.length >= maxResults) {
      break;
    }
    if (item.Text && item.FirstURL) {
      results.push({
        title: item.Text.split(" - ")[0] ?? item.Text,
        url: item.FirstURL,
        snippet: item.Text,
        source: "duckduckgo",
      });
    }
  }

  return results.slice(0, maxResults);
}
