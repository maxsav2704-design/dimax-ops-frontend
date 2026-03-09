import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, KeyRound, LogIn, Mail } from "lucide-react";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { apiBaseUrl } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type LoginResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

type AuthMeResponse = {
  role: "ADMIN" | "INSTALLER";
};

async function resolveDefaultPath(accessToken: string): Promise<string> {
  try {
    const response = await fetch(`${apiBaseUrl()}/api/v1/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!response.ok) {
      return "/";
    }
    const body = (await response.json()) as AuthMeResponse;
    if (body.role === "INSTALLER") {
      return "/installer";
    }
    return "/";
  } catch {
    return "/";
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [companyId, setCompanyId] = useState(
    () =>
      (typeof window !== "undefined" &&
        window.localStorage.getItem("dimax_company_id")) ||
      ""
  );
  const [email, setEmail] = useState(
    () =>
      (typeof window !== "undefined" && window.localStorage.getItem("dimax_email")) ||
      ""
  );
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessNotice, setAccessNotice] = useState<string | null>(null);

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
    setAccessNotice(null);
  }, [t]);

  const onSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiBaseUrl()}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId.trim(),
          email: email.trim(),
          password,
        }),
      });
      if (!response.ok) {
        let message = `${response.status} ${response.statusText}`;
        try {
          const body = await response.json();
          message = body?.error?.message || body?.detail || message;
        } catch {
          // Keep default message.
        }
        throw new Error(message);
      }
      const body = (await response.json()) as LoginResponse;
      localStorage.setItem("dimax_access_token", body.access_token);
      localStorage.setItem("dimax_refresh_token", body.refresh_token);
      localStorage.setItem("dimax_company_id", companyId.trim());
      localStorage.setItem("dimax_email", email.trim());
      let nextPath = await resolveDefaultPath(body.access_token);
      if (typeof window !== "undefined") {
        const fromQuery = new URLSearchParams(window.location.search).get("next");
        if (fromQuery) {
          nextPath = fromQuery;
        }
      }
      router.replace(nextPath);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 shell-grid opacity-30" />
        <div className="absolute left-[-6rem] top-[-4rem] h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute right-[-4rem] top-24 h-72 w-72 rounded-full bg-primary/12 blur-3xl" />
      </div>

      <div className="relative grid w-full max-w-[1180px] overflow-hidden rounded-[2rem] border border-border/70 bg-card/78 shadow-[0_45px_120px_-54px_hsl(var(--primary)/0.38)] backdrop-blur-xl lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative hidden overflow-hidden border-r border-border/70 px-10 py-12 lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--accent)/0.16),transparent_34%),linear-gradient(135deg,hsl(var(--primary)/0.96),hsl(var(--primary)/0.88))]" />
          <div className="absolute inset-0 shell-grid opacity-15" />
          <div className="relative z-10">
            <div className="page-eyebrow border-white/20 bg-white/10 text-white">{t("login.eyebrow")}</div>
            <h1 className="mt-6 max-w-lg text-5xl font-semibold leading-[0.96] text-white">
              {t("login.title")}
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-7 text-white/72">
              {t("login.subtitle")}
            </p>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                [t("login.feature.operations"), t("login.feature.operationsText")],
                [t("login.feature.reports"), t("login.feature.reportsText")],
                [t("login.feature.installer"), t("login.feature.installerText")],
              ].map(([title, text]) => (
                <div
                  key={title}
                  className="rounded-[1.4rem] border border-white/10 bg-white/8 px-4 py-4 backdrop-blur-sm"
                >
                  <div className="font-display text-lg font-semibold text-white">{title}</div>
                  <p className="mt-2 text-[12px] leading-6 text-white/68">{text}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <span className="metric-chip bg-white/10 text-white/78">{t("login.chip.adminCenter")}</span>
              <span className="metric-chip bg-white/10 text-white/78">{t("login.chip.installerWorkspace")}</span>
              <span className="metric-chip bg-white/10 text-white/78">{t("login.chip.recoveryReady")}</span>
            </div>
          </div>
        </section>

        <section className="px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="page-eyebrow">Dimax Ops</div>
              <LanguageSwitcher compact />
            </div>
            <h1 className="mt-4 text-3xl font-semibold text-card-foreground">{t("login.signIn")}</h1>
          </div>

          <div className="surface-panel animate-panel-rise p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-[26px] font-semibold text-card-foreground tracking-tight">{t("login.admin")}</h1>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {t("login.secureAccess")}
                </p>
              </div>
              <div className="hidden items-start gap-3 sm:flex">
                <LanguageSwitcher compact />
                <div className="rounded-2xl bg-accent/10 px-3 py-2 text-right">
                  <div className="text-[10px] uppercase tracking-[0.24em] text-accent">Suite</div>
                  <div className="mt-1 font-display text-lg font-semibold text-foreground">24/7</div>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-muted-foreground">{t("login.companyId")}</span>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="h-12 w-full rounded-xl border border-border bg-background/80 pl-11 pr-4 text-[13px] shadow-[inset_0_1px_0_hsl(0_0%_100%/0.45)] transition-all duration-200 focus:border-accent/45 focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-muted-foreground">{t("login.email")}</span>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                className="h-12 w-full rounded-xl border border-border bg-background/80 pl-11 pr-4 text-[13px] shadow-[inset_0_1px_0_hsl(0_0%_100%/0.45)] transition-all duration-200 focus:border-accent/45 focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-muted-foreground">{t("login.password")}</span>
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="h-12 w-full rounded-xl border border-border bg-background/80 pl-11 pr-4 text-[13px] shadow-[inset_0_1px_0_hsl(0_0%_100%/0.45)] transition-all duration-200 focus:border-accent/45 focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
          </label>
            </div>

            {accessNotice && (
              <div className="mt-4 rounded-xl border border-[hsl(var(--warning)/0.35)] bg-[hsl(var(--warning)/0.08)] px-4 py-3 text-[12px] text-[hsl(var(--warning-foreground))]">
                {accessNotice}
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-xl border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] px-4 py-3 text-[12px] text-[hsl(var(--destructive))]">
                {error}
              </div>
            )}

            <button
              onClick={() => void onSubmit()}
              disabled={!companyId.trim() || !email.trim() || !password || loading}
              className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-[13px] font-semibold text-accent-foreground shadow-[0_22px_44px_-22px_hsl(var(--accent)/0.75)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_28px_54px_-24px_hsl(var(--accent)/0.82)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogIn className="h-4 w-4" />
              {loading ? t("login.signingIn") : t("login.signIn")}
            </button>

            <div className="mt-4 text-[11px] text-muted-foreground">
              {t("login.usageHint")}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
