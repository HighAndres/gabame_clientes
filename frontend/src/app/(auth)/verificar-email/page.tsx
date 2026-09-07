import { VerificarEmail } from "@/components/auth/verificar-email";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function VerificarEmailPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const token = typeof searchParams.token === "string" ? searchParams.token : null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Verifica tu correo</CardTitle>
        <CardDescription>Confirmamos que este correo es tuyo.</CardDescription>
      </CardHeader>
      <CardContent>
        <VerificarEmail token={token} />
      </CardContent>
    </Card>
  );
}
