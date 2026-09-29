import assert from "node:assert/strict";
import test from "node:test";
import { extractPageText } from "./cover.ts";
import { resolveWebsitePreview, validatePublicWebsiteUrl } from "./link-preview.ts";

test("website URL normalization preserves identity while removing fragments", async () => {
  assert.equal(await validatePublicWebsiteUrl("HTTPS://8.8.8.8:443/path?q=1#section"), "https://8.8.8.8/path?q=1");
  assert.equal(await validatePublicWebsiteUrl("https://8.8.8.8"), "https://8.8.8.8/");
});

test("website URL validation rejects private and credentialed destinations", async () => {
  for (const url of ["javascript:alert(1)", "http://127.0.0.1", "http://localhost", "https://user:pass@8.8.8.8", "not-a-url"]) {
    await assert.rejects(validatePublicWebsiteUrl(url));
  }
});

test("website text extraction prioritizes social metadata and tolerates missing fields", () => {
  assert.deepEqual(extractPageText('<title>Fallback</title><meta property="og:title" content="A &amp; B"><meta name="description" content="A description">'), { title: "A & B", description: "A description" });
  assert.deepEqual(extractPageText("<html></html>"), { title: "", description: "" });
});

test("website preview uses safe fetch and rejects redirect to a private host", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('<title>Live site</title><meta property="og:image" content="https://8.8.8.8/cover.png">', { status: 200, headers: { "content-type": "text/html" } });
    const preview = await resolveWebsitePreview("https://8.8.8.8/live");
    assert.equal(preview.title, "Live site");
    assert.equal(preview.imageUrl, "https://8.8.8.8/cover.png");
    globalThis.fetch = async () => new Response(null, { status: 302, headers: { location: "http://127.0.0.1/private" } });
    const rejected = await resolveWebsitePreview("https://8.8.8.8/redirect");
    assert.equal(rejected.fetched, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
