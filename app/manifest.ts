import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "UXAbility",
    short_name: "UXAbility",
    description: "Audit SEO, performance, accessibilita, AEO, privacy e bot policy.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4f1ea",
    theme_color: "#201c18",
    categories: ["developer", "productivity", "utilities"],
    lang: "it",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "48x48",
        type: "image/x-icon",
      },
    ],
  };
}
