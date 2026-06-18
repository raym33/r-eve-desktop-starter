#!/usr/bin/env node
// Full local diagnostic for the R bridge (raym33/r): catalog, workspace,
// core skills, document tools, and the workspace guardrail. Runs against a
// throwaway workspace so it never touches the user's real ~/AI-Native-OS.
// Usage: npm run doctor:r

import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const pythonPath = process.env.R_BRIDGE_PYTHON ?? `${process.cwd()}/.venv/bin/python`;
const bridgePath = process.env.R_BRIDGE_SCRIPT ?? `${process.cwd()}/scripts/r_bridge.py`;

async function bridge(args, extraEnv = {}) {
  const { stdout } = await execFileAsync(pythonPath, [bridgePath, ...args], {
    env: { ...process.env, ...extraEnv },
    maxBuffer: 10 * 1024 * 1024,
    timeout: 120_000,
  });
  return JSON.parse(stdout);
}

async function main() {
  const workspace = await mkdtemp(join(tmpdir(), "ainativeos-doctor-"));
  const env = { AI_NATIVE_OS_WORKSPACE: workspace };
  const outputs = join(workspace, "Outputs");
  const pdfPath = join(outputs, "doctor.pdf");
  const report = { workspace, checks: [] };

  const check = async (name, fn) => {
    try {
      const detail = await fn();
      report.checks.push({ name, ok: true, detail });
    } catch (error) {
      report.checks.push({ name, ok: false, detail: error instanceof Error ? error.message : String(error) });
    }
  };

  await check("catalog", async () => {
    const data = await bridge(["catalog", "--limit", "5"], env);
    const skills = Array.isArray(data) ? data : data.skills ?? [];
    if (skills.length === 0) throw new Error("empty catalog (run npm run r:catalog)");
    return `${skills.length}+ skills indexed`;
  });

  await check("workspace", async () => {
    const data = await bridge(["workspace-info"], env);
    const folders = Object.keys(data.subfolders ?? {});
    if (!folders.includes("Outputs") || !folders.includes("Receipts")) {
      throw new Error("workspace subfolders missing");
    }
    return `${folders.length} folders at ${data.root}`;
  });

  await check("math.calculate", async () => {
    const data = await bridge(["call", "math", "calculate", "--params", JSON.stringify({ expression: "sqrt(144)" })], env);
    const text = JSON.stringify(data.result ?? data);
    if (!text.includes("12")) throw new Error(`unexpected result: ${text.slice(0, 120)}`);
    return "sqrt(144) = 12";
  });

  await check("json.json_format", async () => {
    await bridge(["call", "json", "json_format", "--params", JSON.stringify({ data: { b: 2, a: 1 } })], env);
    return "formatted JSON";
  });

  await check("fs.write_file", async () => {
    const path = join(outputs, "doctor.txt");
    await bridge(["call", "fs", "write_file", "--params", JSON.stringify({ path, content: "ok" })], env);
    return "wrote a file in the workspace";
  });

  await check("pdf.generate_pdf", async () => {
    await bridge(
      ["call", "pdf", "generate_pdf", "--params", JSON.stringify({ content: "# Doctor\n\nLine one.\n\nLine two.", output_path: pdfPath })],
      env,
    );
    return "generated a PDF";
  });

  await check("pdftools.pdf_info", async () => {
    const data = await bridge(["call", "pdftools", "pdf_info", "--params", JSON.stringify({ file_path: pdfPath })], env);
    return JSON.stringify(data.result ?? data).slice(0, 80);
  });

  await check("ocr.list_ocr_languages", async () => {
    await bridge(["call", "ocr", "list_ocr_languages", "--params", "{}"], env);
    return "OCR languages listed";
  });

  await check("workspace-guardrail", async () => {
    try {
      await bridge(
        ["call", "pdf", "generate_pdf", "--params", JSON.stringify({ content: "x", output_path: "/tmp/ainativeos-escape.pdf" })],
        { ...env, R_BRIDGE_WORKSPACE_ONLY: "1" },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("outside the AI Native OS workspace")) return "blocked an out-of-workspace path";
      throw new Error(`failed for the wrong reason: ${message.slice(0, 120)}`);
    }
    throw new Error("guardrail did NOT block an out-of-workspace path");
  });

  await rm(workspace, { recursive: true, force: true });

  console.log(JSON.stringify(report, null, 2));
  const failed = report.checks.filter((c) => !c.ok);
  console.error(failed.length === 0 ? "doctor:r — all checks passed" : `doctor:r — ${failed.length} check(s) failed`);
  if (failed.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
