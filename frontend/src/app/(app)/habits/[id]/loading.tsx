export default function HabitDetailLoading() {
  return (
    <div aria-label="Loading habit details" className="animate-pulse space-y-6">
      <div className="bg-muted h-5 w-32 rounded" />
      <div className="space-y-3">
        <div className="bg-muted h-10 w-72 max-w-full rounded" />
        <div className="bg-muted h-5 w-full max-w-xl rounded" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="bg-muted h-64 rounded-xl" />
        <div className="bg-muted h-64 rounded-xl" />
      </div>
    </div>
  );
}
