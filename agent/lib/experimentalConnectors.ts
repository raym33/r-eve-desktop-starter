import { writeNewWorkspaceFile } from "./workspace.js";

export type EmailProvider = "gmail" | "microsoft";

export type ConnectorStatus = {
  configured: boolean;
  mode: "read" | "draft" | "send-disabled" | "send-enabled";
  missing: string[];
  provider?: string;
  safety: string[];
};

export type EmailDraftInput = {
  bodyText: string;
  cc?: string[];
  subject: string;
  to: string[];
};

export type EmailMessage = {
  date?: string;
  from?: string;
  id: string;
  provider: EmailProvider;
  snippet?: string;
  subject?: string;
};

export type WhatsAppDraftInput = {
  bodyText: string;
  contactLabel?: string;
  phoneNumber: string;
};

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";
const GRAPH_API = "https://graph.microsoft.com/v1.0/me";
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || "v20.0";

export function emailProvider(): EmailProvider {
  const provider = (process.env.EMAIL_PROVIDER || "gmail").toLowerCase();
  return provider === "microsoft" || provider === "outlook" || provider === "graph" ? "microsoft" : "gmail";
}

export function emailStatus(): ConnectorStatus {
  const provider = emailProvider();
  const tokenName = provider === "gmail" ? "GMAIL_OAUTH_ACCESS_TOKEN" : "MICROSOFT_GRAPH_ACCESS_TOKEN";
  const missing = requiredMissing([tokenName]);

  return {
    configured: missing.length === 0,
    missing,
    mode: "draft",
    provider,
    safety: [
      "OAuth access tokens are read from environment variables only.",
      "The connector can read message metadata and create drafts; it never sends mail.",
      "Draft creation is guarded by Eve approval because it writes to an external mailbox.",
      "Email bodies returned by list operations are limited to provider snippets.",
    ],
  };
}

export function whatsappStatus(): ConnectorStatus {
  const missing = requiredMissing(["WHATSAPP_CLOUD_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"]);
  const sendEnabled = process.env.WHATSAPP_EXPERIMENTAL_SEND === "1";

  return {
    configured: missing.length === 0,
    missing,
    mode: sendEnabled ? "send-enabled" : "send-disabled",
    provider: "whatsapp-cloud-api",
    safety: [
      "Uses the official WhatsApp Business Cloud API, not WhatsApp Web scraping.",
      "Replies can be prepared locally in the AI Native OS workspace without contacting Meta.",
      "Sending is disabled unless WHATSAPP_EXPERIMENTAL_SEND=1 is set.",
      "Even when enabled, sending is guarded by Eve approval.",
    ],
  };
}

export async function listEmailMessages({ limit, query }: { limit: number; query?: string }): Promise<EmailMessage[]> {
  const provider = emailProvider();
  if (provider === "microsoft") {
    return listMicrosoftMessages({ limit, query });
  }
  return listGmailMessages({ limit, query });
}

export async function createEmailDraft(input: EmailDraftInput): Promise<{
  id: string;
  provider: EmailProvider;
  webUrl?: string;
}> {
  const provider = emailProvider();
  if (provider === "microsoft") {
    return createMicrosoftDraft(input);
  }
  return createGmailDraft(input);
}

export async function prepareWhatsAppReply(input: WhatsAppDraftInput): Promise<{ path: string; status: "local-draft" }> {
  const markdown = [
    "# WhatsApp Reply Draft",
    "",
    `Created: ${new Date().toISOString()}`,
    `Contact: ${input.contactLabel || input.phoneNumber}`,
    `Phone: ${input.phoneNumber}`,
    "",
    "## Message",
    "",
    input.bodyText,
    "",
    "## Safety",
    "",
    "- This file is a local draft only.",
    "- Review the message before sending it through WhatsApp Business Cloud API.",
    "- The send tool still requires WHATSAPP_EXPERIMENTAL_SEND=1 and explicit Eve approval.",
    "",
  ].join("\n");

  const path = await writeNewWorkspaceFile("Drafts/WhatsApp", input.contactLabel || input.phoneNumber, "md", markdown);
  return { path, status: "local-draft" };
}

export async function sendWhatsAppMessage(input: WhatsAppDraftInput): Promise<{
  messageId?: string;
  phoneNumber: string;
  status: "sent";
}> {
  const status = whatsappStatus();
  if (!status.configured) {
    throw new Error(`WhatsApp Cloud API is not configured. Missing: ${status.missing.join(", ")}`);
  }
  if (process.env.WHATSAPP_EXPERIMENTAL_SEND !== "1") {
    throw new Error("WhatsApp sending is disabled. Set WHATSAPP_EXPERIMENTAL_SEND=1 to enable the guarded experimental sender.");
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const response = await fetch(`https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`, {
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: input.phoneNumber,
      type: "text",
      text: {
        body: input.bodyText,
        preview_url: false,
      },
    }),
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_CLOUD_TOKEN}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(`WhatsApp send failed: ${response.status} ${JSON.stringify(payload)}`);
  }

  return {
    messageId: payload?.messages?.[0]?.id,
    phoneNumber: input.phoneNumber,
    status: "sent",
  };
}

