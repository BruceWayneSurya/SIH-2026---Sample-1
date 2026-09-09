/**
 * Outbound mail for faculty verification codes.
 *
 * Three providers, chosen by environment so a deployment never needs a code
 * change to go live:
 *
 *   MAIL_PROVIDER=smtp     SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_SECURE
 *                          (works with a Gmail app password on 465 or 587)
 *   MAIL_PROVIDER=resend   RESEND_API_KEY  (one HTTPS call, no sockets)
 *   MAIL_PROVIDER=console  default — writes the message to the server log.
 *
 * With the console provider the API also returns the code (`devCode`) unless
 * the app runs in production, which keeps a local demo usable without
 * credentials while never leaking a live code.
 */
import type { Duplex } from "node:stream";
import net from "node:net";
import tls from "node:tls";

export type MailProvider = "smtp" | "resend" | "console";

export type SmtpSettings = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
};

export type MailConfig = {
  provider: MailProvider;
  from: string;
  fromName: string;
  supportEmail: string;
  portalName: string;
  smtp: SmtpSettings | null;
  resendApiKey: string;
};

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type SendResult = {
  delivered: boolean;
  provider: MailProvider;
  detail: string;
  /** Only ever populated by the console provider outside production. */
  devCode?: string;
};

const DEFAULT_FROM = "no-reply@pragyan.gov.in";
const SMTP_TIMEOUT_MS = 15_000;

export function getMailConfig(
  env: Record<string, string | undefined> = process.env,
): MailConfig {
  const requested = env.MAIL_PROVIDER?.trim().toLowerCase() ?? "";
  const port = Number(env.SMTP_PORT?.trim());
  const smtp: SmtpSettings | null = env.SMTP_HOST?.trim()
    ? {
        host: env.SMTP_HOST.trim(),
        port: Number.isFinite(port) && port > 0 ? port : env.SMTP_SECURE === "1" ? 465 : 587,
        secure: env.SMTP_SECURE === "1" || port === 465,
        user: env.SMTP_USER?.trim() ?? "",
        pass: env.SMTP_PASS?.trim() ?? "",
      }
    : null;
  const resendApiKey = env.RESEND_API_KEY?.trim() ?? "";

  let provider: MailProvider = "console";
  if (requested === "smtp" && smtp) provider = "smtp";
  else if (requested === "resend" && resendApiKey) provider = "resend";
  else if (smtp) provider = "smtp";
  else if (resendApiKey) provider = "resend";

  return {
    provider,
    from: env.MAIL_FROM?.trim() || DEFAULT_FROM,
    fromName: env.MAIL_FROM_NAME?.trim() || "Pragyan Learning Portal",
    supportEmail: env.PORTAL_SUPPORT_EMAIL?.trim() || "support@pragyan.gov.in",
    portalName: env.PORTAL_NAME?.trim() || "Pragyan — National Learning Portal",
    smtp,
    resendApiKey,
  };
}

/** The message itself is built here so the wording is testable and shared. */
export function verificationMail(input: {
  to: string;
  name: string;
  code: string;
  ttlMinutes: number;
  config: MailConfig;
}): MailMessage {
  const { to, name, code, ttlMinutes, config } = input;
  const subject = `${code} is your ${config.portalName} verification code`;
  const text = [
    `Namaste ${name},`,
    "",
    `Your one-time verification code for ${config.portalName} is:`,
    "",
    `    ${code}`,
    "",
    `It is valid for ${ttlMinutes} minutes and can only be used once.`,
    "If you did not request this code, ignore this message — nobody can sign in",
    "as faculty without also knowing your password.",
    "",
    `Need help? Write to ${config.supportEmail}.`,
  ].join("\n");
  const html = `<div style="font-family:system-ui,Arial,sans-serif;max-width:520px;margin:0 auto;color:#0c2a43">
  <p style="font-size:15px">Namaste <strong>${escapeHtml(name)}</strong>,</p>
  <p style="font-size:15px">Use this one-time code to verify your email address on ${escapeHtml(config.portalName)}:</p>
  <p style="font-size:32px;font-weight:800;letter-spacing:6px;background:#fff6ea;border:1px solid #ffd9a8;border-radius:8px;padding:14px;text-align:center;margin:18px 0">${code}</p>
  <p style="font-size:14px;color:#475569">Valid for ${ttlMinutes} minutes. If you did not request it, ignore this email.</p>
  <p style="font-size:13px;color:#64748b">${escapeHtml(config.supportEmail)}</p>
</div>`;
  return { to, subject, text, html };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) =>
    c === "&"
      ? "&amp;"
      : c === "<"
        ? "&lt;"
        : c === ">"
          ? "&gt;"
          : c === '"'
            ? "&quot;"
            : "&#39;",
  );
}

