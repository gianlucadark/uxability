import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { LanguageProvider } from "@/context/LanguageContext";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const socialPreviewImage = {
  url: "/uxability-social-preview.png",
  width: 1915,
  height: 906,
  alt: "UXAbility - Make the web readable.",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "UXAbility | Audit SEO, Performance, AEO e Privacy",
    template: "%s | UXAbility",
  },
  description: "Analizza il tuo sito con un audit intelligente su performance, accessibilita, SEO, AEO, privacy, carbon footprint e policy dei bot AI.",
  applicationName: "UXAbility",
  authors: [{ name: "Gianluca D'Arcangelo", url: "https://gianlucadarcangelo.vercel.app" }],
  creator: "Gianluca D'Arcangelo",
  publisher: "UXAbility",
  keywords: [
    "audit sito web",
    "Core Web Vitals",
    "SEO audit",
    "AEO",
    "AI readiness",
    "accessibilita web",
    "privacy score",
    "robots.txt AI",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "UXAbility",
    title: "UXAbility | Audit SEO, Performance, AEO e Privacy",
    description: "Crawl intelligente per misurare performance, accessibilita, SEO, leggibilita per AI, privacy e sostenibilita del tuo sito.",
    images: [socialPreviewImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "UXAbility | Audit SEO, Performance, AEO e Privacy",
    description: "Analizza il tuo sito con report completi su Core Web Vitals, SEO, accessibilita, AEO, privacy e bot AI.",
    images: [socialPreviewImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f4f1ea",
  colorScheme: "light",
};

// dateModified is wired to the build time so structured data stays fresh
// without a manual bump on every release. datePublished stays as the project's
// public launch anchor.
const BUILD_DATE = (process.env.NEXT_PUBLIC_BUILD_DATE || new Date().toISOString()).slice(0, 10);

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "UXAbility",
  url: SITE_URL,
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  description: "Audit tool per performance, accessibilita, SEO, AEO, privacy e policy dei bot AI.",
  datePublished: "2024-01-01",
  dateModified: BUILD_DATE,
  creator: {
    "@type": "Person",
    name: "Gianluca D'Arcangelo",
    url: "https://gianlucadarcangelo.vercel.app",
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",
  },
  featureList: [
    "Core Web Vitals audit",
    "SEO audit",
    "Accessibility audit",
    "Answer Engine Optimization score",
    "Privacy and tracker score",
    "AI bot policy analysis",
    "PDF report export",
  ],
};

const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is Answer Engine Optimization (AEO)?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "AEO (Answer Engine Optimization) measures how well a web page can be understood, extracted, and cited by AI answer engines such as ChatGPT, Perplexity, and Google AI Overviews. It evaluates structure, content clarity, and authority signals.",
      },
    },
    {
      "@type": "Question",
      name: "What are Core Web Vitals?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Core Web Vitals are real-user experience metrics defined by Google: Largest Contentful Paint (LCP) measures loading speed, Interaction to Next Paint (INP) measures interactivity, and Cumulative Layout Shift (CLS) measures visual stability.",
      },
    },
    {
      "@type": "Question",
      name: "How does UXAbility calculate the Privacy Score?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "UXAbility scans the page HTML for third-party scripts, iframes, and tracking pixels. Advertising trackers reduce the score by 18 points each, analytics trackers by 8 points each, and functional trackers by 3 points each. A consent management platform adds 12 points back.",
      },
    },
    {
      "@type": "Question",
      name: "What is a llms.txt file?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "llms.txt is a plain-text file placed at the root of a website (e.g. /llms.txt) that provides a concise summary of the site's content and purpose for large language models. It helps AI systems understand and accurately cite the website.",
      },
    },
    {
      "@type": "Question",
      name: "How does UXAbility measure carbon footprint?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "UXAbility estimates CO2 emissions based on the total transferred page weight in bytes, using the formula: (bytes / 1 GB) × 0.8 kWh/GB × 442 g CO2/kWh. Reducing images, scripts, and unnecessary requests directly lowers the carbon impact per visit.",
      },
    },
    {
      "@type": "Question",
      name: "Is UXAbility free to use?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. UXAbility is a free web audit tool. Enter any URL to get a full report covering performance, accessibility, SEO, AEO score, privacy, carbon footprint, and AI bot policy — no account required.",
      },
    },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const langCookie = cookieStore.get("lang")?.value;
  const lang = langCookie === "en" ? "en" : "it";
  const skipLabel = lang === "en" ? "Skip to main content" : "Salta al contenuto principale";

  return (
    <html lang={lang}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <a href="#main-content" className="skip-link">
          {skipLabel}
        </a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
        />
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
