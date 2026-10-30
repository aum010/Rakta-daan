import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RequestForm } from "@/components/request/request-form";
import { PageHeader } from "@/components/ui/ui";
import { requireUser } from "@/lib/auth";
import { getDictionary, isLocale } from "@/lib/i18n";
import { isBloodGroup } from "@/lib/blood";
import { DISTRICTS } from "@/data/geography";
import { MAX_RADIUS_KM } from "@/lib/constants";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function NewRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ group?: string; district?: string; radius?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const user = await requireUser(locale, `/${locale}/dashboard/requests/new`);
  const query = await searchParams;

  const groupParam = query.group ?? "";
  const group = isBloodGroup(groupParam) ? groupParam : "O_POS";
  const district = DISTRICTS.some((item) => item.code === query.district)
    ? query.district!
    : "KTM";
  const radiusValue = Number(query.radius ?? 75);
  const radius =
    Number.isFinite(radiusValue) && radiusValue >= 5 && radiusValue <= MAX_RADIUS_KM
      ? Math.round(radiusValue)
      : 75;

  return (
    <div className="container-page max-w-3xl py-8">
      <PageHeader title={dict.request.newTitle} subtitle={dict.request.newSubtitle} />
      <div className="mt-5">
        <RequestForm
          locale={locale}
          dict={dict}
          defaultGroup={group}
          defaultDistrict={district}
          defaultRadius={radius}
          defaultName={user.name}
        />
      </div>
    </div>
  );
}
