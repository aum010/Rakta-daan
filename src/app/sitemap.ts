import type { MetadataRoute } from "next";
import { LOCALES } from "@/lib/i18n";
import { PUBLIC_PATHS, absoluteUrl } from "@/lib/site";

const PRIORITIES: Record<string, number> = {
  "": 1,
  "/find": 0.9,
  "/banks": 0.8,
  "/request/new": 0.7,
  "/learn": 0.6,
};

export default function sitemap(): MetadataRoute.Sitemap {
  return LOCALES.flatMap((locale) =>
    PUBLIC_PATHS.map((path) => ({
      url: absoluteUrl(`/${locale}${path}`),
      changeFrequency: path === "" ? ("weekly" as const) : ("monthly" as const),
      priority: PRIORITIES[path] ?? 0.5,
      alternates: {
        languages: Object.fromEntries(
          LOCALES.map((alternate) => [
            alternate === "ne" ? "ne-NP" : "en-NP",
            absoluteUrl(`/${alternate}${path}`),
          ]),
        ),
      },
    })),
  );
}
