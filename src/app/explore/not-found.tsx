import Link from "@/components/ui/NavigationLink";

export default function PublicNotFound() {
  return <div className="py-24 text-center"><h1 className="text-3xl font-semibold">这个想法暂未公开</h1><p className="mt-4 text-sm text-muted">它可能已被移除，或仅对受邀成员可见。</p><Link href="/explore" className="explore-cta mt-7">浏览其他公开想法</Link></div>;
}
