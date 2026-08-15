"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  KeyRound,
  Mail,
} from "lucide-react";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { apiFetch } from "@/lib/api";
import { resolveAdminHomePath } from "@/lib/admin-access";
import { safeInternalNextPath } from "@/lib/auth-redirect";
import {
  normalizeAuthSession,
  persistAccessToken,
  persistRefreshToken,
} from "@/lib/auth-session";
import { readableApiError } from "@/lib/api-error-display";
import { getOrCreateDeviceId } from "@/lib/device-id";
import { useI18n } from "@/lib/i18n";

type LoginResponse = {
  access_token: string;
  refresh_token?: string;
  token_type: string;
};

type AuthMeResponse = {
  role: "ADMIN" | "INSTALLER";
  admin_scope?: "OWNER" | "OPERATIONS" | "FINANCE" | "VIEWER" | null;
  can_view_rates?: boolean | null;
  can_manage_imports?: boolean | null;
  can_manage_users?: boolean | null;
};

async function resolveDefaultPath(): Promise<string> {
  try {
    const body = await apiFetch<AuthMeResponse>("/api/v1/auth/me");
    const session = normalizeAuthSession(body);
    if (!session) {
      return "/";
    }
    if (session.role === "INSTALLER") {
      return "/installer";
    }
    return resolveAdminHomePath(session);
  } catch {
    return "/";
  }
}

function resetLoginPageInteractivity(): void {
  if (typeof document === "undefined") {
    return;
  }

  const nodes = [document.documentElement, document.body];
  for (const node of nodes) {
    node.style.removeProperty("overflow");
    node.style.removeProperty("pointer-events");
    node.style.removeProperty("padding-right");
    node.removeAttribute("inert");
    node.removeAttribute("data-scroll-locked");
  }
}

function enableLoginPageInteractivityGuard(): () => void {
  resetLoginPageInteractivity();
  document.documentElement.classList.add("dimax-login-active");
  document.body.classList.add("dimax-login-active");

  return () => {
    document.documentElement.classList.remove("dimax-login-active");
    document.body.classList.remove("dimax-login-active");
  };
}

