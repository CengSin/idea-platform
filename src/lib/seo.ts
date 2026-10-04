import type { Metadata } from "next";

// 子页面一旦声明 openGraph / twitter，会整体覆盖根布局的同名字段，所以每页都用这个 helper 补齐公共字段。
// 子页面声明 openGraph 后，Next 不会再自动带上 app/opengraph-image.tsx，所以这里显式引用同一张图。
const SHARE_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: "Idea Platform" };
export function pageSocialMetadata({ title, description, url }: { title: string; description?: string; url: string }): Metadata {
  return {
    alternates: { canonical: url },
    openGraph: { type: "website", locale: "zh_CN", siteName: "Idea Platform", title, description, url, images: [SHARE_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [SHARE_IMAGE.url] },
  };
}
