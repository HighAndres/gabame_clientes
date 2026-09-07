"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/** Enlace de navegacion con `aria-current="page"` (WCAG 2.4.8) y estilo activo. */
export function NavLink({ href, children, exacto = false }: { href: string; children: React.ReactNode; exacto?: boolean }) {
  const pathname = usePathname();
  const activo = exacto ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={activo ? "page" : undefined}
      className={cn(
        "rounded-sm px-1 py-0.5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        activo ? "font-medium text-foreground" : "text-muted-foreground",
      )}
    >
      {children}
    </Link>
  );
}