export default function LoginPage() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [companyId, setCompanyId] = useState(
    () =>
      (typeof window !== "undefined" &&
        window.localStorage.getItem("dimax_company_id")) ||
      "",
  );
  const [email, setEmail] = useState(
    () =>
      (typeof window !== "undefined" &&
        window.localStorage.getItem("dimax_email")) ||
      "",
  );
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessNotice, setAccessNotice] = useState<string | null>(null);
  const canSubmit = Boolean(companyId.trim() && email.trim() && password);
  const suiteBadgeLabel =
    locale === "ru"
      ? "\u0421\u0438\u0441\u0442\u0435\u043c\u0430"
      : locale === "he"
        ? "\u05DE\u05E2\u05E8\u05DB\u05EA"
        : "Suite";
  const accessLinkLabel =
    locale === "ru"
      ? "\u041D\u0443\u0436\u0435\u043D \u0434\u043E\u0441\u0442\u0443\u043F?"
      : locale === "he"
        ? "\u05E6\u05E8\u05D9\u05DA \u05D2\u05D9\u05E9\u05D4?"
        : "Need access?";
  const systemsStatusLabel =
    locale === "ru"
      ? "\u0421\u0438\u0441\u0442\u0435\u043C\u044B \u0440\u0430\u0431\u043E\u0442\u0430\u044E\u0442"
      : locale === "he"
        ? "\u05DB\u05DC \u05D4\u05DE\u05E2\u05E8\u05DB\u05D5\u05EA \u05E4\u05E2\u05D9\u05DC\u05D5\u05EA"
        : "All systems operational";

  useEffect(() => {
    return enableLoginPageInteractivityGuard();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const code = new URLSearchParams(window.location.search).get("error");
    if (code === "admin_only") {
      setAccessNotice(t("login.accessAdminOnly"));
      return;
    }
    if (code === "installer_only") {
      setAccessNotice(t("login.accessInstallerOnly"));
      return;
    }
    if (code === "access_denied") {
      setAccessNotice(t("login.accessDenied"));
      return;
    }
    if (code === "auth_required") {
      setAccessNotice(t("login.authRequired"));
      return;
    }
    setAccessNotice(null);
  }, [t]);

  const onSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const body = await apiFetch<LoginResponse>("/api/v1/auth/login", {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          company_id: companyId.trim(),
          email: email.trim(),
          password,
          device_id: getOrCreateDeviceId(),
        }),
      });
      persistAccessToken(body.access_token);
      if (body.refresh_token) {
        persistRefreshToken(body.refresh_token);
      }
      localStorage.setItem("dimax_company_id", companyId.trim());
      localStorage.setItem("dimax_email", email.trim());
      let nextPath = await resolveDefaultPath();
      if (typeof window !== "undefined") {
        const fromQuery = new URLSearchParams(window.location.search).get(
          "next",
        );
        if (fromQuery) {
          nextPath = safeInternalNextPath(fromQuery, nextPath);
        }
      }
      router.replace(nextPath);
    } catch (e) {
      setError(readableApiError(e, locale, t("login.errorFallback")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-card-shell">
        <section className="login-hero-panel">
          <div className="login-hero-grid" />
          <div className="login-hero-content">
            <div className="login-stamp">
              <span className="login-stamp-dot" />
              {t("login.eyebrow")}
            </div>

            <h1 className="login-hero-title">{t("login.title")}</h1>
            <p className="login-hero-copy">{t("login.subtitle")}</p>

            <div className="login-feature-grid">
              {[
                [
                  t("login.feature.operations"),
                  t("login.feature.operationsText"),
                ],
                [t("login.feature.reports"), t("login.feature.reportsText")],
                [
                  t("login.feature.installer"),
                  t("login.feature.installerText"),
                ],
              ].map(([title, text]) => (
                <div key={title} className="login-feature-card">
                  <div className="login-feature-stripe" />
                  <h2 className="login-feature-title">{title}</h2>
                  <p className="login-feature-copy">{text}</p>
                </div>
              ))}
            </div>

            <div className="login-pill-row">
              <span className="login-pill">{t("login.chip.adminCenter")}</span>
              <span className="login-pill">
                {t("login.chip.installerWorkspace")}
              </span>
              <span className="login-pill">
                {t("login.chip.recoveryReady")}
              </span>
            </div>
          </div>
        </section>

        <section className="login-form-panel">
          <div className="login-form-top">
            <div className="login-brand">
              <h2 className="login-brand-title">
                DIMAX <span className="login-brand-accent">Admin</span>
              </h2>
              <div className="login-brand-meta">{t("login.signIn")}</div>
            </div>

            <LanguageSwitcher compact />

            <div className="login-suite-badge">
              <div className="login-suite-label">{suiteBadgeLabel}</div>
              <div className="login-suite-value">24/7</div>
            </div>
          </div>

          <form
            className="login-form"
            onSubmit={(event) => {
              event.preventDefault();
              void onSubmit();
            }}
          >
            <label className="login-field-label" htmlFor="company-id">
              <span className="login-field-caption">
                {t("login.companyId")}
              </span>
              <div className="login-field-control">
                <Building2 aria-hidden="true" className="login-field-icon" />
                <input
                  id="company-id"
                  name="company_id"
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  autoComplete="organization"
                  dir="auto"
                  spellCheck={false}
                  className="login-input login-input-mono"
                />
              </div>
            </label>

            <label className="login-field-label" htmlFor="email">
              <span className="login-field-caption">{t("login.email")}</span>
              <div className="login-field-control">
                <Mail aria-hidden="true" className="login-field-icon" />
                <input
                  id="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="username"
                  dir="auto"
                  inputMode="email"
                  spellCheck={false}
                  className="login-input login-input-mono"
                />
              </div>
            </label>

            <label className="login-field-label" htmlFor="password">
              <span className="login-field-caption">{t("login.password")}</span>
              <div className="login-field-control">
                <KeyRound aria-hidden="true" className="login-field-icon" />
                <input
                  id="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete="current-password"
                  className="login-input login-password-input"
                />
              </div>
            </label>

            {accessNotice && (
              <div role="status" aria-live="polite" className="login-notice">
                <AlertTriangle
                  aria-hidden="true"
                  className="login-message-icon"
                />
                <span>{accessNotice}</span>
              </div>
            )}

            {error && (
              <div role="alert" aria-live="assertive" className="login-error">
                <AlertTriangle
                  aria-hidden="true"
                  className="login-message-icon"
                />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit || loading}
              className="login-submit"
            >
              {loading ? t("login.signingIn") : t("login.signIn")}
              <ArrowRight aria-hidden="true" className="login-submit-icon" />
            </button>
          </form>

          <p className="login-helper">
            {t("login.usageHint")}
            <br />
            <Link href="/welcome" className="login-helper-link">
              {accessLinkLabel}
            </Link>
          </p>

          <div className="login-footer">
            <div className="login-status">
              <span className="login-status-dot" />
              <span>{systemsStatusLabel}</span>
            </div>
            <div>DIMAX GROUP LTD. / v1.0</div>
          </div>
        </section>
      </div>
    </div>
  );
}
