import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, relative, resolve } from "node:path";

const WORKSPACE_FOLDERS = ["Inbox", "Outputs", "Reports", "OCR", "Receipts", "Drafts", "Logs"];

export function workspaceRoot(): string {
  const configured = process.env.AI_NATIVE_OS_WORKSPACE || "~/AI-Native-OS";
  if (configured.startsWith("~/")) {
    return resolve(process.env.HOME || process.cwd(), configured.slice(2));
  }
  return resolve(configured);
}

export async function ensureWorkspace(): Promise<string> {
  const root = workspaceRoot();
  await mkdir(root, { recursive: true });
  await Promise.all(WORKSPACE_FOLDERS.map((folder) => mkdir(join(root, folder), { recursive: true })));
  return root;
}

export async function writeNewWorkspaceFile(
  folder: string,
  filenameBase: string,
  extension: string,
  content: string,
): Promise<string> {
  const root = await ensureWorkspace();
  const targetDir = resolveInsideWorkspace(root, folder);
  await mkdir(targetDir, { recursive: true });

  const slug = slugify(filenameBase);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "Z");
  const path = join(targetDir, `${stamp}-${slug}.${extension.replace(/^\./, "")}`);
  await writeFile(path, content, { encoding: "utf-8", flag: "wx" });
  return path;
}

export async function writeNewWorkspaceBuffer(
  folder: string,
  filenameBase: string,
  extension: string,
  content: Uint8Array,
): Promise<string> {
  const root = await ensureWorkspace();
  const targetDir = resolveInsideWorkspace(root, folder);
  await mkdir(targetDir, { recursive: true });

  const slug = slugify(filenameBase);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "Z");
  const path = join(targetDir, `${stamp}-${slug}.${extension.replace(/^\./, "")}`);
  await writeFile(path, content, { flag: "wx" });
  return path;
}

export async function readResearchMarkdown(id: string): Promise<{ markdown: string; path: string; title: string }> {
  const safeId = basename(id);
  if (safeId !== id || !safeId.endsWith(".md")) {
    throw new Error("Invalid research note id.");
  }
  const root = await ensureWorkspace();
  const path = join(resolveInsideWorkspace(root, "Reports/Research"), safeId);
  const markdown = await readFile(path, "utf-8");
  return {
    markdown,
    path,
    title: markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || safeId.replace(/\.md$/, ""),
  };
}

function resolveInsideWorkspace(root: string, folder: string): string {
  const targetDir = resolve(root, folder);
  const rel = relative(root, targetDir);
  if (rel.startsWith("..") || rel === ".." || rel.startsWith("/")) {
    throw new Error("Target folder resolves outside the AI Native OS workspace.");
  }
  return targetDir;
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "note";
}
