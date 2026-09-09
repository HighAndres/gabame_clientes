"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/** Enlace de navegacion tipo pildora con `aria-current="page"` (WCAG 2.4.8). */
export function NavLink({
  href,
  children,
  exacto = false,
  className,
}: {
  href: string;
  children: React.ReactNode;
  exacto?: boolean;
  className?: string;
}) {
  const pathname = usePathname();
  const activo = exacto ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={activo ? "page" : undefined}
      className={cn(
        "inline-flex h-9 items-center rounded-md px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        activo ? "bg-primary-soft font-bold text-primary-soft-foreground" : "text-heading hover:bg-background",
        className,
      )}
    >
      {children}
    </Link>
  );
}
