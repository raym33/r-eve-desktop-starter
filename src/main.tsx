import { useEveAgent } from "eve/react";
import type { EveMessage, EveMessagePart } from "eve/client";
import { summarizeGuardedAction, summarizeNativeApprovalAction } from "../agent/lib/guardedTools.js";
import {
  RotateCcw,
  Send,
  ShieldAlert,
  Square,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { type Lang, loadLang, saveLang, t } from "./i18n.js";
import "./styles.css";

function App() {
  const agent = useEveAgent({ host: "" });
  const [lang, setLang] = useState<Lang>(loadLang);
  const [input, setInput] = useState("");

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
    </main>
  );
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
