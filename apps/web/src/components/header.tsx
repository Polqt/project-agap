"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RadioTower } from "lucide-react";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
  const pathname = usePathname();

  const links = [
    { to: "/", label: "Home" },
    { to: "/dashboard", label: "Dashboard" },
  ] as const;

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-2 md:px-6">
        <Link href="/" className="inline-flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-muted/40">
            <RadioTower className="h-4 w-4 text-primary" />
          </span>
          <div>
            <p className="text-sm font-semibold leading-none">Project AGAP</p>
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Command Web</p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <nav className="hidden items-center gap-1 rounded-full border border-border/70 bg-muted/30 p-1 sm:flex">
            {links.map(({ to, label }) => {
              const isActive = pathname === to || (to !== "/" && pathname?.startsWith(to + "/"));

              return (
                <Link
                  key={to}
                  href={to}
                  className={`rounded-full px-3 py-1.5 text-xs transition ${
                    isActive
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          <ModeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
