import { Logo } from "@/components/marca/logo";

/** Marco comun de las pantallas de auth. Marca del grupo: nada de paletas de empresa. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="container flex h-[72px] items-center">
        <Logo />
      </header>
      <main id="contenido" className="container flex flex-1 items-start justify-center py-8 md:py-14">
        <div className="w-full max-w-[440px]">{children}</div>
      </main>
      <footer className="container flex items-center justify-between py-6 text-xs text-muted-foreground">
        <span>GABAME Human Health</span>
        <a href="https://gabame.com" className="text-primary hover:text-primary-hover">
          Aviso de privacidad
        </a>
      </footer>
    </div>
  );
}
