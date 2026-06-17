import { redirect } from "next/navigation";

export default function DiagnosticRedirectPage({
  searchParams,
}: {
  searchParams?: Promise<{ lang?: string }>;
}) {
  redirect("/mock-test/diagnostic");
}
