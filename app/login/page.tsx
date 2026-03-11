import type { Metadata } from "next";

import LoginPage from "@/views/LoginPage";

export const metadata: Metadata = {
  title: "Secure Login",
  description: "Secure entry into DIMAX admin and installer workflows.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Page() {
  return <LoginPage />;
}
