# Experimental Connectors

AI Native OS includes early, opt-in communication connectors for email and WhatsApp.

These tools live in `optional-tools/experimental` and are not active in the compact default agent. To enable them, copy the `.ts` files from that folder into `agent/tools`, run `npm run build`, and restart Eve.

These connectors are intentionally conservative:

- they read credentials only from environment variables;
- they never print access tokens;
- email sending is not implemented;
- email draft creation requires Eve approval;
- WhatsApp uses the official WhatsApp Business Cloud API, never WhatsApp Web scraping;
- WhatsApp sending is disabled unless `WHATSAPP_EXPERIMENTAL_SEND=1` is set and still requires Eve approval.

## Tools

Email:

- `experimental_email_status`
- `experimental_email_list`
- `experimental_email_create_draft`

WhatsApp:

- `experimental_whatsapp_status`
- `experimental_whatsapp_prepare_reply`
- `experimental_whatsapp_send_message`

## Gmail

Set:

```bash
EMAIL_PROVIDER=gmail
GMAIL_OAUTH_ACCESS_TOKEN=...
```

Required OAuth scopes:

```text
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/gmail.compose
```

`experimental_email_list` reads metadata and snippets. `experimental_email_create_draft` writes a draft only after approval.

## Microsoft 365 / Outlook

Set:

```bash
EMAIL_PROVIDER=microsoft
MICROSOFT_GRAPH_ACCESS_TOKEN=...
```

Recommended Microsoft Graph delegated permissions:

```text
Mail.Read
Mail.ReadWrite
```

`experimental_email_create_draft` creates a message draft through Microsoft Graph. It does not send it.

## WhatsApp Business Cloud API

Set:

```bash
WHATSAPP_CLOUD_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_API_VERSION=v20.0
WHATSAPP_EXPERIMENTAL_SEND=0
```

Use `experimental_whatsapp_prepare_reply` for the default safe path. It creates a local Markdown draft under:

```text
~/AI-Native-OS/Drafts/WhatsApp
```

To test guarded sending in a development environment:

```bash
WHATSAPP_EXPERIMENTAL_SEND=1
```

Even then, `experimental_whatsapp_send_message` pauses for human approval before sending.

## Recommended Flow

1. Ask the agent to check connector status.
2. Read message snippets or prepare local drafts.
3. Review the exact draft content.
4. Approve draft creation or WhatsApp sending only when the destination and content are correct.

Do not use these connectors for regulated, medical, financial, legal, or high-risk communications without an external compliance review.
