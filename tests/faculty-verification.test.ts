import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Duplex } from "node:stream";
import {
  assessFacultyEmail,
  canModerateNotes,
  emailDomain,
  emailTrust,
  isEmailAddress,
  maskEmail,
  normalizeEmail,
  personalEmailPolicy,
  verificationLabel,
} from "../src/lib/faculty-email";
import {
  MAX_SENDS_PER_HOUR,
  OTP_MAX_ATTEMPTS,
  canSend,
  canSubmit,
  describeDecision,
  generateOtp,
  hashOtp,
  normalizeCode,
  openChallenge,
  otpExpiry,
  otpMatches,
  resendCountdown,
  signChallenge,
} from "../src/lib/otp";
import {
  getMailConfig,
  rfc822,
  sendMail,
  sendViaSmtp,
  verificationMail,
  type MailConfig,
} from "../src/lib/mail";

const TEST_SECRET = "test-only-secret-not-a-real-credential";

/* --------------------------- email policy --------------------------- */

describe("faculty email policy", () => {
  it("classifies institutional, personal and unknown domains", () => {
    assert.equal(emailTrust("anita.sharma@vidyasetu.gov.in"), "institutional");
    assert.equal(emailTrust("teacher@school.nic.in"), "institutional");
    assert.equal(emailTrust("head@kvsgujarat.kvs.gov.in"), "institutional");
    assert.equal(emailTrust("prof@iitb.ac.in"), "institutional");
    assert.equal(emailTrust("faculty@college.edu.in"), "institutional");
    assert.equal(emailTrust("ravi.verma@gmail.com"), "personal");
    assert.equal(emailTrust("Ravi.Verma@Yahoo.Co.In"), "personal");
    assert.equal(emailTrust("someone@unknowncorp.com"), "other");
    assert.equal(emailTrust("not-an-email"), "other");
    assert.equal(emailDomain("a.b@Sub.Domain.IN"), "sub.domain.in");
  });

  it("normalises and validates addresses", () => {
    assert.equal(normalizeEmail("  Anita.Sharma@VIDYASETU.gov.in  "), "anita.sharma@vidyasetu.gov.in");
    assert.equal(normalizeEmail(42), "");
    for (const bad of ["", "plain", "a@b", "a b@c.in", "a@b@c.in", "x".repeat(130) + "@a.in"])
      assert.equal(isEmailAddress(bad), false, bad);
    assert.equal(isEmailAddress("anita.sharma@vidyasetu.gov.in"), true);
  });

  it("verifies institutional addresses as soon as the mailbox is proven", () => {
    const decision = assessFacultyEmail("Anita.Sharma@vidyasetu.gov.in");
    assert.equal(decision.allowed, true);
    assert.equal(decision.trust, "institutional");
    assert.equal(decision.statusAfterOtp, "verified");
  });

  it("keeps personal addresses pending review by default", () => {
    const decision = assessFacultyEmail("ravi.verma@gmail.com", {});
    assert.equal(decision.allowed, true);
    assert.equal(decision.statusAfterOtp, "pending_review");
    assert.equal(personalEmailPolicy({}), "review");
  });

  it("can block personal mailboxes or wave them through for a pilot", () => {
    const blocked = assessFacultyEmail("ravi.verma@gmail.com", {
      FACULTY_PERSONAL_EMAIL_POLICY: "block",
    });
    assert.equal(blocked.allowed, false);
    assert.match(blocked.message, /not accepted/i);
    const allowed = assessFacultyEmail("ravi.verma@gmail.com", {
      FACULTY_PERSONAL_EMAIL_POLICY: "allow",
    });
    assert.equal(allowed.statusAfterOtp, "verified");
  });

  it("refuses malformed addresses and masks them for display", () => {
    assert.equal(assessFacultyEmail("nope").allowed, false);
    assert.equal(maskEmail("anita.sharma@vidyasetu.gov.in"), "a••••••••••a@vidyasetu.gov.in");
    assert.equal(maskEmail("bob@gmail.com"), "b•••@gmail.com");
    assert.equal(maskEmail("garbage"), "•••");
  });

  it("grants moderation only to verified faculty", () => {
    assert.equal(canModerateNotes({ role: "faculty", verificationStatus: "verified" }), true);
    assert.equal(canModerateNotes({ role: "faculty", verificationStatus: "pending_review" }), false);
    assert.equal(canModerateNotes({ role: "student", verificationStatus: "verified" }), false);
    assert.equal(verificationLabel("pending_review"), "Pending institutional review");
    assert.equal(verificationLabel("verified"), "Verified faculty");
  });
});

