import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Imagica - Professional PhotoBooth Experience",
    template: "%s | Imagica PhotoBooth",
  },
  description:
    "Capture perfect moments with style using Imagica, the ultimate photobooth app. Create stunning photos, customize your sessions, and share memories instantly.",
  keywords: [
    "photobooth",
    "photo booth",
    "instant photos",
    "event photography",
    "party photobooth",
    "digital photobooth",
    "photo sessions",
    "instant camera",
    "photo sharing",
    "memories",
  ],
  authors: [{ name: "Imagica Team" }],
  creator: "Imagica",
  publisher: "Imagica",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://imagica-nu.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Imagica - Professional PhotoBooth Experience",
    description:
      "Capture perfect moments with style using Imagica, the ultimate photobooth app. Create stunning photos, customize your sessions, and share memories instantly.",
    url: "https://imagica-nu.vercel.app",
    siteName: "Imagica PhotoBooth",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Imagica PhotoBooth - Capture Perfect Moments",
      },
      {
        url: "/og-image-square.png",
        width: 1200,
        height: 1200,
        alt: "Imagica PhotoBooth App",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Imagica - Professional PhotoBooth Experience",
    description:
      "Capture perfect moments with style using Imagica, the ultimate photobooth app.",
    images: ["/og-image.png"],
    creator: "@imagica_app",
    site: "@imagica_app",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "android-chrome-192x192",
        url: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        rel: "android-chrome-512x512",
        url: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  },
  manifest: "/site.webmanifest",
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "Imagica",
    "application-name": "Imagica",
    "msapplication-TileColor": "#000000",
    "msapplication-config": "/browserconfig.xml",
    "theme-color": "#000000",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />

        {/* Additional meta tags for better SEO */}
        <meta
          name="google-site-verification"
          content="your-google-verification-code"
        />
        <meta name="pinterest" content="nopin" />

        {/* Structured Data for better search results */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Imagica PhotoBooth",
              description:
                "Professional photobooth app for capturing perfect moments with style",
              url: "https://imagica-nu.vercel.app",
              applicationCategory: "Photography",
              operatingSystem: "Any",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              creator: {
                "@type": "Organization",
                name: "Imagica",
              },
            }),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
