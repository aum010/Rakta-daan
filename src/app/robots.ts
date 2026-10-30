import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/org/",
          "/dashboard",
          "/donor/",
          "/login",
          "/requests/",
          "/respond/",
          "/donor/demo/dashboard",
          "/request/status/",
          "/request/edit/",
          "/request/new",
          "/api/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
