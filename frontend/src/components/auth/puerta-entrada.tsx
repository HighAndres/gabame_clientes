import Link from "next/link";
import { redirect } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { type Entrada, ENTRADAS, PARAM_EMPRESA, PARAM_TIPO } from "@/lib/entradas";
import { conservarParams } from "@/lib/origen";
import { destinoSeguro } from "@/lib/redirect";
import { leerSesion } from "@/lib/sesion";
import { cn } from "@/lib/utils";

type Params = Record<string, string | string[] | undefined>;

function lector(sp: Params) {
  return { get: (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : null) };
}

/**
 * Puerta de entrada de una audiencia (lo que enlazan los botones de los sitios del grupo).
 * Con sesion activa no se muestra nada: la persona va directo a su destino. Sin sesion ofrece
 * entrar o crear cuenta, ya con el tipo elegido, y conserva origen, campana y redirect.
 */
export async function PuertaEntrada({ entrada, searchParams }: { entrada: Entrada; searchParams: Params }) {
  const def = ENTRADAS[entrada];
  const params = lector(searchParams);
  if (await leerSesion()) redirect(destinoSeguro(params.get("redirect") ?? def.destino));

  const extra: Record<string, string> = { [PARAM_TIPO]: def.tipo };
  const empresa = params.get(PARAM_EMPRESA);
  if (entrada === "empresas" && empresa) extra[PARAM_EMPRESA] = empresa;
  const q = conservarParams(params, extra);

  return (
    <section className="flex flex-col gap-6 rounded-lg border bg-card p-7 md:p-9">
      <div className="flex flex-col gap-2">
        <h1 className="text-[26px] font-bold">{def.titulo}</h1>
        <p className="text-[15px] leading-relaxed text-muted-foreground">{def.descripcion}</p>
      </div>
      <div className="flex flex-col gap-3">
        <Link href={`/login${q}`} className={cn(buttonVariants({ size: "lg" }), "w-full")}>
          {def.entrar}
        </Link>
        <Link href={`/registro${q}`} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}>
          {def.crear}
        </Link>
      </div>
      {entrada === "medicos" && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          La cédula profesional se usa solo para validar tu perfil y no se muestra públicamente.
        </p>
      )}
      {entrada === "empresas" && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          ¿Eres paciente o consumidor?{" "}
          <Link href={`/clientes${conservarParams(params)}`} className="text-primary hover:text-primary-hover">
            Entra por el portal de clientes
          </Link>
          .
        </p>
      )}
    </section>
  );
}