export type MailDeps = {
  connect?: (host: string, port: number) => Promise<Duplex>;
  upgrade?: (socket: Duplex, host: string) => Promise<Duplex>;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  randomToken?: () => string;
};

export async function sendMail(
  message: MailMessage,
  config: MailConfig,
  deps: MailDeps = {},
): Promise<SendResult> {
  try {
    if (config.provider === "resend" && config.resendApiKey)
      return await sendViaResend(message, config, deps);
    if (config.provider === "smtp" && config.smtp)
      return await sendViaSmtp(message, config, deps);
  } catch (error) {
    return {
      delivered: false,
      provider: config.provider,
      detail: error instanceof Error ? error.message : "mail transport failed",
    };
  }
  console.info(
    `[mail] console provider → ${message.to}: ${message.subject}\n${message.text}`,
  );
  return {
    delivered: false,
    provider: "console",
    detail: "No mail provider configured; the code was written to the server log.",
  };
}

async function sendViaResend(
  message: MailMessage,
  config: MailConfig,
  deps: MailDeps,
): Promise<SendResult> {
  const doFetch = deps.fetchImpl ?? fetch;
  const response = await doFetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${config.fromName} <${config.from}>`,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
  });
  if (!response.ok) throw new Error(`Resend responded ${response.status}`);
  return { delivered: true, provider: "resend", detail: "sent via Resend" };
}

/* ------------------------------- raw SMTP ------------------------------- */

/** Minimal request/response reader: one reply (possibly multi-line) at a time. */
class SmtpDialog {
  private buffer = "";
  private waiter: ((text: string) => void) | null = null;

  constructor(private socket: Duplex, private timeoutMs = SMTP_TIMEOUT_MS) {
    socket.setEncoding("utf8");
    socket.on("data", (chunk: string) => {
      this.buffer += chunk;
      this.waiter?.(this.buffer);
    });
  }

  private read(): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiter = null;
        reject(new Error("SMTP reply timed out"));
      }, this.timeoutMs);
      const complete = (text: string) =>
        /^\d{3}( |-)/.test(text) &&
        /(?:^|\r?\n)\d{3} \S[^\n]*(\r?\n)?$/.test(text) &&
        /\r?\n$/.test(text);
      const check = (text: string) => {
        if (!complete(text)) {
          this.waiter = check;
          return;
        }
        clearTimeout(timer);
        this.waiter = null;
        this.buffer = "";
        resolve(text.trimEnd());
      };
      check(this.buffer);
    });
  }

  write(line: string): void {
    this.socket.write(`${line}\r\n`);
  }

  /** Read (and validate) the next reply without sending anything. */
  async reply(codes: number | number[], step: string): Promise<string> {
    const response = await this.read();
    const status = Number(response.slice(0, 3));
    if (!(Array.isArray(codes) ? codes : [codes]).includes(status))
      throw new Error(`SMTP ${step} failed: ${response.split("\n")[0]}`);
    return response;
  }

  async command(line: string, codes: number | number[], step: string): Promise<string> {
    this.write(line);
    const reply = await this.read();
    const status = Number(reply.slice(0, 3));
    if (!(Array.isArray(codes) ? codes : [codes]).includes(status))
      throw new Error(`SMTP ${step} failed: ${reply.split("\n")[0]}`);
    return reply;
  }

  async data(payload: string, step: string): Promise<string> {
    this.socket.write(payload);
    const reply = await this.read();
    if (!reply.startsWith("250"))
      throw new Error(`SMTP ${step} failed: ${reply.split("\n")[0]}`);
    return reply;
  }

  close(): void {
    this.socket.end();
    this.socket.destroy();
  }
}

/** Header + multipart body, dot-stuffed the way RFC 5321 requires. */
export function rfc822(
  message: MailMessage,
  config: MailConfig,
  deps: MailDeps = {},
): string {
  const now = deps.now?.() ?? new Date();
  const token =
    deps.randomToken?.() ??
    `${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  const boundary = `pragyan_${token}`.replace(/[^a-z0-9_]/gi, "");
  const body = [
    `From: ${config.fromName} <${config.from}>`,
    `To: <${message.to}>`,
    `Subject: =?UTF-8?B?${Buffer.from(message.subject, "utf8").toString("base64")}?=`,
    `Date: ${now.toUTCString()}`,
    `Message-ID: <${token}@${config.from.split("@")[1] ?? "localhost"}>`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    message.text,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    message.html ?? "",
    "",
    `--${boundary}--`,
    "",
  ].join("\r\n");
  return body.replace(/^\./gm, "..");
}

export async function sendViaSmtp(
  message: MailMessage,
  config: MailConfig,
  deps: MailDeps = {},
): Promise<SendResult> {
  const smtp = config.smtp;
  if (!smtp) throw new Error("SMTP transport requested without SMTP_HOST.");

  const connect =
    deps.connect ??
    ((host: string, port: number) =>
      new Promise<Duplex>((resolve, reject) => {
        const socket = smtp.secure
          ? tls.connect({ host, port, servername: host })
          : net.connect({ host, port });
        socket.once("error", reject);
        socket.once(smtp.secure ? "secureConnect" : "connect", () => resolve(socket));
      }));

  let socket = await connect(smtp.host, smtp.port);
  let dialog = new SmtpDialog(socket);
  await dialog.reply(220, "greeting");
  let caps = await dialog.command("EHLO pragyan.local", 250, "EHLO");

  if (!smtp.secure && /STARTTLS/i.test(caps)) {
    await dialog.command("STARTTLS", 220, "STARTTLS");
    const upgrade =
      deps.upgrade ??
      ((plain: Duplex, host: string) =>
        new Promise<Duplex>((resolve, reject) => {
          const secure = tls.connect({ socket: plain as net.Socket, servername: host });
          secure.once("error", reject);
          secure.once("secureConnect", () => resolve(secure));
        }));
    socket = await upgrade(socket, smtp.host);
    dialog = new SmtpDialog(socket);
    caps = await dialog.command("EHLO pragyan.local", 250, "EHLO after STARTTLS");
  }

  if (smtp.user && /AUTH/i.test(caps)) {
    await dialog.command("AUTH LOGIN", [235, 334], "AUTH");
    await dialog.command(Buffer.from(smtp.user).toString("base64"), [235, 334], "AUTH user");
    await dialog.command(Buffer.from(smtp.pass).toString("base64"), 235, "AUTH pass");
  }

  await dialog.command(`MAIL FROM:<${config.from}>`, 250, "MAIL FROM");
  await dialog.command(`RCPT TO:<${message.to}>`, [250, 251], "RCPT TO");
  await dialog.command("DATA", 354, "DATA");
  await dialog.data(`${rfc822(message, config, deps)}\r\n.\r\n`, "message body");
  dialog.write("QUIT");
  dialog.close();
  return { delivered: true, provider: "smtp", detail: `sent via ${smtp.host}` };
}
