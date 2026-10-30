import Link from "next/link";
import { notFound } from "next/navigation";
import { Callout, PageHeader } from "@/components/ui/ui";
import { getDictionary, isLocale } from "@/lib/i18n";
import { DONOR_MAX_AGE, DONOR_MIN_AGE, DONATION_COOLDOWN_DAYS } from "@/lib/constants";

export default async function ForDonorsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  const content =
    locale === "ne"
      ? {
          intro:
            "रक्त-दानले तपाईंको फोन नम्बर कहिल्यै सार्वजनिक गर्दैन। तपाईंले सहयोग गर्न सक्ने बताएपछि मात्र, त्यो अनुरोधकर्तालाई मात्र सम्पर्क देखिन्छ।",
          points: [
            `दाता ${DONOR_MIN_AGE}–${DONOR_MAX_AGE} वर्षको हुनुपर्छ र रक्त बैंकले तोकेको स्वास्थ्य मापदण्ड पूरा गर्नुपर्छ।`,
            `रक्तदानपछि ${DONATION_COOLDOWN_DAYS} दिनसम्म सूचना पठाइँदैन।`,
            "उपलब्धता ३० दिनमा पुरानो हुन्छ; एक क्लिकमा पुष्टि गर्न सकिन्छ।",
            "SMS वा WhatsApp मध्ये कम्तीमा एक माध्यम छान्नुपर्छ।",
            "जुनसुकै बेला सूचना रोक्न वा दाता सूचीबाट हट्न सकिन्छ।",
          ],
          next: "दर्ता गर्नुअघि फोन नम्बरले साइन इन गर्नुहोस्।",
        }
      : {
          intro:
            "Rakta-Daan never publishes your phone number. A requester sees your contact only after you say you can help, and only for that request.",
          points: [
            `Donors must be ${DONOR_MIN_AGE}–${DONOR_MAX_AGE} and meet the blood bank's health criteria on the day.`,
            `Alerts pause automatically for ${DONATION_COOLDOWN_DAYS} days after a donation.`,
            "Availability expires after 30 days so requesters are not misled; confirming takes one tap.",
            "Choose at least one channel: SMS or WhatsApp.",
            "You can pause or leave the donor list at any time.",
          ],
          next: "Sign in with your phone number to create a donor profile.",
        };

  return (
    <div className="container-page max-w-3xl py-8">
      <PageHeader title={dict.home.ctaDonate} subtitle={content.intro} />

      <ul className="mt-6 space-y-3">
        {content.points.map((point) => (
          <li key={point} className="card flex gap-3 p-4 text-sm leading-relaxed">
            <span aria-hidden="true" className="mt-0.5 text-brand-600">
              ●
            </span>
            <span>{point}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={`/${locale}/register`} className="button-primary">
          {dict.register.submit}
        </Link>
        <Link href={`/${locale}/login`} className="button-secondary">
          {dict.common.signIn}
        </Link>
      </div>

      <div className="mt-6">
        <Callout tone="warning" title={dict.register.notMedical}>
          {dict.home.disclaimer}
        </Callout>
      </div>

      <p className="mt-4 text-sm text-muted">{content.next}</p>
    </div>
  );
}