/* ------------------------------ one-time codes ------------------------------ */

describe("one-time verification codes", () => {
  it("generates six digits and never stores the plain code", () => {
    for (let i = 0; i < 40; i++) assert.match(generateOtp(), /^\d{6}$/);
    const digest = hashOtp("123456", "a@b.gov.in", TEST_SECRET);
    assert.equal(digest.includes("123456"), false);
    assert.equal(otpMatches("123456", digest, "a@b.gov.in", TEST_SECRET), true);
    assert.equal(otpMatches("123457", digest, "a@b.gov.in", TEST_SECRET), false);
    assert.equal(otpMatches("123456", digest, "other@b.gov.in", TEST_SECRET), false);
    assert.equal(normalizeCode(" 12a34b56c78 "), "12345678");
    // A wrong-length code can never match the stored digest.
    assert.equal(otpMatches("12345678", hashOtp("123456", "a@b.gov.in", TEST_SECRET), "a@b.gov.in", TEST_SECRET), false);
    assert.equal(normalizeCode(undefined), "");
  });

  it("enforces expiry, attempt lockout, resend cooldown and the hourly cap", () => {
    const now = Date.now();
    const fresh = {
      attempts: 0,
      sends: 1,
      lastSentAt: now,
      expiresAt: otpExpiry(now),
      consumedAt: null,
    };
    assert.equal(canSend({ ...fresh, lastSentAt: now - 61_000 }, now).ok, true);
    const cooling = canSend(fresh, now);
    assert.equal(cooling.ok, false);
    if (!cooling.ok) {
      assert.equal(cooling.reason, "cooldown");
      assert.match(describeDecision(cooling), /wait \d+ second/);
    }
    assert.equal(canSend({ ...fresh, sends: MAX_SENDS_PER_HOUR, lastSentAt: null }, now).ok, false);
    assert.equal(canSend({ ...fresh, consumedAt: now }, now).ok, false);
    assert.equal(canSend({ ...fresh, expiresAt: now - 1 }, now).ok, false);

    assert.equal(canSubmit(fresh, now).ok, true);
    const locked = canSubmit({ ...fresh, attempts: OTP_MAX_ATTEMPTS, lastSentAt: null }, now);
    assert.equal(locked.ok, false);
    if (!locked.ok) {
      assert.equal(locked.reason, "locked");
      assert.match(describeDecision(locked), /Too many/);
    }
    assert.equal(canSubmit({ ...fresh, expiresAt: now - 1 }, now).ok, false);
    assert.equal(resendCountdown(now, now), 60);
    assert.equal(resendCountdown(now - 60_000, now), 0);
    assert.equal(resendCountdown(null, now), 0);
  });

  it("signs challenge tokens and rejects forged or expired ones", () => {
    const now = Date.now();
    const token = signChallenge({ id: 7, email: "a@b.gov.in", expiresAt: now + 60_000 }, TEST_SECRET);
    assert.deepEqual(openChallenge(token, now, TEST_SECRET), {
      id: 7,
      email: "a@b.gov.in",
      expiresAt: now + 60_000,
    });
    const [body] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ id: 8, email: "attacker@x.in", expiresAt: now + 900_000 }),
    ).toString("base64url");
    assert.equal(openChallenge(`${forged}.${token.split(".")[1]}`, now, TEST_SECRET), null);
    assert.equal(openChallenge(`${body}.deadbeef`, now, TEST_SECRET), null);
    assert.equal(
      openChallenge(
        signChallenge({ id: 7, email: "a@b.gov.in", expiresAt: now - 1 }, TEST_SECRET),
        now,
        TEST_SECRET,
      ),
      null,
    );
    assert.equal(openChallenge("nonsense", now, TEST_SECRET), null);
    assert.equal(openChallenge(undefined, now, TEST_SECRET), null);
    assert.equal(openChallenge(token, now, "another-secret"), null);
  });
});

/* -------------------------------- mail -------------------------------- */

