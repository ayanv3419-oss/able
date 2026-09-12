import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

const DESCRIPTION = "Ask Able anything. A fast AI assistant for students.";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

export const metadata: Metadata = {
  applicationName: "Able",
  description: DESCRIPTION,
  // Falls back to the deployment URL when NEXT_PUBLIC_APP_URL is unset.
  metadataBase: APP_URL && URL.canParse(APP_URL) ? new URL(APP_URL) : undefined,
  openGraph: {
    description: DESCRIPTION,
    siteName: "Able",
    title: "Able",
    type: "website",
  },
  title: {
    default: "Able",
    template: "%s · Able",
  },
  twitter: {
    card: "summary_large_image",
    description: DESCRIPTION,
    title: "Able",
  },
};

export const viewport = {
  maximumScale: 1,
};

const geist = Geist({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-geist",
});

const geistMono = Geist_Mono({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

// Matches --background in app/globals.css for each theme.
const LIGHT_THEME_COLOR = "#fafafa";
const DARK_THEME_COLOR = "#151515";
const THEME_COLOR_SCRIPT = `\
(function() {
  var html = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  function updateThemeColor() {
    var isDark = html.classList.contains('dark');
    meta.setAttribute('content', isDark ? '${DARK_THEME_COLOR}' : '${LIGHT_THEME_COLOR}');
  }
  var observer = new MutationObserver(updateThemeColor);
  observer.observe(html, { attributes: true, attributeFilter: ['class'] });
  updateThemeColor();
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${geist.variable} ${geistMono.variable}`}
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: "Required"
          dangerouslySetInnerHTML={{
            __html: THEME_COLOR_SCRIPT,
          }}
        />
      </head>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
        >
          <SessionProvider
            basePath={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/auth`}
          >
            <TooltipProvider>{children}</TooltipProvider>
            <Toaster
              position="top-center"
              theme="system"
              toastOptions={{
                className:
                  "!bg-card !text-foreground !border-border/50 !shadow-[var(--shadow-float)]",
              }}
            />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
