import { ArrowRight, Briefcase, type LucideIcon, Stethoscope, User } from "lucide-react";
import Link from "next/link";

import { ModalLegal } from "@/components/legal/modal-legal";
import { Logo } from "@/components/marca/logo";
import { buttonVariants } from "@/components/ui/button";
import { type Entrada, ENTRADAS } from "@/lib/entradas";
import { cn } from "@/lib/utils";

/**
 * Portada: un conmutador, no una pagina de venta. Quien llega aqui es quien no sabe por donde
 * entrar; el trafico que ya sabe llega por las puertas directas desde los sitios del grupo
 * (docs/puntos-de-entrada.md).
 *
 * Las tres puertas viven en UN solo lugar y con el mismo peso. El encabezado solo ofrece iniciar
 * sesion: crear cuenta sin elegir perfil llevaria al selector generico, que es peor camino que
 * cualquiera de las tres puertas, porque vuelve a preguntar lo que la tarjeta ya resolvio.
 */
const PUERTAS: { entrada: Entrada; icono: LucideIcon }[] = [
  { entrada: "clientes", icono: User },
  { entrada: "medicos", icono: Stethoscope },
  { entrada: "empresas", icono: Briefcase },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b">
        <div className="container flex h-[72px] items-center justify-between">
          <Logo />
          <nav aria-label="Acceso">
            <Link href="/login" className={cn(buttonVariants({ variant: "outline" }))}>
              Iniciar sesión
            </Link>
          </nav>
        </div>
      </header>

      <main id="contenido" className="container flex flex-1 flex-col justify-center gap-10 py-16 md:gap-14 md:py-20">
        <div className="aparece flex max-w-2xl flex-col gap-5">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Cuenta GABAME</p>
          <h1 className="text-4xl font-bold leading-[1.08] md:text-5xl">
            Portal de clientes y profesionales de la salud
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Elige cómo te relacionas con el grupo y entra directo a lo que te corresponde.
          </p>
        </div>

        <ul className="grid gap-5 md:grid-cols-3">
          {PUERTAS.map(({ entrada, icono: Icono }, i) => {
            const e = ENTRADAS[entrada];
            return (
              <li key={entrada} className={`aparece aparece-${i + 1}`}>
                <Link
                  href={e.ruta}
                  className="tarjeta-enlace group flex h-full flex-col gap-3 rounded-xl border bg-card p-6 hover:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary-soft text-primary">
                    <Icono className="h-[22px] w-[22px]" strokeWidth={1.5} aria-hidden="true" />
                  </span>
                  <span className="text-lg font-bold text-heading">{e.boton}</span>
                  <span className="text-sm leading-relaxed text-muted-foreground">{e.resumen}</span>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-bold text-primary">
                    Entrar
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>

      <footer className="container flex flex-wrap items-center justify-between gap-3 border-t py-8 text-[13px] text-muted-foreground">
        <span>GABAME · Medinter · Ordan · A7 Pharmaceutical Distributor</span>
        <span className="flex gap-6">
          <ModalLegal documento="aviso-privacidad" />
          <ModalLegal documento="terminos" />
          <a href="https://gabame.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-hover">
            Contacto
          </a>
        </span>
      </footer>
    </div>
  );
}
