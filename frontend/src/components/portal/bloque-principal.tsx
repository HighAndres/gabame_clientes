import { ArrowRight } from "lucide-react";
import Link from "next/link";

/**
 * El bloque ancho con el que abre el inicio: lo que esta persona viene a hacer.
 *
 * Hasta ahora cada rol veia una cuadricula de tarjetas del mismo tamano, asi que la unica seccion
 * que le importaba pesaba igual que una publicacion cualquiera. Este bloque lleva el estado y las
 * cifras dentro, para que no haya que entrar a ver si hay algo pendiente.
 */
export interface DatoBloque {
  valor: React.ReactNode;
  etiqueta: string;
  href?: string;
}

export function BloquePrincipal({
  etiqueta,
  titulo,
  descripcion,
  estado,
  datos = [],
  href,
  accion,
}: {
  etiqueta: string;
  titulo: string;
  descripcion?: string;
  estado?: React.ReactNode;
  datos?: DatoBloque[];
  href: string;
  accion: string;
}) {
  return (
    <section className="aparece flex flex-col gap-5 rounded-xl border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">{etiqueta}</p>
          <h2 className="text-[22px] font-bold text-heading">{titulo}</h2>
          {descripcion && <p className="text-[15px] leading-relaxed text-muted-foreground">{descripcion}</p>}
        </div>
        {estado}
      </div>

      {datos.length > 0 && (
        <dl className="flex flex-wrap gap-x-10 gap-y-4 border-t pt-5">
          {datos.map((d) => (
            <div key={d.etiqueta} className="flex flex-col gap-0.5">
              <dt className="order-2 text-[13px] text-muted-foreground">{d.etiqueta}</dt>
              <dd className="order-1 text-[26px] font-bold leading-tight text-heading">
                {d.href ? (
                  <Link href={d.href} className="hover:text-primary">
                    {d.valor}
                  </Link>
                ) : (
                  d.valor
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <Link
        href={href}
        className="inline-flex items-center gap-1.5 self-start text-sm font-bold text-primary hover:text-primary-hover"
      >
        {accion}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  );
}
