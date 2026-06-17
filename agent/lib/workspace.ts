import { mkdir, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

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
  const targetDir = resolve(root, folder);
  const rel = relative(root, targetDir);
  if (rel.startsWith("..") || rel === ".." || rel.startsWith("/")) {
    throw new Error("Target folder resolves outside the AI Native OS workspace.");
  }
  await mkdir(targetDir, { recursive: true });

  const slug = slugify(filenameBase);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "Z");
  const path = join(targetDir, `${stamp}-${slug}.${extension.replace(/^\./, "")}`);
  await writeFile(path, content, { encoding: "utf-8", flag: "wx" });
  return path;
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "note";
}
