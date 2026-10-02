import type { Metadata } from "next";
import PriceApprovalPage from "@/views/public/PriceApprovalPage";

export const metadata: Metadata = {
  title: "Factory Price Confirmation",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function Page() {
  return <PriceApprovalPage />;
}
