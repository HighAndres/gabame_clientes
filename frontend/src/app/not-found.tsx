import Link from "next/link";

import { Logo } from "@/components/marca/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="container flex h-[72px] items-center">
        <Logo />
      </header>
      <main id="contenido" className="container flex flex-1 flex-col items-start justify-center gap-4 pb-24">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Error 404</p>
        <h1 className="text-3xl font-bold">Esta pagina no existe</h1>
        <p className="max-w-md text-muted-foreground">
          El enlace puede estar incompleto o el contenido ya no esta disponible.
        </p>
        <Link href="/dashboard" className={cn(buttonVariants())}>
          Ir al inicio
        </Link>
      </main>
    </div>
  );
}
