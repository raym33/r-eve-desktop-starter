import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const pythonPath = process.env.R_BRIDGE_PYTHON ?? `${process.cwd()}/.venv/bin/python`;
const bridgePath = process.env.R_BRIDGE_SCRIPT ?? `${process.cwd()}/scripts/r_bridge.py`;

export async function runRBridge(args: string[]) {
  const { stdout, stderr } = await execFileAsync(pythonPath, [bridgePath, ...args], {
    env: process.env,
    maxBuffer: 10 * 1024 * 1024,
    timeout: 120_000,
  });

  if (stderr.trim()) {
    // R writes some optional dependency warnings to stderr; keep them model-visible.
  }

  try {
    return {
      ok: true,
      data: JSON.parse(stdout),
      stderr: stderr.trim(),
    };
  } catch (error) {
    return {
      ok: false,
      data: stdout,
      stderr: stderr.trim(),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
