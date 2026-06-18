#!/usr/bin/env node
// One-command health check for AI Native OS. Runs the R bridge, Eve, and
// LM Studio diagnostics and prints a readable summary. Exits non-zero if any
// check fails, so it doubles as a CI gate. Usage: npm run doctor
//
// The R bridge check runs fully offline. Eve and LM Studio checks need those
// services running; if they are down they are reported clearly rather than
// hiding the failure.

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

const doctors = [
  { title: "R bridge", script: "scripts/doctor_r.mjs", hint: "needs the Python venv (npm run r:install)" },
  { title: "Eve backend", script: "scripts/smoke_eve.mjs", hint: "start it with npm run start" },
  { title: "LM Studio", script: "scripts/smoke_lmstudio.mjs", hint: "start the LM Studio local server" },
];

async function runDoctor(script) {
  try {
    const { stdout } = await execFileAsync("node", [script], {
      env: process.env,
      maxBuffer: 10 * 1024 * 1024,
      timeout: 180_000,
    });
    return { exitOk: true, report: parse(stdout) };
  } catch (error) {
    // Non-zero exit still carries the JSON report on stdout.
    const stdout = typeof error?.stdout === "string" ? error.stdout : "";
    const report = parse(stdout);
    const message = report ? "" : (error?.stderr || error?.message || String(error)).trim();
    return { exitOk: false, report, message };
  }
}

function parse(stdout) {
  const start = stdout.indexOf("{");
  if (start === -1) return null;
  try {
    return JSON.parse(stdout.slice(start));
  } catch {
    return null;
  }
}

function mark(ok) {
  return ok ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
}

async function main() {
  console.log(`${BOLD}AI Native OS — local diagnostics${RESET}\n`);
  let allOk = true;

  for (const doctor of doctors) {
    const { exitOk, report, message } = await runDoctor(doctor.script);
    const checks = report?.checks ?? [];
    const sectionOk = exitOk && checks.every((c) => c.ok);
    allOk = allOk && sectionOk;

    console.log(`${mark(sectionOk)} ${BOLD}${doctor.title}${RESET}`);
    for (const c of checks) {
      console.log(`    ${mark(c.ok)} ${c.name} ${DIM}${c.detail ?? ""}${RESET}`);
    }
    if (checks.length === 0) {
      console.log(`    ${RED}unavailable${RESET} ${DIM}${message || doctor.hint}${RESET}`);
      if (message) console.log(`    ${DIM}${doctor.hint}${RESET}`);
    }
    console.log("");
  }

  console.log(allOk ? `${GREEN}${BOLD}All systems go.${RESET}` : `${RED}${BOLD}Some checks failed (see above).${RESET}`);
  if (!allOk) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