async function listGmailMessages({ limit, query }: { limit: number; query?: string }): Promise<EmailMessage[]> {
  const token = requireEnv("GMAIL_OAUTH_ACCESS_TOKEN");
  const url = new URL(`${GMAIL_API}/messages`);
  url.searchParams.set("maxResults", String(limit));
  if (query) {
    url.searchParams.set("q", query);
  }

  const listResponse = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const listPayload = await readJson(listResponse);
  if (!listResponse.ok) {
    throw new Error(`Gmail list failed: ${listResponse.status} ${JSON.stringify(listPayload)}`);
  }

  const messages = Array.isArray(listPayload.messages) ? listPayload.messages.slice(0, limit) : [];
  return Promise.all(
    messages.map(async (message: { id: string }) => {
      const detailResponse = await fetch(`${GMAIL_API}/messages/${encodeURIComponent(message.id)}?format=metadata`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const detail = await readJson(detailResponse);
      if (!detailResponse.ok) {
        throw new Error(`Gmail metadata failed: ${detailResponse.status} ${JSON.stringify(detail)}`);
      }
      const headers = new Map(
        (detail.payload?.headers || []).map((header: { name: string; value: string }) => [
          header.name.toLowerCase(),
          header.value,
        ]),
      );
      return {
        date: headers.get("date"),
        from: headers.get("from"),
        id: detail.id,
        provider: "gmail" as const,
        snippet: detail.snippet,
        subject: headers.get("subject"),
      };
    }),
  );
}

async function createGmailDraft(input: EmailDraftInput): Promise<{ id: string; provider: EmailProvider }> {
  const token = requireEnv("GMAIL_OAUTH_ACCESS_TOKEN");
  const raw = base64Url(rfc822(input));
  const response = await fetch(`${GMAIL_API}/drafts`, {
    body: JSON.stringify({ message: { raw } }),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(`Gmail draft failed: ${response.status} ${JSON.stringify(payload)}`);
  }
  return { id: payload.id, provider: "gmail" };
}

async function listMicrosoftMessages({ limit, query }: { limit: number; query?: string }): Promise<EmailMessage[]> {
  const token = requireEnv("MICROSOFT_GRAPH_ACCESS_TOKEN");
  const url = new URL(`${GRAPH_API}/messages`);
  url.searchParams.set("$top", String(limit));
  url.searchParams.set("$select", "id,subject,from,receivedDateTime,bodyPreview,webLink");
  if (query) {
    url.searchParams.set("$search", `"${query.replace(/"/g, '\\"')}"`);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      ConsistencyLevel: "eventual",
      Accept: "application/json",
    },
  });
  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(`Microsoft Graph list failed: ${response.status} ${JSON.stringify(payload)}`);
  }

  return (payload.value || []).map((message: any) => ({
    date: message.receivedDateTime,
    from: message.from?.emailAddress?.address || message.from?.emailAddress?.name,
    id: message.id,
    provider: "microsoft" as const,
    snippet: message.bodyPreview,
    subject: message.subject,
  }));
}

async function createMicrosoftDraft(input: EmailDraftInput): Promise<{ id: string; provider: EmailProvider; webUrl?: string }> {
  const token = requireEnv("MICROSOFT_GRAPH_ACCESS_TOKEN");
  const response = await fetch(`${GRAPH_API}/messages`, {
    body: JSON.stringify({
      body: {
        content: input.bodyText,
        contentType: "Text",
      },
      ccRecipients: (input.cc || []).map((address) => ({ emailAddress: { address } })),
      subject: input.subject,
      toRecipients: input.to.map((address) => ({ emailAddress: { address } })),
    }),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(`Microsoft Graph draft failed: ${response.status} ${JSON.stringify(payload)}`);
  }
  return { id: payload.id, provider: "microsoft", webUrl: payload.webLink };
}

function rfc822(input: EmailDraftInput): string {
  const headers = [
    `To: ${input.to.join(", ")}`,
    input.cc?.length ? `Cc: ${input.cc.join(", ")}` : "",
    `Subject: ${sanitizeHeader(input.subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
  ].filter(Boolean);
  return `${headers.join("\r\n")}\r\n\r\n${input.bodyText}`;
}

function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function base64Url(value: string): string {
  return Buffer.from(value, "utf-8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function requiredMissing(names: string[]): string[] {
  return names.filter((name) => !process.env[name]);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for this experimental connector.`);
  }
  return value;
}

async function readJson(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}
