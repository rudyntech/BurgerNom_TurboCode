"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ListOrdered, UserRound } from "lucide-react";

const TABS = [
  { href: "/dashboard", label: "Home", Icon: Home },
  { href: "/rankings", label: "Rankings", Icon: ListOrdered },
  { href: "/profile", label: "Profile", Icon: UserRound },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-black/5 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)] sm:hidden">
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {TABS.map(({ href, label, Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${
                  isActive ? "text-flame-600" : "text-char/45"
                }`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
