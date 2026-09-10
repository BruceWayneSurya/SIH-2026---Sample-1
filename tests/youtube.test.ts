import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeYouTubeUrl,
  parseYouTubeId,
} from "../src/lib/youtube";

// Faculty bulk-upload an Excel sheet of YouTube links, copied in whatever
// shape the uploader happened to use. The importer and the player both rely
// on these helpers canonicalizing every common shape — and on refusing
// everything else.

const ID = "dQw4w9WgXcQ";

describe("youtube link parsing", () => {
  it("reads every common URL shape", () => {
    const shapes = [
      `https://www.youtube.com/watch?v=${ID}`,
      `https://youtube.com/watch?v=${ID}&t=30s`,
      `https://m.youtube.com/watch?v=${ID}`,
      `https://youtu.be/${ID}?si=abc`,
      `https://www.youtube.com/shorts/${ID}`,
      `https://www.youtube.com/embed/${ID}`,
      `https://www.youtube.com/live/${ID}`,
      `https://www.youtube-nocookie.com/embed/${ID}`,
      `www.youtube.com/watch?v=${ID}`,
      ID,
    ];
    for (const shape of shapes) assert.equal(parseYouTubeId(shape), ID, shape);
  });

  it("canonicalizes to a stable watch URL and a privacy embed", () => {
    const link = normalizeYouTubeUrl(`https://youtu.be/${ID}`);
    assert.equal(link?.watchUrl, `https://www.youtube.com/watch?v=${ID}`);
    assert.equal(link?.embedUrl, `https://www.youtube-nocookie.com/embed/${ID}`);
  });

  it("rejects non-YouTube links, malformed ids and junk", () => {
    for (const junk of [
      "",
      "   ",
      "not a url",
      "https://vimeo.com/123456789",
      "https://drive.google.com/file/d/abc/view",
      "https://youtube.com/watch?v=short",
      "https://youtube.com/playlist?list=PLxyz",
      "https://youtube.com/",
    ])
      assert.equal(parseYouTubeId(junk), null, junk);
  });
});
