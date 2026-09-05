import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { MapPinned, Star, Sparkles, ListChecks } from "lucide-react";

const FEATURES = [
  {
    Icon: ListChecks,
    title: "Work through the rankings",
    description: "Browse the official Marin Burger Club list and see exactly which spots you still need to hit.",
  },
  {
    Icon: Star,
    title: "Rate them your way",
    description: "Score Patty, Bun, Accoutrements and more — the same categories MBC uses — and jot down notes.",
  },
  {
    Icon: Sparkles,
    title: "Discover what's next",
    description: "Get a personalized recommendation, explained in plain English, based on your own taste.",
  },
  {
    Icon: MapPinned,
    title: "Track your quest",
    description: "See your progress, your favorites, and how your taste compares to the official rankings.",
  },
];

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-1 flex-col bg-gradient-to-b from-flame-50 via-cream to-cream">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center px-6 py-16 text-center">
        <span className="text-6xl" aria-hidden="true">
          🍔
        </span>
        <h1 className="mt-4 font-display text-4xl font-black tracking-tight text-char sm:text-5xl">
          BurgerNom
        </h1>
        <p className="mt-3 max-w-md text-lg font-medium text-char/70">
          Your personal Marin burger quest.
        </p>

        <div className="mt-8">
          <GoogleSignInButton redirectTo="/dashboard" />
        </div>

        <p className="mt-3 text-xs text-char/45">
          Free to use. We only ask for your name and email via Google.
        </p>

        <div className="mt-16 grid w-full grid-cols-1 gap-4 text-left sm:grid-cols-2">
          {FEATURES.map(({ Icon, title, description }) => (
            <div key={title} className="rounded-2xl bg-white/70 p-5 ring-1 ring-black/5">
              <Icon className="text-flame-500" size={22} />
              <p className="mt-3 font-display text-base font-semibold text-char">{title}</p>
              <p className="mt-1 text-sm text-char/60">{description}</p>
            </div>
          ))}
        </div>

        <p className="mt-14 text-xs text-char/40">
          Rankings sourced from the{" "}
          <a
            href="https://mbccom.weebly.com/rankings.html"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-char/60"
          >
            Marin Burger Club
          </a>
          . BurgerNom is an independent companion app, not affiliated with MBC.
        </p>
        <Link href="/login" className="mt-4 text-xs font-semibold text-flame-600 underline underline-offset-2">
          Already have an account? Sign in
        </Link>
      </div>
    </div>
  );
}
