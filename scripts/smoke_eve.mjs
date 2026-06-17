#!/usr/bin/env node

import { Client } from "eve/client";

const host = process.env.EVE_HOST || "http://127.0.0.1:4274";
const timeoutMs = Number(process.env.EVE_SMOKE_TIMEOUT_MS || 90000);

async function main() {
  const client = new Client({ host });
  const report = {
    host,
    checks: [],
  };

  const health = await withTimeout(client.health(), 5000, "Eve health timed out");
  report.checks.push({
    name: "health",
    ok: health?.ok === true,
    detail: health?.status || "unknown",
  });

  const info = await withTimeout(client.info(), 5000, "Eve info timed out");
  report.checks.push({
    name: "compact-agent",
    ok: info.tools.available.length <= 16,
    detail: `${info.tools.available.length} available tools, ${info.instructions.static?.markdown.length ?? 0} instruction chars`,
  });

  const toolTurn = await sendAndCollect(
    client,
    "Use r_catalog once with limit 3. Then answer in one short sentence with the number of skills/tools reported. Do not call any tool twice.",
  );
  const types = toolTurn.events.map((event) => event.type);
  const actions = toolTurn.events.filter((event) => event.type === "actions.requested");
  const failed = types.includes("turn.failed") || types.includes("step.failed");
  const completed = types.includes("turn.completed") || types.includes("session.waiting");
  report.checks.push({
    name: "r-catalog-turn",
    ok: !failed && completed && actions.length === 1,
    detail: `${toolTurn.events.length} events, ${actions.length} action request(s), ${types.at(-1) ?? "no events"}`,
  });

  console.log(JSON.stringify(report, null, 2));

  if (!report.checks.every((check) => check.ok)) {
    process.exit(1);
  }
  process.exit(0);
}

async function sendAndCollect(client, message) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const events = [];
  try {
    const response = await client.session().send({ message, signal: controller.signal });
    for await (const event of response) {
      events.push(event);
    }
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`Eve turn timed out after ${timeoutMs}ms. Try a smaller active tool set, a non-reasoning model, or a larger LM Studio context.`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
  return { events };
}

async function withTimeout(promise, ms, message) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        controller.signal.addEventListener("abort", () => reject(new Error(message)), { once: true });
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
