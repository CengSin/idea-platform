"use client";

export default function PageError({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="relative z-10 mx-auto max-w-lg px-5 py-24 text-center">
      <h2 className="text-2xl font-semibold">页面暂时没能加载</h2>
      <p className="mt-3 text-sm leading-7 text-muted">可能是数据库或 GitHub 暂时不可用，请稍后重试。</p>
      <div className="mt-6 flex justify-center gap-3 text-[13px]">
        <button onClick={reset} className="rounded-xl bg-artifact px-4 py-2 text-white">重新加载</button>
        <a href="/" className="rounded-xl border border-line-strong px-4 py-2">回到首页</a>
      </div>
    </div>
  );
}
