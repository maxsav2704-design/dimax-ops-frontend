import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, KeyRound, LogIn, Mail } from "lucide-react";

import { apiBaseUrl } from "@/lib/api";

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
      setAccessNotice("This panel is available only for ADMIN role.");
      return;
    }
    if (code === "installer_only") {
      setAccessNotice("Installer workspace is available only for INSTALLER role.");
      return;
    }
    setAccessNotice(null);
  }, []);

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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[420px] rounded-2xl border border-border bg-card p-6 shadow-[0_18px_55px_-20px_hsl(var(--foreground)/0.25)]">
        <h1 className="text-[22px] font-semibold text-card-foreground tracking-tight">DIMAX Admin</h1>
        <p className="text-[13px] text-muted-foreground mt-1">Sign in to Operations Suite</p>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-[12px] text-muted-foreground mb-1 block">Company ID</span>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-[13px]"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-[12px] text-muted-foreground mb-1 block">Email</span>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-[13px]"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-[12px] text-muted-foreground mb-1 block">Password</span>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-[13px]"
              />
            </div>
          </label>
        </div>

        {accessNotice && (
          <div className="mt-3 rounded-lg border border-[hsl(var(--warning)/0.35)] bg-[hsl(var(--warning)/0.08)] px-3 py-2 text-[12px] text-[hsl(var(--warning-foreground))]">
            {accessNotice}
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-lg border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] px-3 py-2 text-[12px] text-[hsl(var(--destructive))]">
            {error}
          </div>
        )}

        <button
          onClick={() => void onSubmit()}
          disabled={!companyId.trim() || !email.trim() || !password || loading}
          className="mt-4 h-10 w-full rounded-lg bg-accent text-accent-foreground text-[13px] font-medium disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
        >
          <LogIn className="w-4 h-4" />
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </div>
    </div>
  );
}
