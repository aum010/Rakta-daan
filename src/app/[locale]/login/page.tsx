import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { OtpLoginForm } from "@/components/auth/otp-login-form";
import { getSessionUser } from "@/lib/auth";
import { getDictionary, isLocale } from "@/lib/i18n";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const user = await getSessionUser();
  const { next } = await searchParams;

  // Only allow same-site relative redirects.
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;

  if (user) redirect(safeNext ?? `/${locale}/dashboard`);

  return (
    <div className="container-page max-w-md py-10 sm:py-16">
      <OtpLoginForm locale={locale} dict={dict} next={safeNext ?? `/${locale}/dashboard`} />
    </div>
  );
}
