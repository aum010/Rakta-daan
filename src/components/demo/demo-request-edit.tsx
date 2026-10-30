"use client";

import Link from "next/link";
import type { Dictionary } from "@/messages/en";
import type { Locale } from "@/lib/i18n";
import { getDemoRequest } from "@/mocks/request";
import { useDemoDataVersion } from "@/mocks/use-demo-data";
import { Callout, DemoBanner, LoadingBlock } from "../ui/ui";
import { DemoRequestWizard } from "./demo-request-wizard";

export function DemoRequestEdit({
  locale,
  dict,
  reference,
}: {
  locale: Locale;
  dict: Dictionary;
  reference: string;
}) {
  const version = useDemoDataVersion();
  if (version < 0) return <LoadingBlock label={dict.common.loading} rows={2} />;

  const record = getDemoRequest(reference);

  if (!record || record.status !== "open") {
    return (
      <div>
        <DemoBanner>{dict.requestDemo.demoNotice}</DemoBanner>
        <div className="mt-4">
          <Callout tone="warning" title={dict.requestDemo.status.notFoundTitle}>
            {dict.requestDemo.status.notFoundBody}
          </Callout>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link className="button-primary" href={`/${locale}/request/status/${reference}`}>
            {dict.requestDemo.openStatus}
          </Link>
          <Link className="button-secondary" href={`/${locale}/request/new`}>
            {dict.requestDemo.newRequest}
          </Link>
        </div>
      </div>
    );
  }

  return <DemoRequestWizard locale={locale} dict={dict} initial={record} />;
}
