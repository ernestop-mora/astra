"use client";

import { Archive, House, Wrench } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDemo, withDemo } from "@/lib/useDemo";

const TABS = [
  { href: "/", label: "Home", icon: House },
  { href: "/capsule", label: "Time capsule", icon: Archive },
  { href: "/workshop", label: "Workshop", icon: Wrench },
] as const;

/** Minimal top bar. Keeps ?demo=1 when moving between tabs. */
export function TopNav() {
  const pathname = usePathname();
  const demo = useDemo();
  return (
    <header className="h-14 shrink-0 border-b border-rule">
      <div className="mx-auto flex h-full w-full max-w-[1600px] items-center gap-8 px-6 lg:px-12">
        <span className="text-sm font-medium text-cream">ASTRA</span>
        <nav aria-label="Tabs">
          <ul className="flex items-center gap-1">
            {TABS.map((t) => {
              const active = pathname === t.href;
              return (
                <li key={t.href}>
                  <Link
                    href={withDemo(t.href, demo)}
                    aria-current={active ? "page" : undefined}
                    className={`flex h-9 items-center rounded-pill border px-4 text-sm outline-none transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-cyan ${
                      active ? "border-cyan-line bg-cyan-soft text-cream" : "border-transparent text-slate hover:text-cream"
                    }`}
                  >
                    <t.icon size={16} strokeWidth={1.5} aria-hidden="true" className="mr-2" />
                    {t.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
