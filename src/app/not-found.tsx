import Link from "@/components/ui/NavigationLink";

export default function NotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <p className="text-[14px] text-muted">这条轨道还不存在。</p>
      <Link href="/" className="text-idea">
        回到发现
      </Link>
    </div>
  );
}
