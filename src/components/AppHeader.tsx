import Link from "next/link";
import { signOut } from "@/lib/actions/auth";
import { ListOrdered, UserRound } from "lucide-react";

export function AppHeader({ displayName }: { displayName: string | null }) {
  return (
    <header className="sticky top-0 z-20 border-b border-black/5 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden="true">
            🍔
          </span>
          <span className="font-display text-lg font-bold text-char">BurgerNom</span>
        </Link>
        <nav className="hidden items-center gap-1 sm:flex">
          <Link
            href="/rankings"
            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-char/70 hover:bg-black/5"
          >
            <ListOrdered size={16} /> Rankings
          </Link>
          <Link
            href="/profile"
            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-char/70 hover:bg-black/5"
          >
            <UserRound size={16} /> Profile
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          {displayName && <span className="hidden text-sm font-medium text-char/60 sm:inline">{displayName}</span>}
          <form action={signOut}>
            <button className="rounded-full px-3 py-1.5 text-sm font-semibold text-char/60 ring-1 ring-black/10 hover:bg-black/5">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
