import { useEveAgent } from "eve/react";
import type { EveMessage, EveMessagePart } from "eve/client";
import { summarizeGuardedAction } from "../agent/lib/guardedTools.js";
import {
  Activity,
  BarChart3,
  Code2,
  FileText,
  FolderKanban,
  Globe2,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Square,
  Wrench,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type RTool = {
  name: string;
  description: string;
  parameters?: unknown;
};

type RSkill = {
  name: string;
  description: string;
  blocked: boolean;
  toolCount: number;
  tools: RTool[];
};

type RCatalog = {
  skillCount: number;
  toolCount: number;
  blockedSkills: string[];
  skills: RSkill[];
};

const WORKFLOWS = [
  {
    icon: FileText,
    title: "Documents",
    description: "PDFs, Markdown, OCR, summaries, and reports.",
    hint: "Find the right local R tools for document work.",
    prompt:
      "Find the best local R skills for PDF and document work. Summarize the best options in 5 concise points and recommend the safest workflow for summarizing a folder of PDFs.",
  },
  {
    icon: Globe2,
    title: "Web research",
    description: "Search, read sources, compare, and summarize.",
    hint: "Search the web and return source-backed notes.",
    prompt:
      "Do a short web research pass on recent LM Studio updates. Use web search, read relevant sources, and return a concise summary with links.",
  },
  {
    icon: FolderKanban,
    title: "Local files",
    description: "Organize, convert, rename, and prepare folders.",
    hint: "Plan safe local file operations before running them.",
    prompt:
      "Find local R skills for organizing files. Propose a safe workflow for cleaning a Downloads folder without making changes yet.",
  },
  {
    icon: BarChart3,
    title: "Data",
    description: "CSV, JSON, YAML, SQL, and small statistics.",
    hint: "Explore data tools for lightweight local analysis.",
    prompt:
      "Find R skills for CSV, JSON, and data analysis. Give 3 useful examples for a non-technical person.",
  },
  {
    icon: Code2,
    title: "Code",
    description: "Git, analysis, generation, and explanation.",
    hint: "Use local tools to inspect and improve code projects.",
    prompt:
      "Find R skills for code and git workflows. Summarize how they could help with a local project.",
  },
  {
    icon: Wrench,
    title: "Explore R",
    description: "Browse the catalog, choose tools, and test safely.",
    hint: "Map the installed R skill catalog without flooding the model.",
    prompt:
      "Use r_catalog to inspect the available R skills. Return a compact category map without listing every tool.",
  },
];

const TRUST_POINTS = [
  "Local model via LM Studio",
  "R skills on demand",
  "Sensitive actions blocked",
  "Source-backed web research",
];

const SKILL_FORGE_ACTION = {
  title: "Forge a missing skill",
  description:
    "When no existing R tool fits, draft a new skill package with schema, tests, permissions, and an approval checklist.",
  hint: "Search first, then generate a reviewable draft skill. Nothing is installed automatically.",
  prompt:
    "I need a capability that may not exist yet. First search the R catalog for a good existing fit. If there is no good fit, explain the gap and ask me for the exact workflow. Then use skill_forge to create a safe draft skill package with permissions, tests, and approval notes. Do not install or execute generated code.",
};

const PDF_WORKFLOWS = [
  {
    title: "Summarize",
    tool: "ocr.extract_text_from_pdf",
    description: "Extract text, detect scanned pages, and produce structured notes.",
    hint: "Ask for a PDF path, extract text locally, then summarize it.",
    prompt:
      "I want to summarize a local PDF. First search R PDF/OCR tools, prefer ocr.extract_text_from_pdf if the file may be scanned, ask me for the input path, and do not run anything until you have it. Then summarize the content with key points, action items, and open questions.",
  },
  {
    title: "Searchable OCR",
    tool: "ocr.ocr_to_searchable_pdf",
    description: "Turn scanned documents into selectable, searchable PDFs.",
    hint: "Create a new searchable PDF without touching the original.",
    prompt:
      "I want to convert a scanned PDF into a searchable PDF. Use r_search_tools to confirm the right OCR tool, ask for input path, output path, and language, then call r_call_tool with ocr.ocr_to_searchable_pdf only after you have those details.",
  },
  {
    title: "Merge",
    tool: "pdftools.pdf_merge",
    description: "Combine multiple PDFs into one ordered output file.",
    hint: "Ask for ordered input paths and a new output path.",
    prompt:
      "I want to merge several local PDFs. Find the R merge tool, ask for the ordered input paths and output path, verify that originals will not be overwritten, then prepare the pdftools.pdf_merge call.",
  },
  {
    title: "Extract pages",
    tool: "pdftools.pdf_extract",
    description: "Pull out selected pages or ranges into a new PDF.",
    hint: "Extract a page range while preserving the source document.",
    prompt:
      "I want to extract pages from a PDF. Search pdftools, ask for the input PDF path, pages or ranges, and output path. Do not modify the original; prepare a safe pdftools.pdf_extract call.",
  },
  {
    title: "Report",
    tool: "pdf.generate_pdf",
    description: "Generate polished PDFs from text or Markdown.",
    hint: "Turn notes or Markdown into a clean report file.",
    prompt:
      "I want to generate a PDF report. Search R tools for creating PDFs from text or Markdown, ask for title, content or Markdown path, template, and output path. Use pdf.generate_pdf or pdf.markdown_to_pdf as appropriate.",
  },
  {
    title: "Repair",
    tool: "pdftools.pdf_rotate",
    description: "Rotate pages or compress large PDFs safely.",
    hint: "Fix orientation or reduce file size into a new output.",
    prompt:
      "I want to repair a PDF by rotating pages or reducing file size. Search pdftools for rotate/compress tools, ask for path, exact operation, affected pages, and output path. Keep the original intact.",
  },
];

function App() {
  const agent = useEveAgent({ host: "" });
  const [input, setInput] = useState("");
  const [catalog, setCatalog] = useState<RCatalog | null>(null);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<string>("pdf");

  const messages = agent.data.messages ?? [];
  const toolEvents = useMemo(
    () =>
      messages.flatMap((message) =>
        message.parts.filter((part) => part.type === "dynamic-tool").map((part) => ({
          id: `${message.id}-${part.toolCallId}`,
          part,
        })),
      ),
    [messages],
  );
  const toolHistory = useMemo(() => summarizeToolEvents(toolEvents), [toolEvents]);

  const pendingApproval = useMemo(() => {
    // Scan newest-first so the card always reflects the latest pending request.
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      for (const part of messages[i].parts) {
        if (part.type === "dynamic-tool" && part.state === "approval-requested") {
          return part;
        }
      }
    }
    return null;
  }, [messages]);

  async function respondToApproval(requestId: string, optionId: string) {
    if (agent.status === "submitted" || agent.status === "streaming") {
      return;
    }
    await agent.send({ inputResponses: [{ requestId, optionId }] });
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/r-catalog.json")
      .then((response) => response.json())
      .then((data: RCatalog) => {
        if (!cancelled) {
          setCatalog(data);
          if (!data.skills.some((skill) => skill.name === selectedSkill)) {
            setSelectedSkill(data.skills[0]?.name ?? "");
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCatalog(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedSkillData = catalog?.skills.find((skill) => skill.name === selectedSkill);
  const permissionSummary = useMemo(() => getPermissionSummary(catalog), [catalog]);

  const filteredTools = useMemo(() => {
    if (!catalog) {
      return [];
    }

    const query = catalogQuery.trim().toLowerCase();
    const tools = catalog.skills.flatMap((skill) =>
      skill.tools.map((tool) => ({
        ...tool,
        skill: skill.name,
        skillBlocked: skill.blocked,
      })),
    );

    if (!query) {
      return selectedSkillData
        ? selectedSkillData.tools.slice(0, 8).map((tool) => ({
            ...tool,
            skill: selectedSkillData.name,
            skillBlocked: selectedSkillData.blocked,
          }))
        : [];
    }

    return tools
      .filter((tool) =>
        `${tool.skill} ${tool.name} ${tool.description}`.toLowerCase().includes(query),
      )
      .slice(0, 16);
  }, [catalog, catalogQuery, selectedSkillData]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendMessage(input);
  }

  async function sendMessage(value: string) {
    const message = value.trim();
    if (!message || agent.status === "submitted" || agent.status === "streaming") {
      return;
    }
    setInput("");
    await agent.send({ message });
  }

  return (
    <main className="app-shell">
      <section className="sidebar" aria-label="System status">
        <div className="brand-lockup">
          <p className="eyebrow">Local workspace</p>
          <h1>R Workbench</h1>
          <span>Private automation console</span>
        </div>

        <div className="status-panel">
          <span className={`status-dot ${agent.status}`} />
          <div>
            <strong>{statusLabel(agent.status)}</strong>
            <p>Eve backend through local proxy</p>
          </div>
        </div>

        <div className="settings-block">
          <span>Model</span>
          <strong>{import.meta.env.VITE_MODEL_LABEL || "LM Studio local"}</strong>
        </div>

        <div className="settings-block">
          <span>Tools</span>
          <strong>ABC RSS / R skills / Web search</strong>
        </div>

        <button
          className="secondary-button tooltip-control"
          data-tooltip="Clear the current Eve session and start fresh."
          onClick={agent.reset}
          title="Clear the current Eve session and start fresh."
          type="button"
        >
          <RotateCcw size={16} />
          New session
        </button>

        <SkillExplorer
          catalog={catalog}
          filteredTools={filteredTools}
          onSelectSkill={setSelectedSkill}
          onUseTool={(skill, tool) => sendMessage(buildToolPrompt(skill, tool))}
          query={catalogQuery}
          selectedSkill={selectedSkill}
          selectedSkillData={selectedSkillData}
          setQuery={setCatalogQuery}
        />

        <PermissionPanel summary={permissionSummary} />

        <ToolLog events={toolEvents} history={toolHistory} />
      </section>

      <section className="chat-panel" aria-label="Chat">
        <div className="messages">
          {messages.length === 0 ? (
            <div className="empty-state dashboard">
              <header className="dashboard-header">
                <div>
                  <p className="eyebrow">Desktop-grade local AI</p>
                  <h2>Start with a task, not a prompt.</h2>
                </div>
                <p>
                  Eve routes requests to LM Studio and the local R skill catalog. The interface keeps the model focused, exposes tool activity, and blocks sensitive actions by default.
                </p>
              </header>

              <section className="system-strip" aria-label="System capabilities">
                <div>
                  <strong>{catalog?.skillCount ?? "--"}</strong>
                  <span>skills indexed</span>
                </div>
                <div>
                  <strong>{catalog?.toolCount ?? "--"}</strong>
                  <span>tools available</span>
                </div>
                <div>
                  <strong>{permissionSummary?.blockedCount ?? "--"}</strong>
                  <span>blocked by default</span>
                </div>
              </section>

              <section className="forge-panel" aria-label="Skill Forge">
                <div>
                  <Sparkles size={18} />
                  <div>
                    <h3>Skill Forge</h3>
                    <p>{SKILL_FORGE_ACTION.description}</p>
                  </div>
                </div>
                <button
                  className="forge-button tooltip-control"
                  data-tooltip={SKILL_FORGE_ACTION.hint}
                  disabled={agent.status !== "ready"}
                  onClick={() => sendMessage(SKILL_FORGE_ACTION.prompt)}
                  title={SKILL_FORGE_ACTION.hint}
                  type="button"
                >
                  {SKILL_FORGE_ACTION.title}
                </button>
              </section>

              <section className="pdf-workbench" aria-label="PDF workbench">
                <div className="pdf-workbench-header">
                  <FileText size={18} />
                  <div>
                    <h3>PDF workbench</h3>
                    <p>OCR, summarize, merge, extract, repair, and generate reports locally.</p>
                  </div>
                </div>
                <div className="pdf-action-grid">
                  {PDF_WORKFLOWS.map((workflow) => (
                    <button
                      className="pdf-action tooltip-control"
                      data-tooltip={workflow.hint}
                      disabled={agent.status !== "ready"}
                      key={workflow.title}
                      onClick={() => sendMessage(workflow.prompt)}
                      title={workflow.hint}
                      type="button"
                    >
                      <span>{workflow.title}</span>
                      <strong>{workflow.tool}</strong>
                      <p>{workflow.description}</p>
                    </button>
                  ))}
                </div>
              </section>

              <section className="workflow-grid" aria-label="Core functions">
                {WORKFLOWS.map((workflow) => (
                  <button
                    className="workflow-card tooltip-control"
                    data-tooltip={workflow.hint}
                    disabled={agent.status !== "ready"}
                    key={workflow.title}
                    onClick={() => sendMessage(workflow.prompt)}
                    title={workflow.hint}
                    type="button"
                  >
                    <workflow.icon size={19} />
                    <span>{workflow.title}</span>
                    <p>{workflow.description}</p>
                  </button>
                ))}
              </section>
              <div className="trust-strip">
                {TRUST_POINTS.map((point) => (
                  <span key={point}>
                    <ShieldCheck size={14} />
                    {point}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => <ChatMessage key={message.id} message={message} />)
          )}
        </div>

        {agent.error ? <div className="error-box">{String(agent.error.message ?? agent.error)}</div> : null}

        {pendingApproval ? (
          <ApprovalCard
            busy={agent.status === "submitted" || agent.status === "streaming"}
            onRespond={respondToApproval}
            part={pendingApproval}
          />
        ) : null}

        <div className="quickbar" aria-label="Quick actions">
          {WORKFLOWS.slice(0, 4).map((workflow) => (
            <button
              className="tooltip-control"
              data-tooltip={workflow.hint}
              disabled={agent.status !== "ready" || Boolean(pendingApproval)}
              key={workflow.title}
              onClick={() => sendMessage(workflow.prompt)}
              title={workflow.hint}
              type="button"
            >
              <workflow.icon size={15} />
              {workflow.title}
            </button>
          ))}
        </div>

        <form className="composer" onSubmit={onSubmit}>
          <textarea
            aria-label="Message"
            disabled={Boolean(pendingApproval)}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder={
              pendingApproval
                ? "Approve or cancel the pending action above to continue…"
                : "Describe a task for Eve..."
            }
            value={input}
          />
          {agent.status === "submitted" || agent.status === "streaming" ? (
            <button
              aria-label="Stop"
              className="tooltip-control"
              data-tooltip="Stop the current response."
              onClick={agent.stop}
              title="Stop the current response."
              type="button"
            >
              <Square size={18} />
            </button>
          ) : (
            <button
              aria-label="Send"
              className="tooltip-control"
              data-tooltip="Send this task to the local agent."
              disabled={!input.trim() || Boolean(pendingApproval)}
              title="Send this task to the local agent."
              type="submit"
            >
              <Send size={18} />
            </button>
          )}
        </form>
      </section>
    </main>
  );
}

function ChatMessage({ message }: { message: EveMessage }) {
  const text = message.parts.map(partToText).filter(Boolean).join("\n\n");

  if (!text.trim()) {
    return null;
  }

  return (
    <article className={`message ${message.role}`}>
      <div className="message-role">{message.role === "user" ? "You" : "Eve"}</div>
      <div className="message-body">{text}</div>
    </article>
  );
}

function ApprovalCard({
  busy,
  onRespond,
  part,
}: {
  busy: boolean;
  onRespond: (requestId: string, optionId: string) => void;
  part: Extract<EveMessagePart, { type: "dynamic-tool" }>;
}) {
  const request = part.toolMetadata?.eve?.inputRequest;
  if (!request) {
    return null;
  }

  const input = (part.input ?? {}) as { skill?: unknown; tool?: unknown; params?: unknown };
  const summary =
    typeof input.skill === "string" && typeof input.tool === "string"
      ? summarizeGuardedAction(
          input.skill,
          input.tool,
          (input.params as Record<string, unknown>) ?? {},
        )
      : request.prompt;

  const options =
    request.options && request.options.length > 0
      ? request.options
      : [
          { id: "approve", label: "Approve", style: "primary" as const },
          { id: "deny", label: "Cancel", style: "danger" as const },
        ];

  return (
    <div className="approval-card" role="alertdialog" aria-label="Action approval">
      <div className="approval-head">
        <ShieldAlert size={18} />
        <strong>Approve before continuing</strong>
      </div>
      <p className="approval-summary">{summary}</p>
      <div className="approval-actions">
        {options.map((option) => (
          <button
            className={`approval-button ${option.style === "danger" ? "danger" : "primary"}`}
            disabled={busy}
            key={option.id}
            onClick={() => onRespond(request.requestId, option.id)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className="approval-note">Nothing runs until you choose.</p>
    </div>
  );
}

function ToolEvent({ part }: { part: Extract<EveMessagePart, { type: "dynamic-tool" }> }) {
  const query = typeof part.input === "object" && part.input && "query" in part.input
    ? String(part.input.query)
    : typeof part.input === "object" && part.input && "feed" in part.input
      ? `feed: ${String(part.input.feed)}`
    : part.toolName;

  return (
    <div className="tool-event">
      <span className={stateClassName(part.state)}>{stateLabel(part.state)}</span>
      <strong>{part.toolName}</strong>
      <p>{query}</p>
    </div>
  );
}

function ToolLog({
  events,
  history,
}: {
  events: Array<{ id: string; part: Extract<EveMessagePart, { type: "dynamic-tool" }> }>;
  history: ToolHistory;
}) {
  return (
    <div className="tool-log">
      <div className="tool-log-header">
        <div>
          <h2>Historial</h2>
          <p>{history.total ? `${history.total} runs this session` : "No runs yet"}</p>
        </div>
        <Activity size={16} />
      </div>

      {history.total ? (
        <div className="tool-summary" aria-label="Tool summary">
          <span>{history.finished} finished</span>
          <span>{history.running} running</span>
          <span>{history.distinctTools} tools</span>
        </div>
      ) : (
        <p className="muted">Tool activity will appear here when the agent acts.</p>
      )}

      {events.length ? (
        <div className="tool-events">
          {events.slice(-8).reverse().map(({ id, part }) => <ToolEvent key={id} part={part} />)}
        </div>
      ) : null}
    </div>
  );
}

function SkillExplorer({
  catalog,
  filteredTools,
  onSelectSkill,
  onUseTool,
  query,
  selectedSkill,
  selectedSkillData,
  setQuery,
}: {
  catalog: RCatalog | null;
  filteredTools: Array<RTool & { skill: string; skillBlocked: boolean }>;
  onSelectSkill: (skill: string) => void;
  onUseTool: (skill: string, tool: RTool) => void;
  query: string;
  selectedSkill: string;
  selectedSkillData?: RSkill;
  setQuery: (query: string) => void;
}) {
  return (
    <div className="skill-panel">
      <div className="skill-panel-header">
        <h2>R skills</h2>
        <span>{catalog ? `${catalog.skillCount} / ${catalog.toolCount}` : "loading"}</span>
      </div>

      <input
        aria-label="Search R tools"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search PDF, CSV, QR..."
        value={query}
      />

      {catalog ? (
        <>
          <div className="skill-tabs">
            {catalog.skills.slice(0, 12).map((skill) => (
              <button
                className={skill.name === selectedSkill ? "active" : ""}
                key={skill.name}
                onClick={() => {
                  onSelectSkill(skill.name);
                  setQuery("");
                }}
                type="button"
              >
                {skill.name}
              </button>
            ))}
          </div>

          {selectedSkillData && !query ? (
            <p className="skill-summary">
              {selectedSkillData.description || "Local R skill."}
            </p>
          ) : null}

          <div className="tool-results">
            {filteredTools.slice(0, 6).map((tool) => (
              <div className="tool-result" key={`${tool.skill}.${tool.name}`}>
                <div>
                  <strong>{tool.name}</strong>
                  <span className={tool.skillBlocked ? "blocked" : ""}>
                    {tool.skillBlocked ? "blocked" : tool.skill}
                  </span>
                </div>
                <p>{tool.description}</p>
                <button
                  className="tooltip-control"
                  data-tooltip="Create a guided prompt for this exact R tool."
                  onClick={() => onUseTool(tool.skill, tool)}
                  title="Create a guided prompt for this exact R tool."
                  type="button"
                >
                  Use
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="skill-summary">Run `npm run r:catalog` if the catalog does not appear.</p>
      )}
    </div>
  );
}

function PermissionPanel({ summary }: { summary: PermissionSummary | null }) {
  const visibleBlocked = summary?.blocked.slice(0, 8) ?? [];

  return (
    <div className="permission-panel">
      <div className="permission-title">
        <ShieldAlert size={16} />
        <h2>Permissions</h2>
      </div>

      {summary ? (
        <>
          <div className="permission-meter" aria-label="Permission summary">
            <div>
              <strong>{summary.allowedCount}</strong>
              <span>ready</span>
            </div>
            <div>
              <strong>{summary.blockedCount}</strong>
              <span>blocked</span>
            </div>
          </div>

          <p>
            Sensitive skills are blocked by default. To unlock them, start Eve with
            {" "}
            <code>R_BRIDGE_ALLOW_DANGEROUS=1</code>.
          </p>

          {visibleBlocked.length ? (
            <div className="blocked-list" aria-label="Blocked skills">
              {visibleBlocked.map((skill) => (
                <span key={skill}>{skill}</span>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <p>Loading local permission profile.</p>
      )}
    </div>
  );
}

function buildToolPrompt(skill: string, tool: RTool) {
  return [
    `I want to use an R tool.`,
    `Skill: ${skill}`,
    `Tool: ${tool.name}`,
    `Description: ${tool.description}`,
    `Expected parameters: ${JSON.stringify(tool.parameters ?? {}, null, 2)}`,
    `First explain which inputs you need. If all inputs are already available, call r_call_tool with those parameters.`,
  ].join("\n");
}

function partToText(part: EveMessagePart) {
  if (part.type === "text") {
    return part.text;
  }

  return "";
}

function statusLabel(status: string) {
  if (status === "submitted") {
    return "Sending";
  }
  if (status === "streaming") {
    return "Responding";
  }
  if (status === "error") {
    return "Error";
  }
  return "Ready";
}

type PermissionSummary = {
  allowedCount: number;
  blocked: string[];
  blockedCount: number;
};

type ToolHistory = {
  distinctTools: number;
  finished: number;
  running: number;
  total: number;
};

function getPermissionSummary(catalog: RCatalog | null): PermissionSummary | null {
  if (!catalog) {
    return null;
  }

  const blocked = catalog.blockedSkills.length
    ? catalog.blockedSkills
    : catalog.skills.filter((skill) => skill.blocked).map((skill) => skill.name);

  return {
    allowedCount: catalog.skillCount - blocked.length,
    blocked,
    blockedCount: blocked.length,
  };
}

function summarizeToolEvents(
  events: Array<{ id: string; part: Extract<EveMessagePart, { type: "dynamic-tool" }> }>,
): ToolHistory {
  const tools = new Set(events.map(({ part }) => part.toolName));
  const running = events.filter(({ part }) =>
    ["input-streaming", "input-available"].includes(part.state),
  ).length;
  const finished = events.filter(({ part }) =>
    ["output-available", "output-error"].includes(part.state),
  ).length;

  return {
    distinctTools: tools.size,
    finished,
    running,
    total: events.length,
  };
}

function stateLabel(state: string) {
  if (state === "output-available") {
    return "finished";
  }
  if (state === "output-error") {
    return "error";
  }
  if (state === "input-streaming" || state === "input-available") {
    return "running";
  }
  return state;
}

function stateClassName(state: string) {
  if (state === "output-error") {
    return "error";
  }
  if (state === "output-available") {
    return "done";
  }
  return "running";
}

createRoot(document.getElementById("root")!).render(<App />);
