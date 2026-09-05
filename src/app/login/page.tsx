import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
}) {
  const { redirectTo, error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(redirectTo ?? "/dashboard");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-cream px-6 py-16 text-center">
      <span className="text-5xl" aria-hidden="true">
        🍔
      </span>
      <div>
        <h1 className="font-display text-2xl font-bold text-char">Welcome back</h1>
        <p className="mt-1 text-sm text-char/60">Sign in to continue your burger quest.</p>
      </div>
      {error && (
        <p className="max-w-sm rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}
      <GoogleSignInButton redirectTo={redirectTo ?? "/dashboard"} />
    </div>
  );
}
