import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { donors } from "@/db/schema";
import { DonorRegistrationForm } from "@/components/donor/donor-registration-form";
import { Callout, PageHeader } from "@/components/ui/ui";
import { requireUser } from "@/lib/auth";
import { getDictionary, isLocale } from "@/lib/i18n";

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const user = await requireUser(locale, `/${locale}/register`);

  const db = getDb();
  const [existing] = await db
    .select({ id: donors.id })
    .from(donors)
    .where(and(eq(donors.userId, user.id), isNull(donors.withdrawnAt)))
    .limit(1);

  return (
    <div className="container-page max-w-3xl py-8">
      <PageHeader
        title={dict.register.title}
        subtitle={dict.register.subtitle}
        actions={
          <Link className="button-secondary" href={`/${locale}/for-donors`}>
            {dict.common.readMore}
          </Link>
        }
      />

      <div className="mt-5">
        {existing ? (
          <Callout tone="info" title={dict.register.alreadyDonor}>
            <Link className="button-secondary mt-3" href={`/${locale}/donor`}>
              {dict.register.manageProfile}
            </Link>
          </Callout>
        ) : (
          <DonorRegistrationForm
            locale={locale}
            dict={dict}
            defaultName={user.name}
            phoneMasked={user.phoneMasked}
          />
        )}
      </div>
    </div>
  );
}
