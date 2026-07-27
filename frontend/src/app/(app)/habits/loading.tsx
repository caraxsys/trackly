export default function HabitsLoading() {
  return (
    <div aria-label="Loading habits" className="animate-pulse space-y-8">
      <div className="space-y-3">
        <div className="bg-muted h-9 w-40 rounded" />
        <div className="bg-muted h-5 w-full max-w-xl rounded" />
      </div>
      <div className="bg-muted h-24 rounded-xl" />
      {Array.from({ length: 4 }).map((_, index) => (
        <div className="bg-muted h-36 rounded-xl" key={index} />
      ))}
    </div>
  );
}
