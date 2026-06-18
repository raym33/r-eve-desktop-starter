// Capability catalog for the "What do you want to do?" front door. Each entry
// maps plain-language intents to a real AI Native OS workflow, the live health
// checks it needs, what the user must provide, and its guardrail. Pure module
// (no React) so it can be unit-tested and reused.
import type { Lang } from "./i18n.js";

export type Verdict = "ready" | "setup" | "unknown";

export type CapabilityCopy = {
  title: string;
  what: string;
  provide: string;
};

export type Capability = {
  id: string;
  // Normalized keywords (Spanish + English) matched against the user's text.
  keywords: string[];
  // Health-check keys that must be "ready" for this to work now.
  needs: string[];
  // Health-check keys that improve the result but are not required.
  optional?: string[];
  // True when acting requires explicit user approval (outward/irreversible).
  guarded?: boolean;
  copy: Record<Lang, CapabilityCopy>;
};

export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export const CAPABILITIES: Capability[] = [
  {
    id: "pdf-summarize",
    keywords: ["pdf", "resum", "summar", "document", "informe", "report", "leer", "read"],
    needs: ["lmstudio", "catalog", "bridge"],
    copy: {
      es: {
        title: "Resumir o leer PDFs",
        what: "Extraigo el texto (con OCR si está escaneado) y te devuelvo un resumen con puntos clave.",
        provide: "la ruta del PDF (o déjalo en la carpeta Inbox del workspace).",
      },
      en: {
        title: "Summarize or read PDFs",
        what: "I extract the text (OCR if scanned) and give you a summary with key points.",
        provide: "the PDF path (or drop it in the workspace Inbox folder).",
      },
    },
  },
  {
    id: "pdf-ocr",
    keywords: ["escanea", "scanned", "scan", "ocr", "buscable", "searchable"],
    needs: ["lmstudio", "catalog", "bridge"],
    copy: {
      es: {
        title: "Convertir un PDF escaneado en buscable",
        what: "Aplico OCR y genero un PDF nuevo con texto seleccionable, sin tocar el original.",
        provide: "la ruta del PDF escaneado y el idioma del documento.",
      },
      en: {
        title: "Make a scanned PDF searchable",
        what: "I run OCR and produce a new selectable-text PDF, leaving the original untouched.",
        provide: "the scanned PDF path and the document language.",
      },
    },
  },
  {
    id: "pdf-edit",
    keywords: ["unir", "combina", "merge", "junta", "fusiona", "extrae", "extract", "paginas", "pages", "rota", "rotate"],
    needs: ["lmstudio", "catalog", "bridge"],
    copy: {
      es: {
        title: "Unir, extraer o rotar páginas de PDF",
        what: "Combino varios PDFs, extraigo páginas o las roto, siempre creando un archivo nuevo.",
        provide: "las rutas de los PDFs y qué páginas o en qué orden.",
      },
      en: {
        title: "Merge, extract or rotate PDF pages",
        what: "I combine PDFs, pull out pages, or rotate them — always into a new file.",
        provide: "the PDF paths and which pages or order.",
      },
    },
  },
  {
    id: "email-draft",
    keywords: ["redacta", "draft", "escribe", "write", "borrador", "email", "correo", "mensaje", "message"],
    needs: ["lmstudio"],
    copy: {
      es: {
        title: "Redactar un email o mensaje",
        what: "Escribo el borrador por ti. No envío nada: te lo enseño para que lo revises.",
        provide: "a quién va dirigido y qué quieres decir.",
      },
      en: {
        title: "Draft an email or message",
        what: "I write the draft for you. I never send it — I show it so you can review.",
        provide: "who it is for and what you want to say.",
      },
    },
  },
  {
    id: "email-send",
    keywords: ["envia", "enviar", "send", "manda", "mandar"],
    needs: ["lmstudio", "catalog", "bridge"],
    guarded: true,
    copy: {
      es: {
        title: "Enviar un email",
        what: "Preparo el correo y, antes de enviarlo, te muestro a quién, el asunto y el cuerpo para que apruebes.",
        provide: "la configuración de tu correo (SMTP) y el destinatario.",
      },
      en: {
        title: "Send an email",
        what: "I prepare the email and, before sending, show you the recipient, subject and body to approve.",
        provide: "your email (SMTP) settings and the recipient.",
      },
    },
  },
  {
    id: "boe",
    keywords: ["ley", "leyes", "boe", "legislacion", "law", "statute", "norma", "decreto", "articulo", "article"],
    needs: ["lmstudio"],
    copy: {
      es: {
        title: "Consultar una ley en el BOE",
        what: "Busco la norma en el BOE y te doy el título, la fuente oficial y el enlace.",
        provide: "el nombre de la ley o su identificador (p. ej. BOE-A-1978-31229).",
      },
      en: {
        title: "Look up a Spanish law (BOE)",
        what: "I find the statute in the BOE and give you the title, official source and link.",
        provide: "the law name or its id (e.g. BOE-A-1978-31229).",
      },
    },
  },
  {
    id: "legal",
    keywords: ["legal", "abogado", "lawyer", "despido", "contrato", "demanda", "juridic", "requerimiento", "clausula"],
    needs: ["lmstudio", "lexia"],
    copy: {
      es: {
        title: "Investigación legal con citas (Lexia)",
        what: "Recupero fuentes legales con cita y te doy una respuesta con referencias. Es información general, para revisar con un abogado.",
        provide: "tu pregunta legal en español.",
      },
      en: {
        title: "Cited legal research (Lexia)",
        what: "I retrieve cited legal sources and answer with references. This is general information, to review with a lawyer.",
        provide: "your legal question in Spanish.",
      },
    },
  },
  {
    id: "research",
    keywords: ["busca", "buscar", "web", "internet", "search", "investiga", "research", "noticia", "news", "fuente", "source"],
    needs: ["lmstudio"],
    optional: ["search"],
    copy: {
      es: {
        title: "Buscar en la web y crear notas con fuentes",
        what: "Busco en internet, leo las páginas y redacto notas con los enlaces de las fuentes.",
        provide: "qué quieres investigar.",
      },
      en: {
        title: "Search the web and write cited notes",
        what: "I search the web, read the pages, and write notes with the source links.",
        provide: "what you want to research.",
      },
    },
  },
  {
    id: "files",
    keywords: ["archivo", "archivos", "file", "files", "ordena", "organiza", "organize", "carpeta", "folder", "renombra", "rename", "mueve", "move", "guarda", "save"],
    needs: ["lmstudio", "catalog", "bridge"],
    copy: {
      es: {
        title: "Ordenar y guardar archivos",
        what: "Organizo, renombro y guardo documentos dentro de tu workspace, conservando los originales.",
        provide: "la carpeta de trabajo (dentro del workspace).",
      },
      en: {
        title: "Organize and save files",
        what: "I organize, rename and save documents inside your workspace, keeping the originals.",
        provide: "the folder to work in (inside the workspace).",
      },
    },
  },
  {
    id: "data",
    keywords: ["csv", "tabla", "table", "base de datos", "database", "sqlite", "cliente", "client", "datos", "data", "factura", "invoice"],
    needs: ["lmstudio", "catalog", "bridge"],
    copy: {
      es: {
        title: "Tablas y datos de clientes",
        what: "Importo CSV, consulto tablas y mantengo una base de datos local sencilla (p. ej. tus clientes).",
        provide: "el archivo de datos o qué quieres consultar.",
      },
      en: {
        title: "Tables and client data",
        what: "I import CSVs, query tables, and keep a simple local database (e.g. your clients).",
        provide: "the data file or what you want to query.",
      },
    },
  },
];

export function matchCapabilities(text: string, limit = 3): Capability[] {
  const haystack = normalize(text);
  if (!haystack.trim()) {
    return [];
  }
  const scored = CAPABILITIES.map((capability) => {
    const score = capability.keywords.reduce(
      (total, keyword) => (haystack.includes(keyword) ? total + 1 : total),
      0,
    );
    return { capability, score };
  })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((entry) => entry.capability);
}

export type ReadyKeys = ReadonlySet<string>;

export function assessCapability(
  capability: Capability,
  readyKeys: ReadyKeys,
): { verdict: Verdict; missing: string[] } {
  const missing = capability.needs.filter((key) => !readyKeys.has(key));
  return { verdict: missing.length === 0 ? "ready" : "setup", missing };
}
