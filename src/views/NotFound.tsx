"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";

const NotFound = () => {
  const pathname = usePathname();
  const { locale } = useI18n();
  const copy = (en: string, ru: string, he: string) =>
    locale === "ru" ? ru : locale === "he" ? he : en;
  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      pathname,
    );
  }, [pathname]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-sunken">
      {" "}
      <div className="text-center">
        {" "}
        <h1 className="mb-4 text-4xl font-bold">404</h1>{" "}
        <p className="mb-4 text-xl text-text-secondary">
          {copy("Page not found", "Страница не найдена", "הדף לא נמצא")}
        </p>{" "}
        <Link href="/" className="text-link underline hover:text-link-hover">
          {" "}
          {copy("Return to Home", "Вернуться на главную", "חזרה לדף הראשי")}{" "}
        </Link>{" "}
      </div>{" "}
    </div>
  );
};
export default NotFound;
