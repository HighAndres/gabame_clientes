import { PieLegal } from "@/components/legal/pie-legal";
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
      <PieLegal />
    </div>
  );
}
