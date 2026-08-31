import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_COVER,
  displayCoverUrl,
  extractPreviewImage,
  extractPreviewImages,
  isDefaultCover,
  isSiteMarkUrl,
  siteMarkUrl,
} from "./cover.ts";

test("isDefaultCover treats platform fallback photos as default", () => {
  assert.equal(isDefaultCover("/covers/hushcity.jpg"), true);
  assert.equal(isDefaultCover("https://idea-platform-delta.vercel.app/covers/hushcity.jpg"), true);
  assert.equal(isDefaultCover("https://mood.z-agent.ccwu.cc/og-image.jpg"), false);
});

test("siteMarkUrl uses the site hostname", () => {
  assert.equal(
    siteMarkUrl("https://mood.z-agent.ccwu.cc/admin"),
    "https://www.google.com/s2/favicons?sz=128&domain=mood.z-agent.ccwu.cc",
  );
});

test("displayCoverUrl keeps unique covers and falls back to a site mark", () => {
  assert.equal(
    displayCoverUrl("https://mood.z-agent.ccwu.cc/og-image.jpg", "https://mood.z-agent.ccwu.cc/"),
    "https://mood.z-agent.ccwu.cc/og-image.jpg",
  );
  assert.equal(
    displayCoverUrl(DEFAULT_COVER, "https://mood.z-agent.ccwu.cc/"),
    siteMarkUrl("https://mood.z-agent.ccwu.cc/"),
  );
});

test("isSiteMarkUrl detects favicons and icon services", () => {
  assert.equal(isSiteMarkUrl("https://mood.z-agent.ccwu.cc/favicon.svg"), true);
  assert.equal(isSiteMarkUrl("https://idea-platform.z-agent.ccwu.cc/icon.svg"), true);
  assert.equal(isSiteMarkUrl(siteMarkUrl("https://mood.z-agent.ccwu.cc/")!), true);
  assert.equal(isSiteMarkUrl("https://mood.z-agent.ccwu.cc/og-image.jpg"), false);
});

test("extractPreviewImage prefers og:image and resolves relative URLs", () => {
  const html = `<html><head>
    <meta name="twitter:image" content="https://cdn.example.com/twitter.jpg">
    <meta content="/images/preview.jpg" property="og:image">
  </head></html>`;
  const preview = extractPreviewImage(html, "https://example.com/projects/demo");
  assert.equal(preview?.imageUrl, "https://example.com/images/preview.jpg");
  assert.equal(preview?.source, "open_graph");
});

test("extractPreviewImage skips the platform default cover and uses the site icon", () => {
  const html = `<html><head>
    <meta property="og:image" content="https://idea.example.com/covers/hushcity.jpg">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  </head></html>`;
  const previews = extractPreviewImages(html, "https://mood.example.com/");
  assert.equal(previews[0]?.imageUrl, "https://mood.example.com/apple-touch-icon.png");
  assert.equal(previews[0]?.source, "apple_touch_icon");
  assert.equal(previews[1]?.imageUrl, "https://mood.example.com/favicon.svg");
});
