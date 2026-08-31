export function PageLoading() {
  return (
    <div role="status" aria-live="polite" className="relative mx-auto w-full max-w-[1280px] px-5 py-10 sm:px-8">
      <span className="sr-only">正在加载页面…</span>
      <div aria-hidden="true" className="space-y-6">
        <div className="skeleton h-4 w-24 rounded-full" />
        <div className="skeleton h-9 w-56 rounded-xl" />
        <div className="skeleton h-4 w-full max-w-sm rounded-full" />
        <div className="grid gap-4 pt-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="rounded-3xl border border-line bg-canvas-soft/60 p-5">
              <div className="skeleton mb-6 h-32 rounded-2xl" />
              <div className="skeleton mb-3 h-5 w-3/4 rounded-lg" />
              <div className="skeleton h-4 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
