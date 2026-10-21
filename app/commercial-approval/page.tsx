import type { Metadata } from "next";
import CommercialApprovalPage from "@/views/public/CommercialApprovalPage";

export const metadata: Metadata = {
  title: "DIMAX Commercial Agreement Confirmation",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function Page() { return <CommercialApprovalPage />; }
