import Link from "next/link";
import { notFound } from "next/navigation";
import { DocPageView } from "@/components/ui/doc-page";
import { DOC_PAGES } from "@/content/pages";
import { getDictionary, isLocale } from "@/lib/i18n";

export default async function ForOrganisationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <>
      <DocPageView page={DOC_PAGES.organisations[locale]} />
      <div className="container-page max-w-3xl pb-10">
        <div className="flex flex-wrap gap-3">
          <Link href={`/${locale}/register`} className="button-secondary">
            {dict.common.signIn}
          </Link>
          <Link href={`/${locale}/abuse`} className="button-ghost">
            {dict.common.contact}
          </Link>
        </div>
      </div>
    </>
  );
}
