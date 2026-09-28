import type { Metadata, Viewport } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Toaster } from "@/components/ui/sonner";
import { GlossaryTerms } from "@/components/content/glossary-terms";
import { ServiceWorker } from "@/components/app/service-worker";
import { CookieBanner } from "@/components/cookie-banner";
import { siteConfig } from "@/lib/site";
import { currentStyle } from "@/lib/style-server";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  display: "swap",
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  openGraph: {
    siteName: siteConfig.name,
    locale: "en_GB",
    type: "website",
  },
  icons: { apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Sellers Network", statusBarStyle: "black-translucent" },
};

// Matches the dark navy in tokens.css so the phone's status bar blends in.
export const viewport: Viewport = { themeColor: "#0b1220" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const style = await currentStyle();
  return (
    <html
      lang="en-GB"
      data-brand={siteConfig.brand}
      data-style={style}
      className={`${inter.variable} ${sourceSerif.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:shadow"
        >
          Skip to content
        </a>
        <ThemeProvider>
          <AnalyticsProvider>
            <SiteHeader />
            {children}
            <SiteFooter />
            <Toaster position="bottom-center" />
            <GlossaryTerms />
            <ServiceWorker />
            <CookieBanner />
          </AnalyticsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
