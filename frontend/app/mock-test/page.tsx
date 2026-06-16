import { redirect } from "next/navigation";

type MockTestPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MockTestPage({ searchParams }: MockTestPageProps) {
  const params = await searchParams;
  const lang = Array.isArray(params?.lang) ? params?.lang[0] : params?.lang;
  const query = lang ? `?lang=${encodeURIComponent(lang)}` : "";

  redirect(`/sat-test${query}`);
}
