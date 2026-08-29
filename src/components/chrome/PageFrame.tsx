export function PageFrame({
  breadcrumb,
  children,
}: {
  breadcrumb?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="h-full overflow-auto scroll-thin">
      <div className="mx-auto max-w-[1280px] px-8 py-6 pb-16">
        {breadcrumb ? (
          <div className="mb-5 text-[13px] text-muted">{breadcrumb}</div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
