import Link from "next/link";

import { cn } from "@/lib/utils";

/** Logotipo del grupo (public/marca/logo-gabame.svg, tomado de gabame.com). */
export function Logo({ href = "/", width = 132, className }: { href?: string; width?: number; className?: string }) {
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/marca/logo-gabame.svg" alt="GABAME" width={width} height={Math.round(width * 0.363)} className={cn("h-auto", className)} />
  );
  return href ? (
    <Link href={href} aria-label="GABAME, ir al inicio" className="inline-flex shrink-0">
      {img}
    </Link>
  ) : (
    img
  );
}
