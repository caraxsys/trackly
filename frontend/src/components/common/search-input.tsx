import { Search, X } from 'lucide-react';
import Link from 'next/link';

interface SearchInputProps {
  clearHref: string;
  defaultValue: string;
  hiddenValues: Record<string, string>;
  label: string;
}

export function SearchInput({
  clearHref,
  defaultValue,
  hiddenValues,
  label,
}: SearchInputProps) {
  return (
    <form action="/habits" className="flex min-w-0 flex-1 gap-2" role="search">
      {Object.entries(hiddenValues).map(([name, value]) => (
        <input key={name} name={name} type="hidden" value={value} />
      ))}
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">{label}</span>
        <Search
          aria-hidden="true"
          className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
        />
        <input
          className="border-border bg-surface text-foreground placeholder:text-muted-foreground focus-visible:ring-ring h-10 w-full rounded-md border pl-9 pr-9 text-sm outline-none focus-visible:ring-2"
          defaultValue={defaultValue}
          name="search"
          placeholder="Search habits"
          type="search"
        />
        {defaultValue && (
          <Link
            aria-label="Clear habit search"
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 outline-none focus-visible:ring-2"
            href={clearHref}
          >
            <X aria-hidden="true" className="size-4" />
          </Link>
        )}
      </label>
      <button
        className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:ring-ring rounded-md px-4 text-sm font-medium outline-none focus-visible:ring-2"
        type="submit"
      >
        Search
      </button>
    </form>
  );
}
