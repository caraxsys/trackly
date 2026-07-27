import Link from 'next/link';

export default function HabitNotFound() {
  return (
    <section className="border-border bg-surface rounded-xl border px-6 py-12 text-center">
      <h1 className="text-xl font-semibold">Habit not found</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        This habit is unavailable or does not belong to your account.
      </p>
      <Link
        className="text-primary focus-visible:ring-ring mt-4 inline-block rounded-sm font-medium hover:underline focus-visible:ring-2"
        href="/habits"
      >
        Return to habits
      </Link>
    </section>
  );
}
