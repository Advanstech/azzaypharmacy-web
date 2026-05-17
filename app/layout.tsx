import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/components/theme-provider";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { ToastProvider } from "@/components/pharma-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Azzay Pharmacy Pro — NEXUS",
  description: "AI-Native Pharmacy Intelligence Terminal. Powered by Gemini.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#00D9FF" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Azzay NEXUS" />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <ServiceWorkerRegister />
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="dark"
          enableSystem={true}
          disableTransitionOnChange
        >
          <AuthProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
