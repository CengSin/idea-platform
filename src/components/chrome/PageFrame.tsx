export function PageFrame({
  breadcrumb,
  children,
}: {
  breadcrumb?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="notebook-page h-full overflow-auto scroll-thin">
      <div className="notebook-page-content mx-auto max-w-[1280px] px-4 py-6 pb-16 sm:px-8">
        {breadcrumb ? (
          <div className="mb-5 text-[13px] text-muted">{breadcrumb}</div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
