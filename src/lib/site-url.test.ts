import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SITE_URL, resolveSiteUrl } from "./site-url.ts";

test("site url falls back to own domain when unset or malformed", () => {
  assert.equal(resolveSiteUrl(undefined), DEFAULT_SITE_URL);
  assert.equal(resolveSiteUrl(""), DEFAULT_SITE_URL);
  assert.equal(resolveSiteUrl("eyJ2IjoidjIiLCJjIjoi"), DEFAULT_SITE_URL);
  assert.equal(resolveSiteUrl("ftp://example.com"), DEFAULT_SITE_URL);
});

test("site url never points at a vercel.app host", () => {
  assert.equal(resolveSiteUrl("https://idea-platform-delta.vercel.app"), DEFAULT_SITE_URL);
});

test("site url keeps a valid custom origin", () => {
  assert.equal(resolveSiteUrl("https://idea.example.com/some/path"), "https://idea.example.com");
});
