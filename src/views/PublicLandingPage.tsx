import Link from "next/link";
import {
  ArrowRight,
  Bug,
  FolderKanban,
  Globe2,
  LayoutDashboard,
  LockKeyhole,
  MessagesSquare,
  Radar,
  ShieldCheck,
  Sparkles,
  Users2,
  Wrench,
} from "lucide-react";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";

export default function PublicLandingPage() {
  const { t } = useI18n();

  const pillars = [
    {
      icon: ShieldCheck,
      title: t("landing.pillarOpsTitle"),
      text: t("landing.pillarOpsText"),
    },
    {
      icon: LayoutDashboard,
      title: t("landing.pillarReportsTitle"),
      text: t("landing.pillarReportsText"),
    },
    {
      icon: Wrench,
      title: t("landing.pillarInstallerTitle"),
      text: t("landing.pillarInstallerText"),
    },
  ];

  const proofPoints = [
    t("landing.proofTesting"),
    t("landing.proofI18n"),
    t("landing.proofGovernance"),
  ];

  const routePreviews = [
    {
      title: t("landing.previewOpsTitle"),
      text: t("landing.previewOpsText"),
      route: t("landing.previewOpsRoute"),
      href: "/login?next=/operations",
      accent: "from-[hsl(var(--accent)/0.22)] via-transparent to-transparent",
    },
    {
      title: t("landing.previewReportsTitle"),
      text: t("landing.previewReportsText"),
      route: t("landing.previewReportsRoute"),
      href: "/login?next=/reports",
      accent: "from-[hsl(var(--primary)/0.16)] via-transparent to-transparent",
    },
    {
      title: t("landing.previewInstallerTitle"),
      text: t("landing.previewInstallerText"),
      route: t("landing.previewInstallerRoute"),
      href: "/login?next=/installer",
      accent: "from-[hsl(var(--accent)/0.14)] via-transparent to-transparent",
    },
  ];

  const demoSteps = [
    t("landing.demoStepOne"),
    t("landing.demoStepTwo"),
    t("landing.demoStepThree"),
  ];

  const trustMetrics = [
    [t("landing.trustMetricQuality"), t("landing.trustMetricQualityValue")],
    [t("landing.trustMetricLocales"), t("landing.trustMetricLocalesValue")],
    [t("landing.trustMetricPreview"), t("landing.trustMetricPreviewValue")],
  ];

  const trustSignals = [
    {
      icon: ShieldCheck,
      title: t("landing.signalOneTitle"),
      text: t("landing.signalOneText"),
    },
    {
      icon: Radar,
      title: t("landing.signalTwoTitle"),
      text: t("landing.signalTwoText"),
    },
    {
      icon: LockKeyhole,
      title: t("landing.signalThreeTitle"),
      text: t("landing.signalThreeText"),
    },
  ];

  const architectureModules = [
    {
      icon: FolderKanban,
      title: t("landing.archProjectsTitle"),
      text: t("landing.archProjectsText"),
    },
    {
      icon: Bug,
      title: t("landing.archIssuesTitle"),
      text: t("landing.archIssuesText"),
    },
    {
      icon: MessagesSquare,
      title: t("landing.archJournalTitle"),
      text: t("landing.archJournalText"),
    },
    {
      icon: Users2,
      title: t("landing.archInstallersTitle"),
      text: t("landing.archInstallersText"),
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,hsl(var(--accent)/0.16),transparent_32%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)/0.96))]">
      <div className="pointer-events-none absolute inset-0 shell-grid opacity-25" />
      <div className="pointer-events-none absolute left-[-10rem] top-[-6rem] h-[26rem] w-[26rem] rounded-full bg-accent/18 blur-3xl" />
      <div className="pointer-events-none absolute right-[-8rem] top-20 h-[24rem] w-[24rem] rounded-full bg-primary/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-[1380px] flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4">
          <div className="page-eyebrow">{t("landing.eyebrow")}</div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher compact />
            <Link
              href="/login"
              className="btn-premium h-10 rounded-xl px-4 text-[13px] font-medium"
            >
              {t("landing.primaryCta")}
            </Link>
          </div>
        </header>

        <main className="motion-stagger flex-1 py-8 lg:py-12">
          <section className="page-hero motion-page-enter overflow-hidden">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
              <div className="max-w-3xl">
                <div className="page-eyebrow">{t("landing.eyebrow")}</div>
                <h1 className="mt-4 max-w-4xl font-display text-4xl tracking-[-0.05em] text-foreground sm:text-5xl lg:text-6xl">
                  {t("landing.title")}
                </h1>
                <p className="mt-5 max-w-2xl text-[15px] leading-7 text-muted-foreground sm:text-[16px]">
                  {t("landing.subtitle")}
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    href="/login"
                    className="btn-premium h-12 rounded-2xl px-5 text-[14px] font-semibold"
                  >
                    {t("landing.primaryCta")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/login?next=/installer"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-border/70 bg-background/70 px-5 text-[14px] font-medium text-foreground"
                  >
                    {t("landing.secondaryCta")}
                  </Link>
                </div>
              </div>

              <div className="surface-panel grid gap-4 p-5 sm:grid-cols-3">
                <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {t("landing.statAdmin")}
                  </div>
                  <div className="mt-2 text-3xl font-semibold text-foreground">6+</div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {t("landing.statInstaller")}
                  </div>
                  <div className="mt-2 text-3xl font-semibold text-foreground">Web</div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {t("landing.statLanguages")}
                  </div>
                  <div className="mt-2 text-3xl font-semibold text-foreground">3</div>
                </div>
              </div>
            </div>
          </section>

          <section className="motion-page-enter mt-8 grid gap-4 lg:grid-cols-3">
            {pillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <article key={pillar.title} className="surface-panel p-5">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-background/75">
                    <Icon className="h-5 w-5 text-accent" />
                  </div>
                  <h2 className="mt-4 text-xl font-semibold text-foreground">{pillar.title}</h2>
                  <p className="mt-3 text-[14px] leading-6 text-muted-foreground">{pillar.text}</p>
                </article>
              );
            })}
          </section>

          <section className="motion-page-enter mt-8 grid gap-4 lg:grid-cols-[1fr_1fr]">
            <article className="surface-panel p-6">
              <div className="page-eyebrow">{t("landing.rolesTitle")}</div>
              <div className="mt-5 grid gap-4">
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  <div className="text-lg font-semibold text-foreground">
                    {t("landing.roleAdminTitle")}
                  </div>
                  <p className="mt-2 text-[14px] leading-6 text-muted-foreground">
                    {t("landing.roleAdminText")}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  <div className="text-lg font-semibold text-foreground">
                    {t("landing.roleInstallerTitle")}
                  </div>
                  <p className="mt-2 text-[14px] leading-6 text-muted-foreground">
                    {t("landing.roleInstallerText")}
                  </p>
                </div>
              </div>
            </article>

            <article className="surface-panel p-6">
              <div className="page-eyebrow">{t("landing.proofTitle")}</div>
              <div className="mt-5 grid gap-3">
                {proofPoints.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/70 px-4 py-4"
                  >
                    <Globe2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <div className="text-[14px] leading-6 text-foreground">{item}</div>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="motion-page-enter mt-8 grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
            <article className="surface-panel p-6">
              <div className="page-eyebrow">{t("landing.previewTitle")}</div>
              <div className="mt-3 max-w-2xl text-[14px] leading-6 text-muted-foreground">
                {t("landing.previewText")}
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-3">
                {routePreviews.map((item) => (
                  <div
                    key={item.route}
                    className="overflow-hidden rounded-[1.6rem] border border-border/70 bg-background/72"
                  >
                    <div className={`relative h-32 border-b border-border/60 bg-gradient-to-br ${item.accent}`}>
                      <div className="absolute inset-0 shell-grid opacity-20" />
                      <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/78 px-3 py-1 text-[11px] font-medium text-foreground">
                        <Sparkles className="h-3.5 w-3.5 text-accent" />
                        {t("landing.secureRoute")}
                      </div>
                      <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-border/70 bg-background/80 px-4 py-3 backdrop-blur">
                        <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                          {t("landing.openRoute")}
                        </div>
                        <div className="mt-1 font-mono text-sm text-foreground">{item.route}</div>
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="text-lg font-semibold text-foreground">{item.title}</div>
                      <p className="mt-2 text-[14px] leading-6 text-muted-foreground">{item.text}</p>
                      <Link
                        href={item.href}
                        className="mt-5 inline-flex items-center gap-2 text-[13px] font-medium text-accent"
                      >
                        {t("landing.openRoute")}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="surface-panel p-6">
              <div className="page-eyebrow">{t("landing.demoTitle")}</div>
              <div className="mt-5 grid gap-3">
                {demoSteps.map((step) => (
                  <div
                    key={step}
                    className="rounded-2xl border border-border/70 bg-background/70 px-4 py-4 text-[14px] leading-6 text-foreground"
                  >
                    {step}
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="motion-page-enter mt-8 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <article className="surface-panel p-6">
              <div className="page-eyebrow">{t("landing.trustTitle")}</div>
              <p className="mt-3 max-w-3xl text-[14px] leading-6 text-muted-foreground">
                {t("landing.trustText")}
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {trustMetrics.map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-border/70 bg-background/72 px-4 py-4"
                  >
                    <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      {label}
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-3">
                {trustSignals.map((signal) => {
                  const Icon = signal.icon;
                  return (
                    <div
                      key={signal.title}
                      className="rounded-[1.5rem] border border-border/70 bg-background/72 p-5"
                    >
                      <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-background/80">
                        <Icon className="h-5 w-5 text-accent" />
                      </div>
                      <div className="mt-4 text-lg font-semibold text-foreground">{signal.title}</div>
                      <p className="mt-2 text-[14px] leading-6 text-muted-foreground">
                        {signal.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="surface-panel p-6">
              <div className="page-eyebrow">{t("landing.accessTitle")}</div>
              <div className="mt-5 grid gap-4">
                <div className="rounded-2xl border border-border/70 bg-background/72 p-4">
                  <div className="text-lg font-semibold text-foreground">
                    {t("landing.accessAdminTitle")}
                  </div>
                  <p className="mt-2 text-[14px] leading-6 text-muted-foreground">
                    {t("landing.accessAdminText")}
                  </p>
                  <Link
                    href="/login?next=/operations"
                    className="mt-4 inline-flex items-center gap-2 text-[13px] font-medium text-accent"
                  >
                    {t("landing.openRoute")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="rounded-2xl border border-border/70 bg-background/72 p-4">
                  <div className="text-lg font-semibold text-foreground">
                    {t("landing.accessInstallerTitle")}
                  </div>
                  <p className="mt-2 text-[14px] leading-6 text-muted-foreground">
                    {t("landing.accessInstallerText")}
                  </p>
                  <Link
                    href="/login?next=/installer"
                    className="mt-4 inline-flex items-center gap-2 text-[13px] font-medium text-accent"
                  >
                    {t("landing.openRoute")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </article>
          </section>

          <section className="motion-page-enter mt-8">
            <article className="surface-panel p-6">
              <div className="page-eyebrow">{t("landing.architectureTitle")}</div>
              <p className="mt-3 max-w-3xl text-[14px] leading-6 text-muted-foreground">
                {t("landing.architectureText")}
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {architectureModules.map((module) => {
                  const Icon = module.icon;
                  return (
                    <div
                      key={module.title}
                      className="rounded-[1.5rem] border border-border/70 bg-background/72 p-5"
                    >
                      <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-background/80">
                        <Icon className="h-5 w-5 text-accent" />
                      </div>
                      <div className="mt-4 text-lg font-semibold text-foreground">{module.title}</div>
                      <p className="mt-2 text-[14px] leading-6 text-muted-foreground">
                        {module.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            </article>
          </section>

          <section className="motion-page-enter mt-8">
            <div className="surface-panel flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <div className="text-2xl font-semibold text-foreground">{t("landing.finalTitle")}</div>
                <p className="mt-2 text-[14px] leading-6 text-muted-foreground">
                  {t("landing.finalText")}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className="btn-premium h-11 rounded-xl px-4 text-[13px] font-medium"
                >
                  {t("landing.primaryCta")}
                </Link>
                <Link
                  href="/installer"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-border/70 bg-background/70 px-4 text-[13px] font-medium text-foreground"
                >
                  {t("landing.secondaryCta")}
                </Link>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
