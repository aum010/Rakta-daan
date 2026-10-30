import { notFound } from "next/navigation";
import { AbuseReportForm } from "@/components/feedback/abuse-report-form";
import { Callout, PageHeader } from "@/components/ui/ui";
import { getDictionary, isLocale } from "@/lib/i18n";

export default async function AbusePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ request?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const { request } = await searchParams;

  return (
    <div className="container-page max-w-2xl py-8">
      <PageHeader title={dict.abuse.title} subtitle={dict.abuse.subtitle} />
      <div className="card mt-5 p-5">
        <AbuseReportForm dict={dict} defaultRequestId={request ?? ""} />
      </div>
      <div className="mt-4">
        <Callout tone="warning">{dict.abuse.note}</Callout>
      </div>
    </div>
  );
}
