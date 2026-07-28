export default function PreferencesLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading preferences"
      className="space-y-4"
    >
      <div className="bg-muted h-8 w-48 animate-pulse rounded" />
      <div className="bg-muted h-80 animate-pulse rounded-xl" />
    </div>
  );
}
