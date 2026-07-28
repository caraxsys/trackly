export default function AnalyticsLoading() {
  return (
    <div
      aria-label="Loading analytics dashboard"
      aria-live="polite"
      className="space-y-8"
    >
      <span className="sr-only">Loading analytics dashboard</span>
      <div className="space-y-3">
        <div className="bg-muted h-9 w-44 animate-pulse rounded-md motion-reduce:animate-none" />
        <div className="bg-muted h-5 max-w-2xl animate-pulse rounded-md motion-reduce:animate-none" />
      </div>
      <div className="border-border bg-surface h-36 animate-pulse rounded-xl border motion-reduce:animate-none" />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            className="border-border bg-surface h-40 animate-pulse rounded-xl border motion-reduce:animate-none"
            key={index}
          />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="bg-muted h-48 animate-pulse rounded-xl motion-reduce:animate-none" />
        <div className="bg-muted h-48 animate-pulse rounded-xl motion-reduce:animate-none" />
      </div>
    </div>
  );
}
