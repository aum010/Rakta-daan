import { notFound } from "next/navigation";
import { DocPageView } from "@/components/ui/doc-page";
import { DOC_PAGES } from "@/content/pages";
import { isLocale } from "@/lib/i18n";

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <DocPageView page={DOC_PAGES.about[locale]} />;
}
