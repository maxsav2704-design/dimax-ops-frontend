import type { Metadata } from "next";

import PublicLandingPage from "@/views/PublicLandingPage";

export const metadata: Metadata = {
  title: "Welcome",
  description:
    "Public product entry for DIMAX Operations Suite: operations, reports and installer web in one secure workflow.",
  openGraph: {
    title: "DIMAX Operations Suite",
    description:
      "Operational control for admin teams and field installers in one system.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DIMAX Operations Suite",
    description:
      "Operational control for admin teams and field installers in one system.",
  },
};

export default function Page() {
  return <PublicLandingPage />;
}
