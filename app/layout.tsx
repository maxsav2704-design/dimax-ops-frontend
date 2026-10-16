import type { Metadata } from "next";
import { headers } from "next/headers";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  // Set by proxy.ts for every document request; makes rendering per-request
  // (no static prerender), which a per-request CSP nonce requires anyway.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en" dir="ltr" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head />
      <body>
        {/* Browsers hide the nonce attribute from the DOM after parsing, so the
            client sees "" while the server rendered the value: expected, not a bug. */}
        <Script
          id="dimax-locale-bootstrap"
          nonce={nonce}
          suppressHydrationWarning
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
