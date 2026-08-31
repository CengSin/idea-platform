"use client";

import Link from "@/components/ui/NavigationLink";

export default function PageError({ reset }: { reset: () => void }) {
  return <div role="alert" className="relative mx-auto max-w-lg px-5 py-24 text-center"><h2 className="text-2xl font-semibold">页面暂时没能加载</h2><p className="mt-3 text-sm leading-7 text-muted">请重试，或先到公开广场看看。</p><div className="mt-6 flex justify-center gap-3"><button onClick={reset} className="explore-cta">重新加载</button><Link href="/explore" className="explore-secondary">公开广场</Link></div></div>;
}
