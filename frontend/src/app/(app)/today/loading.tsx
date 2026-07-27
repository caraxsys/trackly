export default function TodayLoading() {
  return (
    <div aria-label="Loading Today dashboard" aria-live="polite" role="status">
      <span className="sr-only">Loading Today dashboard</span>
      <div className="animate-pulse space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="bg-muted h-9 w-64 max-w-[70vw] rounded-md" />
            <div className="bg-muted h-5 w-44 rounded-md" />
          </div>
          <div className="bg-muted h-10 w-24 rounded-md" />
        </div>
        <div className="border-border bg-surface h-44 rounded-xl border p-6">
          <div className="bg-muted h-4 w-28 rounded" />
          <div className="bg-muted mt-4 h-10 w-48 rounded" />
          <div className="bg-muted mt-6 h-2.5 w-full rounded-full" />
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <SkeletonPanel rows={3} />
          <SkeletonPanel rows={4} />
        </div>
        <SkeletonPanel rows={2} />
      </div>
    </div>
  );
}

function SkeletonPanel({ rows }: { rows: number }) {
  return (
    <div className="border-border bg-surface rounded-xl border p-6">
      <div className="bg-muted h-6 w-36 rounded" />
      <div className="bg-muted mt-2 h-4 w-52 max-w-full rounded" />
      <div className="mt-6 space-y-4">
        {Array.from({ length: rows }, (_, index) => (
          <div className="flex gap-3" key={index}>
            <div className="bg-muted size-5 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="bg-muted h-4 w-2/3 rounded" />
              <div className="bg-muted h-3 w-1/3 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