describe("mail configuration and message building", () => {
  const consoleConfig = getMailConfig({});

  it("selects a provider from the environment and falls back to the log", () => {
    assert.equal(consoleConfig.provider, "console");
    assert.equal(
      getMailConfig({ SMTP_HOST: "smtp.gmail.com", SMTP_PORT: "465" }).provider,
      "smtp",
    );
    assert.equal(getMailConfig({ SMTP_HOST: "smtp.gmail.com" }).smtp?.port, 587);
    assert.equal(
      getMailConfig({ MAIL_PROVIDER: "resend", RESEND_API_KEY: "re_test" }).provider,
      "resend",
    );
    // A requested provider without credentials must not silently pretend to send.
    assert.equal(getMailConfig({ MAIL_PROVIDER: "smtp" }).provider, "console");
    assert.equal(getMailConfig({ MAIL_PROVIDER: "resend" }).provider, "console");
  });

  it("puts the code, the expiry and the helpdesk address in the message", () => {
    const mail = verificationMail({
      to: "anita.sharma@vidyasetu.gov.in",
      name: "Anita Sharma",
      code: "246810",
      ttlMinutes: 10,
      config: consoleConfig,
    });
    assert.equal(mail.to, "anita.sharma@vidyasetu.gov.in");
    assert.match(mail.subject, /246810/);
    assert.match(mail.text, /Anita Sharma/);
    assert.match(mail.text, /10 minutes/);
    assert.match(mail.text, /support@pragyan\.gov\.in/);
    assert.match(mail.html ?? "", /246810/);
  });

  it("escapes the name in HTML and dot-stuffs the MIME body", () => {
    const mail = verificationMail({
      to: "t@x.gov.in",
      name: "<script>alert(1)</script>",
      code: "111111",
      ttlMinutes: 10,
      config: consoleConfig,
    });
    assert.equal((mail.html ?? "").includes("<script>"), false);
    const raw = rfc822(
      { ...mail, text: ".hidden\nsecond line" },
      consoleConfig,
      { now: () => new Date("2026-09-09T10:00:00Z"), randomToken: () => "fixedtoken" },
    );
    assert.match(raw, /^From: /m);
    assert.match(raw, /Subject: =\?UTF-8\?B\?/);
    assert.match(raw, /^\.\.hidden$/m);
    assert.match(raw, /Content-Type: multipart\/alternative; boundary="/);
  });

  it("logs and reports non-delivery when no provider is configured", async () => {
    const result = await sendMail(
      { to: "a@b.gov.in", subject: "s", text: "t" },
      consoleConfig,
    );
    assert.equal(result.delivered, false);
    assert.equal(result.provider, "console");
  });

  it("sends through Resend with the key only in the Authorization header", async () => {
    const seen: { url: string; auth: string | null; body: string }[] = [];
    const config = getMailConfig({ RESEND_API_KEY: "re_test_key" });
    const result = await sendMail(
      verificationMail({ to: "a@b.gov.in", name: "A", code: "123456", ttlMinutes: 10, config }),
      config,
      {
        fetchImpl: (async (input, init) => {
          const request = new Request(input, init);
          seen.push({
            url: request.url,
            auth: request.headers.get("authorization"),
            body: await request.text(),
          });
          return Response.json({ id: "mail_1" });
        }) as typeof fetch,
      },
    );
    assert.equal(result.delivered, true);
    assert.equal(seen[0].url, "https://api.resend.com/emails");
    assert.equal(seen[0].auth, "Bearer re_test_key");
    assert.match(seen[0].body, /123456/);
  });

  it("reports a provider failure instead of pretending the code was sent", async () => {
    const config = getMailConfig({ RESEND_API_KEY: "re_test_key" });
    const result = await sendMail({ to: "a@b.gov.in", subject: "s", text: "t" }, config, {
      fetchImpl: (async () => new Response("nope", { status: 401 })) as typeof fetch,
    });
    assert.equal(result.delivered, false);
    assert.match(result.detail, /401/);
  });
});

/* ------------------------------ raw SMTP ------------------------------ */

type Script = { [line: string]: string };

/** In-memory socket that answers SMTP commands from a script. */
function scriptedSocket(script: Script, sent: string[], dataLines: string[]) {
  let inData = false;
  return new Duplex({
    read() {},
    write(chunk, _encoding, callback) {
      const text = chunk.toString();
      sent.push(text);
      if (inData) {
        dataLines.push(text);
        if (text.endsWith("\r\n.\r\n")) {
          inData = false;
          this.push(script["."]);
        }
        callback();
        return;
      }
      const command = text.trim();
      if (command === "DATA") inData = true;
      const reply = script[command.split(" ")[0]] ?? script[command];
      if (reply) this.push(reply);
      callback();
    },
  });
}

describe("SMTP transport", () => {
  const baseScript: Script = {
    EHLO: "250-smtp.test\r\n250-AUTH LOGIN\r\n250 8BITMIME\r\n",
    "AUTH LOGIN": "334 VXNlcm5hbWU6\r\n",
    "dGVzdHVzZXI=": "334 UGFzc3dvcmQ6\r\n",
    "c2VjcmV0cGFzcw==": "235 Authentication successful\r\n",
    "MAIL FROM:<no-reply@pragyan.gov.in>": "250 OK\r\n",
    "RCPT TO:<a@b.gov.in>": "250 OK\r\n",
    DATA: "354 End data with <CR><LF>.<CR><LF>\r\n",
    ".": "250 Message queued\r\n",
    QUIT: "221 Bye\r\n",
  };

  it("logs in, sends the MIME body and quits", async () => {
    const sent: string[] = [];
    const dataLines: string[] = [];
    const socket = scriptedSocket({ ...baseScript }, sent, dataLines);
    // The greeting arrives before any command.
    queueMicrotask(() => socket.push("220 smtp.test ESMTP ready\r\n"));

    const config: MailConfig = {
      ...getMailConfig({ MAIL_FROM: "no-reply@pragyan.gov.in" }),
      provider: "smtp",
      smtp: { host: "smtp.test", port: 587, secure: true, user: "testuser", pass: "secretpass" },
    };
    const result = await sendViaSmtp(
      { to: "a@b.gov.in", subject: "Your code", text: "Code 246810", html: "<p>246810</p>" },
      config,
      { connect: async () => socket },
    );

    assert.equal(result.delivered, true);
    const transcript = sent.join("");
    assert.match(transcript, /EHLO pragyan\.local/);
    assert.match(transcript, /AUTH LOGIN/);
    assert.match(transcript, /dGVzdHVzZXI=/); // base64("testuser")
    assert.match(transcript, /c2VjcmV0cGFzcw==/); // base64("secretpass")
    assert.match(transcript, /MAIL FROM:<no-reply@pragyan\.gov\.in>/);
    assert.match(transcript, /RCPT TO:<a@b\.gov\.in>/);
    assert.match(transcript, /QUIT/);
    assert.match(dataLines.join(""), /246810/);
    assert.match(dataLines.join(""), /multipart\/alternative/);
  });

  it("upgrades with STARTTLS before authenticating on port 587", async () => {
    const plain: string[] = [];
    const secure: string[] = [];
    const plainSocket = scriptedSocket(
      { EHLO: "250-smtp.test\r\n250 STARTTLS\r\n", STARTTLS: "220 Ready for TLS\r\n" },
      plain,
      [],
    );
    const secureSocket = scriptedSocket(baseScript, secure, []);
    queueMicrotask(() => plainSocket.push("220 smtp.test ESMTP ready\r\n"));

    const config: MailConfig = {
      ...getMailConfig({}),
      provider: "smtp",
      smtp: { host: "smtp.test", port: 587, secure: false, user: "testuser", pass: "secretpass" },
    };
    const result = await sendViaSmtp(
      { to: "a@b.gov.in", subject: "Your code", text: "Code 135790" },
      config,
      { connect: async () => plainSocket, upgrade: async () => secureSocket },
    );

    assert.equal(result.delivered, true);
    assert.match(plain.join(""), /STARTTLS/);
    assert.equal(plain.join("").includes("AUTH"), false);
    assert.match(secure.join(""), /AUTH LOGIN/);
  });

  it("fails the send when the server rejects the greeting", async () => {
    const sent: string[] = [];
    const socket = scriptedSocket({}, sent, []);
    queueMicrotask(() => socket.push("554 Service unavailable\r\n"));
    const config: MailConfig = {
      ...getMailConfig({}),
      provider: "smtp",
      smtp: { host: "smtp.test", port: 465, secure: true, user: "u", pass: "p" },
    };
    const result = await sendMail(
      { to: "a@b.gov.in", subject: "s", text: "t" },
      config,
      { connect: async () => socket },
    );
    assert.equal(result.delivered, false);
    assert.match(result.detail, /greeting/);
  });
});
