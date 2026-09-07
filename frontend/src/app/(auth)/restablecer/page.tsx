import { RestablecerForm } from "@/components/auth/restablecer-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RestablecerPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const token = typeof searchParams.token === "string" ? searchParams.token : null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Nueva contrasena</CardTitle>
        <CardDescription>Elige una contrasena nueva para tu Cuenta GABAME.</CardDescription>
      </CardHeader>
      <CardContent>
        <RestablecerForm token={token} />
      </CardContent>
    </Card>
  );
}
