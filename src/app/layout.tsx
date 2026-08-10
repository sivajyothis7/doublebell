import type { Metadata, Viewport } from "next";
import { Anek_Malayalam, Baloo_Chettan_2 } from "next/font/google";
import Script from "next/script";
import { periodScript } from "@/engine";
import { site } from "@/lib/site";
import "./globals.css";

/**
 * Heavy Malayalam display face for the lockup — real type, never a raster. Baloo
 * Chettan is the one weighty Malayalam family with a Latin companion that holds
 * up at display size, which matters because the lockup sets both scripts.
 */
const baloo = Baloo_Chettan_2({
  variable: "--font-baloo",
  subsets: ["malayalam", "latin"],
  weight: ["600", "800"],
  display: "swap",
});

const anek = Anek_Malayalam({
  variable: "--font-anek",
  subsets: ["malayalam", "latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

/**
 * The metadata stays Latin. Malayalam belongs to the lockup on the page, not to
 * the tab title or the share card's text — those get read in a lot of places that
 * truncate mid-glyph or fall back to a font with no Malayalam at all.
 */
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: `${site.titleLatin} — ${site.tagline}`,
  description: site.description,
  applicationName: site.name,
  keywords: [
    "Malayalam songs",
    "Kerala private bus",
    "nadan pattu",
    "mappila pattu",
    "90s Malayalam hits",
    "Kalabhavan Mani",
    "Yesudas",
    "bus paattu",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: site.url,
    siteName: site.name,
    title: `${site.titleLatin} — ${site.tagline}`,
    description: site.description,
    locale: "en_IN",
    images: [{ url: "/assets/og.jpg", width: 1200, height: 630, alt: site.tagline }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.titleLatin} — ${site.tagline}`,
    description: site.description,
    images: ["/assets/og.jpg"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0a121c",
  colorScheme: "dark",
  // The deck sits on the bottom edge; it needs the safe-area insets.
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // The interface is English; the Malayalam that appears is tagged `lang="ml"`
    // at the element, which is what screen readers and search engines want.
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://www.youtube.com" />
        <link rel="preconnect" href="https://i.ytimg.com" />
      </head>
      <body className={`${baloo.variable} ${anek.variable}`}>
        {/*
          Resolves the IST day/night period and stamps <html data-period>. Has to
          run before the bundle or the plate visibly swaps after first paint, which
          is what `beforeInteractive` buys. The body is a constant built at build
          time from `periodScript()` — no user input reaches it.
        */}
        <Script id="db-period" strategy="beforeInteractive">
          {periodScript()}
        </Script>
        {children}
      </body>
    </html>
  );
}
