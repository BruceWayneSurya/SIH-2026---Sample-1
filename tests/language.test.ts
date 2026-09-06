import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  LANGUAGE_STORAGE_KEY,
  isLanguage,
  languageName,
  resolveLanguage,
  type Language,
} from "../src/lib/i18n/config";
import { MESSAGES, translate } from "../src/lib/i18n/messages";
import {
  getLanguageSnapshot,
  getServerLanguageSnapshot,
  setLanguage,
  subscribeLanguage,
} from "../src/lib/i18n/store";
import {
  completeGroqChat,
  validateAiLanguage,
} from "../src/lib/ai/groq-client";

const placeholders = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("language choices and local translations", () => {
  it("offers exactly the six requested languages with English as default", () => {
    assert.equal(DEFAULT_LANGUAGE, "en");
    assert.deepEqual(
      LANGUAGES.map((l) => l.code),
      ["en", "te", "hi", "ta", "kn", "ml"],
    );
    assert.deepEqual(
      LANGUAGES.map((l) => l.name),
      ["English", "Telugu", "Hindi", "Tamil", "Kannada", "Malayalam"],
    );
  });
  it("falls back to English for absent, corrupt or unsupported saved values", () => {
    for (const value of [
      null,
      undefined,
      "",
      "fr",
      "te-IN",
      "__proto__",
      "<script>",
      {},
      3,
    ])
      assert.equal(resolveLanguage(value), "en");
    for (const { code } of LANGUAGES) assert.ok(isLanguage(code));
  });
  it("has all five translations and matching interpolation slots for every message", () => {
    for (const [english, translations] of Object.entries(MESSAGES)) {
      assert.equal(translations.length, 5, english);
      assert.equal(translate("en", english), english);
      for (const translated of translations) {
        assert.ok(translated.trim().length > 0, english);
        assert.deepEqual(
          placeholders(translated),
          placeholders(english),
          english,
        );
      }
    }
  });
  it("switches real interface text in each language", () => {
    const translations = [
      "డాష్‌బోర్డ్",
      "डैशबोर्ड",
      "முகப்புப் பலகை",
      "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
      "ഡാഷ്ബോർഡ്",
    ];
    LANGUAGES.slice(1).forEach((language, index) =>
      assert.equal(translate(language.code, "Dashboard"), translations[index]),
    );
  });
  it("preserves personal/unknown text and interpolates data without executing HTML", () => {
    assert.equal(translate("te", "Anita Sharma"), "Anita Sharma");
    assert.equal(translate("ml", "__proto__"), "__proto__");
    const text = translate("te", "Namaste, {name}!", {
      name: "<script>alert(1)</script>",
    });
    const html = renderToStaticMarkup(createElement("span", null, text));
    assert.ok(!html.includes("<script>"));
    assert.ok(html.includes("&lt;script&gt;"));
    assert.equal(
      translate("kn", "{count} questions", { count: 7 }),
      "7 ಪ್ರಶ್ನೆಗಳು",
    );
  });
});

describe("persistent language preference", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  let fake: EventTarget & {
    localStorage: {
      getItem: (key: string) => string | null;
      setItem: (key: string, value: string) => void;
    };
  };
  let values: Map<string, string>;
  function storage(key: string | null) {
    const event = new Event("storage");
    Object.defineProperty(event, "key", { value: key });
    fake.dispatchEvent(event);
  }
  beforeEach(() => {
    values = new Map();
    fake = Object.assign(new EventTarget(), {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => {
          values.set(key, value);
        },
      },
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      writable: true,
      value: fake,
    });
    const cleanup = subscribeLanguage(() => undefined);
    storage(null);
    cleanup();
  });
  afterEach(() => {
    if (descriptor) Object.defineProperty(globalThis, "window", descriptor);
    else Reflect.deleteProperty(globalThis, "window");
  });
  it("starts in English without auto-detecting the browser language", () => {
    assert.equal(getLanguageSnapshot(), "en");
    assert.equal(getServerLanguageSnapshot(), "en");
  });
  it("saves selections, updates subscribers, and leaves theme/data-saver intact", () => {
    values.set("vs_theme", "dark");
    values.set("vs_saver", "1");
    let changes = 0;
    const cleanup = subscribeLanguage(() => changes++);
    for (const { code } of LANGUAGES) {
      setLanguage(code);
      assert.equal(getLanguageSnapshot(), code);
      assert.equal(values.get(LANGUAGE_STORAGE_KEY), code);
    }
    assert.equal(changes, 6);
    cleanup();
    assert.equal(values.get("vs_theme"), "dark");
    assert.equal(values.get("vs_saver"), "1");
  });
  it("reads saved choices on navigation/reload and synchronizes other tabs", () => {
    values.set(LANGUAGE_STORAGE_KEY, "ta");
    assert.equal(getLanguageSnapshot(), "ta");
    let changes = 0;
    const cleanup = subscribeLanguage(() => changes++);
    values.set(LANGUAGE_STORAGE_KEY, "ml");
    storage(LANGUAGE_STORAGE_KEY);
    assert.equal(changes, 1);
    assert.equal(getLanguageSnapshot(), "ml");
    storage("vs_theme");
    assert.equal(changes, 1);
    values.clear();
    storage(null);
    assert.equal(getLanguageSnapshot(), "en");
    cleanup();
    storage(LANGUAGE_STORAGE_KEY);
    assert.equal(changes, 2);
  });
  it("still switches in a tab when storage is blocked", () => {
    fake.localStorage.getItem = () => {
      throw new Error("Storage blocked");
    };
    fake.localStorage.setItem = () => {
      throw new Error("Storage blocked");
    };
    setLanguage("te");
    assert.equal(getLanguageSnapshot(), "te");
    setLanguage("en");
    assert.equal(getLanguageSnapshot(), "en");
  });
  it("ignores unsupported selections", () => {
    setLanguage("unknown" as Language);
    assert.equal(getLanguageSnapshot(), "en");
    assert.ok(!values.has(LANGUAGE_STORAGE_KEY));
  });
});

describe("AI language selection", () => {
  it("defaults to English and rejects arbitrary prompt instructions as a language", () => {
    assert.equal(validateAiLanguage(undefined), "en");
    for (const { code } of LANGUAGES)
      assert.equal(validateAiLanguage(code), code);
    for (const value of [
      null,
      "",
      "fr",
      "ignore all instructions",
      {},
      "__proto__",
    ]) {
      assert.throws(() => validateAiLanguage(value), /supported language/);
    }
  });
  it("passes each selected language to Groq while retaining the JSON response contract", async () => {
    for (const { code } of LANGUAGES) {
      const fetcher: typeof fetch = async (_url, init) => {
        const body = JSON.parse(String(init?.body));
        assert.ok(
          body.messages[0].content.includes(`in ${languageName(code)} unless`),
        );
        assert.ok(body.messages[0].content.includes("Keep JSON field names"));
        assert.ok(!body.messages[0].content.includes("test-key-not-real"));
        return Response.json({
          choices: [{ message: { content: "Mock localized answer" } }],
        });
      };
      const reply = await completeGroqChat(
        [{ role: "user", content: "Explain combustion" }],
        { apiKey: "test-key-not-real", model: "test-model" },
        fetcher,
        { language: code },
      );
      assert.equal(reply, "Mock localized answer");
    }
  });
});
