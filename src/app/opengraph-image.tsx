import { ImageResponse } from "next/og";

// 站点默认分享图（PNG）。微信、X 等平台不显示 SVG，所以用 Next 的 opengraph-image 约定生成位图。
// 只用拉丁字符：ImageResponse 默认字体不含中文字形。
export const alt = "Idea Platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          background: "#faf9f6",
          backgroundImage: "radial-gradient(rgba(100,116,139,0.18) 2px, transparent 2px)",
          backgroundSize: "40px 40px",
          color: "#0f172a",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 30,
              background: "#020617",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
              <path d="M20 3v4" />
              <path d="M22 5h-4" />
            </svg>
          </div>
          <div style={{ display: "flex", fontSize: 92, fontWeight: 800, letterSpacing: -2 }}>
            <span>IDEA</span>
            <span style={{ fontWeight: 400, color: "#64748b", marginLeft: 24 }}>PLATFORM</span>
            <span style={{ color: "#f97316" }}>.</span>
          </div>
        </div>
        <div style={{ display: "flex", marginTop: 48, fontSize: 40, color: "#475569" }}>
          Share an idea. Let builders make it real.
        </div>
      </div>
    ),
    size,
  );
}
