import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PACK_FORMAT,
  PACK_VERSION,
  SyncError,
  packFileName,
  packSizeKb,
  scoreAnswers,
  validateSyncPayload,
} from "../src/lib/offline/pack";

/**
 * The offline promise has two halves that must not drift: what the device sends
 * (options, never marks) and how the server reads it (re-score, credit once).
 */

describe("offline sync payload", () => {
  const valid = {
    clientId: "off-abc-123456",
    chapterId: 179,
    answers: [1, -1, 3, 0],
    durationSec: 600,
    completedAt: "2026-09-10T06:00:00.000Z",
    packVersion: PACK_VERSION,
  };

  it("accepts an attempt of chosen options, including unanswered slots", () => {
    const payload = validateSyncPayload({ attempts: [valid] });
    assert.equal(payload.attempts.length, 1);
    assert.deepEqual(payload.attempts[0].answers, [1, -1, 3, 0]);
    assert.equal(payload.attempts[0].chapterId, 179);
  });

  it("accepts an empty queue so the client can call sync on reconnect", () => {
    assert.deepEqual(validateSyncPayload({ attempts: [] }), { attempts: [] });
  });

  it("ignores any device-sent score, because the server recomputes it", () => {
    const payload = validateSyncPayload({ attempts: [{ ...valid, score: 20, xpEarned: 200 }] });
    assert.equal("score" in payload.attempts[0], false);
    assert.equal("xpEarned" in payload.attempts[0], false);
  });

  it("rejects malformed attempts with a message a client can show", () => {
    assert.throws(() => validateSyncPayload({ attempts: [{ ...valid, clientId: "x" }] }), SyncError);
    assert.throws(() => validateSyncPayload({ attempts: [{ ...valid, chapterId: 0 }] }), SyncError);
    assert.throws(() => validateSyncPayload({ attempts: [{ ...valid, answers: [4] }] }), SyncError);
    assert.throws(
      () => validateSyncPayload({ attempts: Array.from({ length: 26 }, () => valid) }),
      SyncError,
      "a single sync is capped so one device cannot flood the ledger",
    );
  });

  it("scores options against the key and ignores unanswered slots", () => {
    const key = [{ correctIndex: 1 }, { correctIndex: 3 }, { correctIndex: 0 }, { correctIndex: 2 }];
    assert.deepEqual(scoreAnswers([1, -1, 0, 2], key), { score: 3, total: 4 });
    assert.deepEqual(scoreAnswers([], key), { score: 0, total: 4 });
  });
});

describe("pack identity", () => {
  it("names the file after the chapter and the pack version", () => {
    assert.equal(packFileName(179), `pragyan-pack-179-v${PACK_VERSION}.json`);
    assert.equal(PACK_FORMAT, "pragyan.chapter-pack");
  });

  it("reports a size a learner can judge before downloading", () => {
    const size = packSizeKb({ chapterId: 1, questions: new Array(20).fill("x".repeat(200)) });
    assert.ok(size >= 3 && size < 50, `unexpected pack size ${size} KB`);
  });
});
