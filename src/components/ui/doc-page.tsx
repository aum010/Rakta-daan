import type { DocPage as DocPageData } from "@/content/pages";
import { PageHeader } from "./ui";

export function DocPageView({ page }: { page: DocPageData }) {
  return (
    <div className="container-page max-w-3xl py-8">
      <PageHeader title={page.title} subtitle={page.intro} />
      {page.updated ? (
        <p className="mt-3 text-xs uppercase tracking-wide text-muted">{page.updated}</p>
      ) : null}

      <article className="prose-page mt-4">
        {page.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph.slice(0, 40)}>{paragraph}</p>
            ))}
            {section.bullets ? (
              <ul>
                {section.bullets.map((bullet) => (
                  <li key={bullet.slice(0, 40)}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </article>
    </div>
  );
}
