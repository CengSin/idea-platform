"use client";

export default function ExploreError({ reset }: { reset: () => void }) {
  return <div role="alert" className="py-20 text-center"><h2 className="text-2xl font-semibold">暂时没能加载公开内容</h2><p className="mt-3 text-sm text-muted">连接可能有些慢，请稍后重试。</p><button type="button" onClick={reset} className="explore-cta mt-6">重新加载</button></div>;
}
