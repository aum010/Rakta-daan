import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rakta-Daan — blood coordination in Nepal",
    short_name: "Rakta-Daan",
    description:
      "Find blood banks, review reported stock, and coordinate with consented donors across Nepal. Demonstration build with labelled synthetic data.",
    start_url: "/en",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#b42318",
    lang: "en",
    dir: "ltr",
    categories: ["health", "medical", "social"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
