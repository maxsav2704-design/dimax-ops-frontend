import type { Metadata } from "next";
import Script from "next/script";
import type { ReactNode } from "react";
import { AppProviders } from "@/components/AppProviders";
import { getDocumentLocaleBootstrapScript } from "@/lib/locale";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "DIMAX Operations Suite",
    template: "%s | DIMAX Operations Suite",
  },
  description: "Operational control for admin teams and field installers in one system.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head />
      <body>
        <Script
          id="dimax-locale-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: getDocumentLocaleBootstrapScript(),
          }}
        />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
