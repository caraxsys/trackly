'use client';

export default function PreferencesError({ reset }: { reset: () => void }) {
  return (
    <section
      className="border-border bg-surface rounded-xl border p-8 text-center"
      role="alert"
    >
      <h1 className="text-xl font-semibold">Preferences are unavailable</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Trackly could not load your preferences.
      </p>
      <button
        className="border-border focus-visible:ring-ring mt-4 rounded-lg border px-4 py-2 outline-none focus-visible:ring-2"
        onClick={reset}
        type="button"
      >
        Try again
      </button>
    </section>
  );
}
