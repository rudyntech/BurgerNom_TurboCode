"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("BurgerNom error boundary:", error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-cream px-6 py-16 text-center">
      <span className="text-5xl" aria-hidden="true">
        🍔💥
      </span>
      <h1 className="font-display text-xl font-bold text-char">Something burnt on the grill</h1>
      <p className="max-w-sm text-sm text-char/60">
        An unexpected error occurred. You can try again, or head back to the dashboard.
      </p>
      <button
        onClick={reset}
        className="rounded-full bg-flame-500 px-5 py-2.5 text-sm font-bold text-white shadow-md"
      >
        Try again
      </button>
    </div>
  );
}
