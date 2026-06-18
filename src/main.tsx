import { useEveAgent } from "eve/react";
import type { EveMessage, EveMessagePart } from "eve/client";
import { summarizeGuardedAction, summarizeNativeApprovalAction } from "../agent/lib/guardedTools.js";
import {
  RotateCcw,
  Send,
  ShieldAlert,
  Square,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { type Lang, loadLang, saveLang, t } from "./i18n.js";
import { OS_APPS, type OsApp } from "./osApps.js";
import "./styles.css";

function App() {
  const agent = useEveAgent({ host: "" });
  const [lang, setLang] = useState<Lang>(loadLang);
  const [input, setInput] = useState("");
  const [osOpen, setOsOpen] = useState(false);

  const messages = agent.data.messages ?? [];

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

  function changeLang(next: Lang) {
    setLang(next);
    saveLang(next);
  }

  return (
    <main className="app-shell">
      <section className="sidebar" aria-label={t(lang, "aria.systemStatus")}>
        <div className="brand-lockup">
          <p className="eyebrow">{t(lang, "brand.eyebrow")}</p>
          <h1>AI Native OS</h1>
          <span>{t(lang, "brand.subtitle")}</span>
        </div>

        <button className="os-launch" onClick={() => setOsOpen(true)} type="button">
          {t(lang, "os.launch")}
        </button>

        <div className="lang-toggle" aria-label={t(lang, "aria.langToggle")}>
          {(["es", "en"] as const).map((option) => (
            <button
              aria-pressed={lang === option}
              className={lang === option ? "active" : ""}
              key={option}
              onClick={() => changeLang(option)}
              type="button"
            >
              {option.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="status-panel">
          <span className={`status-dot ${agent.status}`} />
          <div>
            <strong>{statusLabel(agent.status, lang)}</strong>
            <p>{t(lang, "status.backend")}</p>
          </div>
        </div>

        <div className="settings-block">
          <span>{t(lang, "model.label")}</span>
          <strong>{import.meta.env.VITE_MODEL_LABEL || t(lang, "model.fallback")}</strong>
        </div>

        <button
          className="secondary-button tooltip-control"
          data-tooltip={t(lang, "reset.tooltip")}
          onClick={agent.reset}
          title={t(lang, "reset.tooltip")}
          type="button"
        >
          <RotateCcw size={16} />
          {t(lang, "reset.label")}
        </button>
      </section>

      <section className="chat-panel" aria-label={t(lang, "aria.chat")}>
        <div className="messages">
          {messages.length === 0 ? (
            <div className="welcome">
              <div className="welcome-inner">
                <h2 className="welcome-greeting">{t(lang, "welcome.greeting")}</h2>
                <p className="welcome-sub">{t(lang, "welcome.sub")}</p>
                <div className="welcome-chips">
                  {INTENT_EXAMPLES.map((example) => (
                    <button
                      className="welcome-chip"
                      disabled={agent.status !== "ready"}
                      key={example.en}
                      onClick={() => sendMessage(example[lang])}
                      type="button"
                    >
                      {example[lang]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((message) => <ChatMessage key={message.id} lang={lang} message={message} />)
          )}
        </div>

        {agent.error ? <div className="error-box">{String(agent.error.message ?? agent.error)}</div> : null}

        {pendingApproval ? (
          <ApprovalCard
            busy={agent.status === "submitted" || agent.status === "streaming"}
            lang={lang}
            onRespond={respondToApproval}
            part={pendingApproval}
          />
        ) : null}

        <form className="composer" onSubmit={onSubmit}>
          <textarea
            aria-label={t(lang, "aria.message")}
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
                ? t(lang, "composer.pending")
                : t(lang, "composer.placeholder")
            }
            value={input}
          />
          {agent.status === "submitted" || agent.status === "streaming" ? (
            <button
              aria-label={t(lang, "composer.stop")}
              className="tooltip-control"
              data-tooltip={t(lang, "composer.stopTooltip")}
              onClick={agent.stop}
              title={t(lang, "composer.stopTooltip")}
              type="button"
            >
              <Square size={18} />
            </button>
          ) : (
            <button
              aria-label={t(lang, "composer.send")}
              className="tooltip-control"
              data-tooltip={t(lang, "composer.sendTooltip")}
              disabled={!input.trim() || Boolean(pendingApproval)}
              title={t(lang, "composer.sendTooltip")}
              type="submit"
            >
              <Send size={18} />
            </button>
          )}
        </form>
      </section>

      {osOpen ? (
        <OsDesktop
          lang={lang}
          onClose={() => setOsOpen(false)}
          onLaunch={(app) => {
            if (app.kind === "prompt" && app.prompt) {
              void sendMessage(app.prompt[lang]);
              setOsOpen(false);
            }
          }}
        />
      ) : null}
    </main>
  );
}

type FileEntry = {
  name: string;
  type: "dir" | "file";
  size: number;
  modifiedAt: string;
};

type FileListing = {
  root: string;
  path: string;
  parent: string | null;
  entries: FileEntry[];
  error?: string;
};

const EXPLORER_PATH_KEY = "ainativeos.explorer.path";

function OsDesktop({
  lang,
  onClose,
  onLaunch,
}: {
  lang: Lang;
  onClose: () => void;
  onLaunch: (app: OsApp) => void;
}) {
  const [explorerOpen, setExplorerOpen] = useState(false);

  function launch(app: OsApp) {
    if (app.kind === "explorer") {
      setExplorerOpen(true);
      return;
    }
    onLaunch(app);
  }

  return (
    <div className="os-overlay" role="dialog" aria-modal="true" aria-label={t(lang, "os.title")}>
      <section className="os-window os-program-manager">
        <div className="os-titlebar">
          <span>{t(lang, "os.title")}</span>
          <button className="os-close" onClick={onClose} type="button" aria-label={t(lang, "os.close")}>
            ✕
          </button>
        </div>
        <div className="os-window-body">
          <p className="os-hint">{t(lang, "os.hint")}</p>
          <div className="os-icon-grid">
            {OS_APPS.map((app) => {
              const Icon = app.icon;
              return (
                <button
                  className="os-icon"
                  key={app.id}
                  onClick={() => launch(app)}
                  onDoubleClick={() => launch(app)}
                  type="button"
                >
                  <span className="os-icon-tile">
                    <Icon size={30} strokeWidth={1.8} />
                  </span>
                  <span className="os-icon-label">{app.label[lang]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {explorerOpen ? <FileExplorer lang={lang} onClose={() => setExplorerOpen(false)} /> : null}
    </div>
  );
}

function FileExplorer({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const [currentPath, setCurrentPath] = useState(() => readStoredExplorerPath());
  const [listing, setListing] = useState<FileListing | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(EXPLORER_PATH_KEY, currentPath);
    } catch {
      // Keep the explorer usable even when browser storage is unavailable.
    }
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/files?path=${encodeURIComponent(currentPath)}`, { signal: controller.signal })
      .then((response) => response.json() as Promise<FileListing>)
      .then(setListing)
      .catch((error) => {
        if (!controller.signal.aborted) {
          setListing({
            root: "",
            path: currentPath,
            parent: null,
            entries: [],
            error: error instanceof Error ? error.message : String(error),
          });
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [currentPath]);

  const pathParts = currentPath ? currentPath.split("/").filter(Boolean) : [];
  const visibleEntries = listing?.entries ?? [];

  return (
    <section className="os-window os-explorer">
      <div className="os-titlebar">
        <span>{t(lang, "os.explorer.title")}</span>
        <button className="os-close" onClick={onClose} type="button" aria-label={t(lang, "os.close")}>
          ✕
        </button>
      </div>
      <div className="os-window-body">
        <div className="explorer-toolbar">
          <button
            className="os-raised-button"
            disabled={!listing?.parent && currentPath === ""}
            onClick={() => setCurrentPath(listing?.parent ?? "")}
            type="button"
          >
            {t(lang, "os.explorer.up")}
          </button>
          <div className="explorer-path" aria-label={t(lang, "os.explorer.title")}>
            <button type="button" onClick={() => setCurrentPath("")}>
              {t(lang, "os.explorer.root")}
            </button>
            {pathParts.map((part, index) => {
              const nextPath = pathParts.slice(0, index + 1).join("/");
              return (
                <button key={nextPath} type="button" onClick={() => setCurrentPath(nextPath)}>
                  {part}
                </button>
              );
            })}
          </div>
        </div>

        <p className="explorer-root">
          {t(lang, "os.explorer.root")}: {listing?.root || "..."}
        </p>
        {listing?.error ? <div className="explorer-error">{listing.error}</div> : null}

        <div className="explorer-list" role="list" aria-busy={loading}>
          {visibleEntries.length === 0 ? (
            <div className="explorer-empty">{loading ? "..." : t(lang, "os.explorer.empty")}</div>
          ) : (
            visibleEntries.map((entry) => (
              <button
                className={`explorer-row ${entry.type}`}
                disabled={entry.type !== "dir"}
                key={`${entry.type}:${entry.name}`}
                onDoubleClick={() => {
                  if (entry.type === "dir") {
                    setCurrentPath([currentPath, entry.name].filter(Boolean).join("/"));
                  }
                }}
                onKeyDown={(event) => {
                  if (entry.type === "dir" && event.key === "Enter") {
                    setCurrentPath([currentPath, entry.name].filter(Boolean).join("/"));
                  }
                }}
                role="listitem"
                type="button"
              >
                <span>{entry.type === "dir" ? "[DIR]" : "[FILE]"}</span>
                <strong>{entry.name}</strong>
                <em>{entry.type === "dir" ? "" : formatBytes(entry.size)}</em>
              </button>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function readStoredExplorerPath() {
  try {
    return localStorage.getItem(EXPLORER_PATH_KEY) ?? "";
  } catch {
    return "";
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ChatMessage({ lang, message }: { lang: Lang; message: EveMessage }) {
  const text = message.parts.map(partToText).filter(Boolean).join("\n\n");

  if (!text.trim()) {
    return null;
  }

  return (
    <article className={`message ${message.role}`}>
      <div className="message-role">{message.role === "user" ? t(lang, "user.you") : "Eve"}</div>
      <div className="message-body">{text}</div>
    </article>
  );
}

const INTENT_EXAMPLES: Record<Lang, string>[] = [
  { es: "Resume estos PDFs", en: "Summarize these PDFs" },
  { es: "Redacta un email a un cliente", en: "Draft an email to a client" },
  { es: "Consulta una ley en el BOE", en: "Look up a Spanish law (BOE)" },
  { es: "Busca en la web y resume", en: "Search the web and summarize" },
  { es: "Ordena mis archivos", en: "Organize my files" },
];

function ApprovalCard({
  busy,
  lang,
  onRespond,
  part,
}: {
  busy: boolean;
  lang: Lang;
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
          lang,
        )
      : summarizeNativeApprovalAction(part.toolName, (part.input as Record<string, unknown>) ?? {}, lang) ??
        request.prompt;

  const options =
    request.options && request.options.length > 0
      ? request.options
      : [
          { id: "approve", label: t(lang, "approval.approve"), style: "primary" as const },
          { id: "deny", label: t(lang, "approval.cancel"), style: "danger" as const },
        ];

  return (
    <div className="approval-card" role="alertdialog" aria-label={t(lang, "approval.aria")}>
      <div className="approval-head">
        <ShieldAlert size={18} />
        <strong>{t(lang, "approval.title")}</strong>
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
            {option.id === "approve"
              ? t(lang, "approval.approve")
              : option.id === "deny"
                ? t(lang, "approval.cancel")
                : option.label}
          </button>
        ))}
      </div>
      <p className="approval-note">{t(lang, "approval.note")}</p>
    </div>
  );
}

function partToText(part: EveMessagePart) {
  if (part.type === "text") {
    return part.text;
  }

  return "";
}

function statusLabel(status: string, lang: Lang) {
  if (status === "submitted") {
    return t(lang, "status.sending");
  }
  if (status === "streaming") {
    return t(lang, "status.responding");
  }
  if (status === "error") {
    return t(lang, "status.error");
  }
  return t(lang, "status.ready");
}

createRoot(document.getElementById("root")!).render(<App />);
