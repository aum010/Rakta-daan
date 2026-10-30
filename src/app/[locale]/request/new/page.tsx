import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoRequestWizard, type RequestPrefill } from "@/components/demo/demo-request-wizard";
import { PageHeader } from "@/components/ui/ui";
import { BLOOD_COMPONENTS, URGENCY_VALUES, isBloodGroup } from "@/lib/blood";
import { DISTRICTS } from "@/data/geography";
import { getDictionary, isLocale } from "@/lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    title: `${dict.requestDemo.title} — ${dict.common.appName}`,
    description: dict.requestDemo.subtitle,
    robots: { index: false, follow: false },
  };
}

/**
 * Reads the requirement the emergency search panel collected on the home page
 * so the requester never types the same details twice. Every value is validated
 * against the same lists the form itself uses — a hand-edited URL cannot put
 * the wizard into a state the UI could not produce.
 */
function prefillFrom(query: {
  group?: string;
  component?: string;
  units?: string;
  urgency?: string;
  district?: string;
  hospital?: string;
}): RequestPrefill {
  const prefill: RequestPrefill = {};

  if (query.group && isBloodGroup(query.group)) prefill.bloodGroup = query.group;

  const component = query.component as (typeof BLOOD_COMPONENTS)[number] | undefined;
  if (component && BLOOD_COMPONENTS.includes(component)) prefill.component = component;

  const urgency = query.urgency as (typeof URGENCY_VALUES)[number] | undefined;
  if (urgency && URGENCY_VALUES.includes(urgency)) prefill.urgency = urgency;
  if (query.units) {
    const units = Number(query.units);
    if (Number.isInteger(units) && units >= 1 && units <= 20) prefill.units = String(units);
  }
  if (query.district) {
    const district = DISTRICTS.find((item) => item.code === query.district);
    if (district) {
      prefill.district = district.code;
      prefill.province = district.provinceCode;
    }
  }
  if (query.hospital?.trim()) prefill.hospital = query.hospital.trim();

  return prefill;
}

export default async function NewDemoRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    group?: string;
    component?: string;
    units?: string;
    urgency?: string;
    district?: string;
    hospital?: string;
  }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const base = `/${locale}`;
  const prefill = prefillFrom(await searchParams);

  return (
    <div className="container-page max-w-3xl py-8">
      <PageHeader
        eyebrow={dict.requestDemo.eyebrow}
        title={dict.requestDemo.title}
        subtitle={dict.requestDemo.subtitle}
        breadcrumbs={[
          { href: base, label: dict.common.appName },
          { href: `${base}/find`, label: dict.nav.findBlood },
          { href: `${base}/request/new`, label: dict.nav.requestBlood },
        ]}
        actions={
          <Link className="button-secondary" href={`${base}/request/status`}>
            {dict.requestDemo.status.lookupTitle}
          </Link>
        }
      />
      <div className="mt-5">
        <DemoRequestWizard locale={locale} dict={dict} prefill={prefill} />
      </div>
    </div>
  );
}
