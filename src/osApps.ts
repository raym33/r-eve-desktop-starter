import type { Lang } from "./i18n.js";

export type OsApp = {
  id: string;
  iconId: string;
  label: Record<Lang, string>;
  kind: "prompt" | "explorer";
  prompt?: Record<Lang, string>;
};

export const OS_APPS: OsApp[] = [
  {
    id: "summarize-pdf",
    iconId: "document",
    label: { es: "Resume un PDF", en: "Summarize a PDF" },
    kind: "prompt",
    prompt: {
      es: "Quiero resumir un PDF. Pideme la ruta del archivo y dime que necesitas.",
      en: "I want to summarize a PDF. Ask me for the file path and tell me what you need.",
    },
  },
  {
    id: "draft-email",
    iconId: "email",
    label: { es: "Redacta un email", en: "Draft an email" },
    kind: "prompt",
    prompt: {
      es: "Quiero redactar un email. Preguntame el destinatario y que quiero decir. No lo envies sin mi aprobacion.",
      en: "I want to draft an email. Ask me for the recipient and what I want to say. Do not send it without my approval.",
    },
  },
  {
    id: "boe-law",
    iconId: "law",
    label: { es: "Consulta una ley (BOE)", en: "Look up a law (BOE)" },
    kind: "prompt",
    prompt: {
      es: "Quiero consultar una ley espanola en el BOE. Preguntame el nombre o el identificador BOE-A.",
      en: "I want to look up a Spanish law in the BOE. Ask me for the name or BOE-A identifier.",
    },
  },
  {
    id: "web-research",
    iconId: "web",
    label: { es: "Investiga en la web", en: "Research the web" },
    kind: "prompt",
    prompt: {
      es: "Quiero investigar algo en la web y obtener notas con fuentes. Preguntame el tema.",
      en: "I want to research something on the web and get notes with sources. Ask me for the topic.",
    },
  },
  {
    id: "organize-files",
    iconId: "files",
    label: { es: "Ordena archivos", en: "Organize files" },
    kind: "prompt",
    prompt: {
      es: "Quiero organizar archivos de mi carpeta de trabajo conservando los originales. Preguntame que carpeta.",
      en: "I want to organize files in my workspace while keeping the originals. Ask me which folder.",
    },
  },
  {
    id: "spanish-invoice",
    iconId: "invoice",
    label: { es: "Datos de una factura", en: "Invoice data" },
    kind: "prompt",
    prompt: {
      es: "Quiero extraer los datos de una factura espanola (NIF, IBAN, importes, fechas). Pideme el archivo y usa la herramienta de extraccion tras leer el texto.",
      en: "I want to extract data from a Spanish invoice (NIF, IBAN, amounts, dates). Ask me for the file and use the extraction tool after reading the text.",
    },
  },
  {
    id: "file-explorer",
    iconId: "explorer",
    label: { es: "Explorador de archivos", en: "File Explorer" },
    kind: "explorer",
  },
  {
    id: "diagnostics",
    iconId: "diagnostics",
    label: { es: "Comprobar el sistema", en: "Check the system" },
    kind: "prompt",
    prompt: {
      es: "Comprueba que esta listo en mi sistema (LM Studio, modelo, herramientas) y dime que falta.",
      en: "Check what is ready on my system (LM Studio, model, tools) and tell me what is missing.",
    },
  },
  {
    id: "calendar",
    iconId: "calendar",
    label: { es: "Agenda y tareas", en: "Calendar and tasks" },
    kind: "prompt",
    prompt: {
      es: "Quiero gestionar mi agenda y tareas. Preguntame que evento o tarea quiero anadir o consultar.",
      en: "I want to manage my calendar and tasks. Ask me what event or task I want to add or look up.",
    },
  },
  {
    id: "clients",
    iconId: "clients",
    label: { es: "Mis clientes", en: "My clients" },
    kind: "prompt",
    prompt: {
      es: "Quiero llevar un registro sencillo de mis clientes (una base de datos local). Preguntame que quiero guardar o consultar.",
      en: "I want to keep a simple record of my clients (a local database). Ask me what I want to save or look up.",
    },
  },
  {
    id: "email",
    iconId: "email",
    label: { es: "Email", en: "Email" },
    kind: "prompt",
    prompt: {
      es: "Quiero trabajar con email. Si el conector esta desactivado, explicame que es un pack opcional y como activarlo; si no, ayudame a redactar y no envies nada sin mi aprobacion.",
      en: "I want to work with email. If the connector is disabled, explain that it is an optional pack and how to enable it; otherwise, help me draft and do not send anything without my approval.",
    },
  },
  {
    id: "whatsapp",
    iconId: "whatsapp",
    label: { es: "WhatsApp", en: "WhatsApp" },
    kind: "prompt",
    prompt: {
      es: "Quiero usar WhatsApp. Explicame que es un conector opcional y experimental; prepara una respuesta como borrador local y no envies nada sin mi aprobacion.",
      en: "I want to use WhatsApp. Explain that it is an optional and experimental connector; prepare a reply as a local draft and do not send anything without my approval.",
    },
  },
];
