import {
  FileText,
  FolderKanban,
  FolderOpen,
  Globe,
  Mail,
  Receipt,
  Scale,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import type { Lang } from "./i18n.js";

export type OsApp = {
  id: string;
  icon: LucideIcon;
  label: Record<Lang, string>;
  kind: "prompt" | "explorer";
  prompt?: Record<Lang, string>;
};

export const OS_APPS: OsApp[] = [
  {
    id: "summarize-pdf",
    icon: FileText,
    label: { es: "Resume un PDF", en: "Summarize a PDF" },
    kind: "prompt",
    prompt: {
      es: "Quiero resumir un PDF. Pideme la ruta del archivo y dime que necesitas.",
      en: "I want to summarize a PDF. Ask me for the file path and tell me what you need.",
    },
  },
  {
    id: "draft-email",
    icon: Mail,
    label: { es: "Redacta un email", en: "Draft an email" },
    kind: "prompt",
    prompt: {
      es: "Quiero redactar un email. Preguntame el destinatario y que quiero decir. No lo envies sin mi aprobacion.",
      en: "I want to draft an email. Ask me for the recipient and what I want to say. Do not send it without my approval.",
    },
  },
  {
    id: "boe-law",
    icon: Scale,
    label: { es: "Consulta una ley (BOE)", en: "Look up a law (BOE)" },
    kind: "prompt",
    prompt: {
      es: "Quiero consultar una ley espanola en el BOE. Preguntame el nombre o el identificador BOE-A.",
      en: "I want to look up a Spanish law in the BOE. Ask me for the name or BOE-A identifier.",
    },
  },
  {
    id: "web-research",
    icon: Globe,
    label: { es: "Investiga en la web", en: "Research the web" },
    kind: "prompt",
    prompt: {
      es: "Quiero investigar algo en la web y obtener notas con fuentes. Preguntame el tema.",
      en: "I want to research something on the web and get notes with sources. Ask me for the topic.",
    },
  },
  {
    id: "organize-files",
    icon: FolderKanban,
    label: { es: "Ordena archivos", en: "Organize files" },
    kind: "prompt",
    prompt: {
      es: "Quiero organizar archivos de mi carpeta de trabajo conservando los originales. Preguntame que carpeta.",
      en: "I want to organize files in my workspace while keeping the originals. Ask me which folder.",
    },
  },
  {
    id: "spanish-invoice",
    icon: Receipt,
    label: { es: "Datos de una factura", en: "Invoice data" },
    kind: "prompt",
    prompt: {
      es: "Quiero extraer los datos de una factura espanola (NIF, IBAN, importes, fechas). Pideme el archivo y usa la herramienta de extraccion tras leer el texto.",
      en: "I want to extract data from a Spanish invoice (NIF, IBAN, amounts, dates). Ask me for the file and use the extraction tool after reading the text.",
    },
  },
  {
    id: "file-explorer",
    icon: FolderOpen,
    label: { es: "Explorador de archivos", en: "File Explorer" },
    kind: "explorer",
  },
  {
    id: "diagnostics",
    icon: Stethoscope,
    label: { es: "Comprobar el sistema", en: "Check the system" },
    kind: "prompt",
    prompt: {
      es: "Comprueba que esta listo en mi sistema (LM Studio, modelo, herramientas) y dime que falta.",
      en: "Check what is ready on my system (LM Studio, model, tools) and tell me what is missing.",
    },
  },
];
