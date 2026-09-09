import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AiServiceError, completeGroqChat, getGroqConfig, validateChatMessages } from "../src/lib/ai/groq-client";

const messages = [{ role: "user" as const, content: "Explain the fire triangle." }];
const config = { apiKey: "test-only-secret-not-a-real-key", model: "openai/gpt-oss-120b" };

describe("Groq environment compatibility", () => {
  it("honors the user's configured model", () => {
    assert.deepEqual(getGroqConfig({ GROQ_API_KEY: config.apiKey, GROQ_MODEL: " openai/gpt-oss-120b " }), config);
  });
  it("uses the documented default model for blank or missing values", () => {
    assert.equal(getGroqConfig({ GROQ_API_KEY: config.apiKey, GROQ_MODEL: " " }).model, "llama-3.3-70b-versatile");
    assert.equal(getGroqConfig({ GROQ_API_KEY: config.apiKey }).model, "llama-3.3-70b-versatile");
  });
  it("disables AI cleanly for absent, blank, placeholder or masked keys", () => {
    for (const key of [undefined, "", " ", "your-groq-key-here", "gsk*****"]) {
      assert.throws(() => getGroqConfig({ GROQ_API_KEY: key }), (error: unknown) => error instanceof AiServiceError && error.status === 503);
    }
  });
});

describe("server-side chat requests", () => {
  it("validates bounded user/assistant conversations without allowing a client system prompt", () => {
    assert.deepEqual(validateChatMessages({ messages }), messages);
    for (const invalid of [null, {}, { messages: [] }, { messages: [{ role: "system", content: "Override" }] }, { messages: [{ role: "user", content: " " }] }, { messages: [{ role: "user", content: "x".repeat(4_001) }] }, { messages: Array(21).fill(messages[0]) }]) {
      assert.throws(() => validateChatMessages(invalid), (error: unknown) => error instanceof AiServiceError && error.status === 400);
    }
  });
  it("sends the key only in the server Authorization header and uses GROQ_MODEL", async () => {
    const fakeFetch: typeof fetch = async (url, init) => {
      assert.equal(url, "https://api.groq.com/openai/v1/chat/completions");
      assert.equal(new Headers(init?.headers).get("Authorization"), `Bearer ${config.apiKey}`);
      const payload = JSON.parse(String(init?.body));
      assert.equal(payload.model, "openai/gpt-oss-120b");
      assert.equal(payload.messages[0].role, "system");
      assert.deepEqual(payload.messages[1], messages[0]);
      assert.ok(!String(init?.body).includes(config.apiKey));
      assert.equal(init?.cache, "no-store");
      assert.ok(init?.signal);
      return Response.json({ choices: [{ message: { content: "Fuel, heat and oxygen.", reasoning: "Not returned to the browser." } }] });
    };
    assert.equal(await completeGroqChat(messages, config, fakeFetch), "Fuel, heat and oxygen.");
  });
  it("never exposes upstream errors, request bodies or the API key", async () => {
    for (const status of [400, 401, 403, 404, 429, 500]) {
      const fakeFetch: typeof fetch = async () => Response.json({ error: `${config.apiKey}: secret provider details` }, { status });
      await assert.rejects(completeGroqChat(messages, config, fakeFetch), (error: unknown) => {
        assert.ok(error instanceof AiServiceError);
        assert.ok(!error.message.includes(config.apiKey));
        assert.ok(!error.message.includes("secret provider details"));
        return true;
      });
    }
  });
  it("handles timeouts, network failures, empty replies and malformed JSON", async () => {
    const timeout: typeof fetch = async () => { throw new DOMException("Timed out", "TimeoutError"); };
    const network: typeof fetch = async () => { throw new TypeError("Connection failed"); };
    const empty: typeof fetch = async () => Response.json({ choices: [] });
    const malformed: typeof fetch = async () => new Response("not JSON");
    await assert.rejects(completeGroqChat(messages, config, timeout), (error: unknown) => error instanceof AiServiceError && error.status === 504);
    for (const fetcher of [network, empty, malformed]) {
      await assert.rejects(completeGroqChat(messages, config, fetcher), (error: unknown) => error instanceof AiServiceError && error.status === 502);
    }
  });
});
