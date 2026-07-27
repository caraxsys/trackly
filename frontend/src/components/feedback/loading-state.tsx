interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = 'Loading content' }: LoadingStateProps) {
  return (
    <div aria-label={label} aria-live="polite" className="space-y-6">
      <span className="sr-only">{label}</span>
      <div className="bg-muted h-9 w-48 animate-pulse rounded-md motion-reduce:animate-none" />
      <div className="bg-muted h-5 w-full max-w-xl animate-pulse rounded-md motion-reduce:animate-none" />
      <div className="bg-muted h-64 animate-pulse rounded-xl motion-reduce:animate-none" />
    </div>
  );
}
