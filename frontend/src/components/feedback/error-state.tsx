import { CircleAlert } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'We could not load this page. Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center"
      role="alert"
    >
      <CircleAlert aria-hidden="true" className="text-destructive size-8" />
      <h1 className="text-foreground mt-4 text-xl font-semibold">{title}</h1>
      <p className="text-muted-foreground mt-2 max-w-md text-sm leading-6">
        {description}
      </p>
      {onRetry && (
        <button
          className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:ring-ring focus-visible:ring-offset-background mt-5 rounded-md px-4 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          type="button"
          onClick={onRetry}
        >
          Try again
        </button>
      )}
    </div>
  );
}
