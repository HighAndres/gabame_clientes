import Link from "next/link";

/** Marco comun de las pantallas de auth. Marca del grupo: nada de paletas de empresa. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="container flex h-14 items-center">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Cuenta GABAME
        </Link>
      </header>
      <main id="contenido" className="container flex flex-1 items-start justify-center py-10 md:py-16">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <footer className="container py-6 text-xs text-muted-foreground">
        GABAME Human Health. Aviso de privacidad conforme a la LFPDPPP.
      </footer>
    </div>
  );
}
