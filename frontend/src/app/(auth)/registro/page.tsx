import { RegistroForm } from "@/components/auth/registro-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { conservarParams, leerOrigen } from "@/lib/origen";
import { destinoSeguro } from "@/lib/redirect";

type Params = Record<string, string | string[] | undefined>;

function lector(sp: Params) {
  return { get: (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : null) };
}

export default function RegistroPage({ searchParams }: { searchParams: Params }) {
  const params = lector(searchParams);
  // Bifurcacion de onboarding: el tipo de cuenta decide realm y flujo (ADR-0001).
  return (
    <Card>
      <CardHeader>
        <CardTitle>Crear cuenta</CardTitle>
        <CardDescription>Elige como te relacionas con el grupo GABAME.</CardDescription>
      </CardHeader>
      <CardContent>
        <RegistroForm
          origen={leerOrigen(params)}
          destino={destinoSeguro(params.get("redirect"))}
          enlaceLogin={`/login${conservarParams(params)}`}
        />
      </CardContent>
    </Card>
  );
}
