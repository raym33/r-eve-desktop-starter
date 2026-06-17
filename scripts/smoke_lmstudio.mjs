#!/usr/bin/env node

const baseUrl = process.env.LM_STUDIO_BASE_URL || "http://127.0.0.1:1234/v1";
const model = process.env.LM_STUDIO_MODEL || "qwen2.5-7b-instruct";
const apiKey = process.env.LM_STUDIO_API_KEY || "lm-studio";

const headers = {
  Authorization: `Bearer ${apiKey}`,
  "Content-Type": "application/json",
};

async function main() {
  const report = {
    baseUrl,
    model,
    checks: [],
  };

  const models = await getJson(`${trim(baseUrl)}/models`, { headers });
  const ids = Array.isArray(models.data) ? models.data.map((entry) => entry.id).filter(Boolean) : [];
  report.checks.push({
    name: "models",
    ok: ids.includes(model),
    detail: ids.includes(model) ? `${model} is available` : `${model} not found. Available: ${ids.join(", ")}`,
  });

  const simple = await chat({
    messages: [{ role: "user", content: "What is 2+2? Answer with only the number." }],
    max_tokens: 64,
  });
  const simpleContent = simple.choices?.[0]?.message?.content?.trim() || "";
  report.checks.push({
    name: "chat",
    ok: simpleContent === "4",
    detail: simpleContent || simple.choices?.[0]?.message?.reasoning_content?.slice(0, 120) || "empty response",
  });

  const tool = await chat({
    messages: [{ role: "user", content: "Use the calculator tool to compute 21*2. Do not answer directly." }],
    max_tokens: 256,
    tool_choice: "auto",
    tools: [
      {
        type: "function",
        function: {
          name: "calculator",
          description: "Calculate arithmetic expressions.",
          parameters: {
            type: "object",
            properties: {
              expression: { type: "string" },
            },
            required: ["expression"],
          },
        },
      },
    ],
  });
  const toolCall = tool.choices?.[0]?.message?.tool_calls?.[0];
  report.checks.push({
    name: "tool-calling",
    ok: toolCall?.function?.name === "calculator" && toolCall?.function?.arguments?.includes("21*2"),
    detail: toolCall ? `${toolCall.function.name} ${toolCall.function.arguments}` : "no tool call returned",
  });

  console.log(JSON.stringify(report, null, 2));

  if (!report.checks.every((check) => check.ok)) {
    process.exit(1);
  }
}

async function chat(body) {
  return getJson(`${trim(baseUrl)}/chat/completions`, {
    body: JSON.stringify({
      model,
      temperature: 0,
      ...body,
    }),
    headers,
    method: "POST",
  });
}

async function getJson(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  const json = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(`${url} failed: ${response.status} ${JSON.stringify(json)}`);
  }

  return json;
}

function trim(value) {
  return value.replace(/\/$/, "");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
