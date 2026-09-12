import { RegistroForm } from "@/components/auth/registro-form";
import { entradaPorTipo, PARAM_EMPRESA, PARAM_TIPO } from "@/lib/entradas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { conservarParams, leerOrigen } from "@/lib/origen";
import { EMPRESAS } from "@/lib/matriz-roles";
import { destinoSeguro } from "@/lib/redirect";
import type { Empresa } from "@/types/auth";

type Params = Record<string, string | string[] | undefined>;

function lector(sp: Params) {
  return { get: (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : null) };
}

export default function RegistroPage({ searchParams }: { searchParams: Params }) {
  const params = lector(searchParams);
  // Bifurcacion de onboarding: el tipo de cuenta decide realm y flujo (ADR-0001). Si la persona
  // llego por una puerta (?tipo=), el selector ya viene resuelto; puede cambiarlo.
  const puerta = entradaPorTipo(params.get(PARAM_TIPO));
  const empresaParam = params.get(PARAM_EMPRESA);
  const empresaInicial = EMPRESAS.includes(empresaParam as Empresa) ? (empresaParam as Empresa) : null;
  return (
    <Card>
      <CardHeader>
        {puerta && <p className="text-xs font-bold uppercase tracking-[0.08em] text-primary">{puerta.titulo}</p>}
        <CardTitle>Crear cuenta</CardTitle>
        <CardDescription>{puerta ? "Completa tus datos para crear tu cuenta." : "Elige como te relacionas con el grupo GABAME."}</CardDescription>
      </CardHeader>
      <CardContent>
        <RegistroForm
          origen={leerOrigen(params)}
          destino={destinoSeguro(params.get("redirect") ?? puerta?.destino)}
          enlaceLogin={`/login${conservarParams(params)}`}
          tipoInicial={puerta?.tipo ?? null}
          empresaInicial={puerta?.tipo === "empresa" ? empresaInicial : null}
        />
      </CardContent>
    </Card>
  );
}
