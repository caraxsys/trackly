import type { CategoryProjection } from '@/types/today';

export function CategoryBadge({
  category,
}: {
  category: CategoryProjection | null;
}) {
  if (!category) {
    return null;
  }

  return (
    <span className="bg-muted text-muted-foreground inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-0.5 text-xs">
      <span
        aria-hidden="true"
        className="bg-primary size-1.5 shrink-0 rounded-full"
        style={category.color ? { backgroundColor: category.color } : undefined}
      />
      <span className="truncate">{category.name}</span>
    </span>
  );
}
