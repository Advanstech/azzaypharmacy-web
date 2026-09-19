import type { Metadata } from "next";
import { CustomAuthProvider } from "@/lib/custom-auth";
import { RootStoreProvider } from "@/components/root-store-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { UpdateChecker } from "@/components/update-checker";
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
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#00D9FF" />

        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Azzay NEXUS" />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <ServiceWorkerRegister />
        <UpdateChecker />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem={true}
          disableTransitionOnChange
        >
          <CustomAuthProvider>
            <RootStoreProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </RootStoreProvider>
          </CustomAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
