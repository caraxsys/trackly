import type { InputHTMLAttributes } from 'react';

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label: string;
}

export function AuthField({ error, id, label, ...props }: AuthFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium" htmlFor={id}>
        {label}
      </label>
      <input
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={Boolean(error)}
        className="border-border bg-background focus:border-primary focus:ring-ring h-11 w-full rounded-md border px-3 text-sm outline-none focus:ring-2"
        id={id}
        {...props}
      />
      {error ? (
        <p className="text-destructive text-sm" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
