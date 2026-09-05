import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-cream px-6 py-16 text-center">
      <span className="text-5xl" aria-hidden="true">
        🍔❓
      </span>
      <h1 className="font-display text-xl font-bold text-char">We couldn&rsquo;t find that burger</h1>
      <p className="max-w-sm text-sm text-char/60">
        The page or restaurant you&rsquo;re looking for doesn&rsquo;t exist, or may have been removed from the list.
      </p>
      <Link href="/dashboard" className="rounded-full bg-flame-500 px-5 py-2.5 text-sm font-bold text-white shadow-md">
        Back to dashboard
      </Link>
    </div>
  );
}
