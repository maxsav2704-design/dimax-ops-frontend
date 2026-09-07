"use client";
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
import { cn } from "@/lib/utils";

function landingPanelClass(extra?: string): string {
  return cn("rounded-lg border border-border bg-surface", extra);
}

export default function PublicLandingPage() {
  const { locale, t } = useI18n();
  const lt = (key: string) => t(key);
  const installerSurfaceValue =
    locale === "ru" ? "Веб" : locale === "he" ? "ווב" : "Web";
  const pillars = [
    {
      icon: ShieldCheck,
      title: lt("landing.pillarOpsTitle"),
      text: lt("landing.pillarOpsText"),
    },
    {
      icon: LayoutDashboard,
      title: lt("landing.pillarReportsTitle"),
      text: lt("landing.pillarReportsText"),
    },
    {
      icon: Wrench,
      title: lt("landing.pillarInstallerTitle"),
      text: lt("landing.pillarInstallerText"),
    },
  ];
  const proofPoints = [
    lt("landing.proofTesting"),
    lt("landing.proofI18n"),
    lt("landing.proofGovernance"),
  ];
  const routePreviews = [
    {
      title: lt("landing.previewOpsTitle"),
      text: lt("landing.previewOpsText"),
      route: lt("landing.previewOpsRoute"),
      href: "/login?next=/operations",
    },
    {
      title: lt("landing.previewReportsTitle"),
      text: lt("landing.previewReportsText"),
      route: lt("landing.previewReportsRoute"),
      href: "/login?next=/reports",
    },
    {
      title: lt("landing.previewInstallerTitle"),
      text: lt("landing.previewInstallerText"),
      route: lt("landing.previewInstallerRoute"),
      href: "/login?next=/installer",
    },
  ];
  const demoSteps = [
    lt("landing.demoStepOne"),
    lt("landing.demoStepTwo"),
    lt("landing.demoStepThree"),
  ];
  const trustMetrics = [
    [lt("landing.trustMetricQuality"), lt("landing.trustMetricQualityValue")],
    [lt("landing.trustMetricLocales"), lt("landing.trustMetricLocalesValue")],
    [lt("landing.trustMetricPreview"), lt("landing.trustMetricPreviewValue")],
  ];
  const trustSignals = [
    {
      icon: ShieldCheck,
      title: lt("landing.signalOneTitle"),
      text: lt("landing.signalOneText"),
    },
    {
      icon: Radar,
      title: lt("landing.signalTwoTitle"),
      text: lt("landing.signalTwoText"),
    },
    {
      icon: LockKeyhole,
      title: lt("landing.signalThreeTitle"),
      text: lt("landing.signalThreeText"),
    },
  ];
  const architectureModules = [
    {
      icon: FolderKanban,
      title: lt("landing.archProjectsTitle"),
      text: lt("landing.archProjectsText"),
    },
    {
      icon: Bug,
      title: lt("landing.archIssuesTitle"),
      text: lt("landing.archIssuesText"),
    },
    {
      icon: MessagesSquare,
      title: lt("landing.archJournalTitle"),
      text: lt("landing.archJournalText"),
    },
    {
      icon: Users2,
      title: lt("landing.archInstallersTitle"),
      text: lt("landing.archInstallersText"),
    },
  ];
  const useCases = [
    {
      title: lt("landing.useCaseAdminTitle"),
      steps: [
        lt("landing.useCaseAdminStepOne"),
        lt("landing.useCaseAdminStepTwo"),
        lt("landing.useCaseAdminStepThree"),
      ],
      href: "/login?next=/operations",
    },
    {
      title: lt("landing.useCaseInstallerTitle"),
      steps: [
        lt("landing.useCaseInstallerStepOne"),
        lt("landing.useCaseInstallerStepTwo"),
        lt("landing.useCaseInstallerStepThree"),
      ],
      href: "/login?next=/installer",
    },
  ];
  const readinessMetrics = [
    [lt("landing.readinessPreview"), lt("landing.readinessPreviewValue")],
    [lt("landing.readinessI18n"), lt("landing.readinessI18nValue")],
    [lt("landing.readinessRelease"), lt("landing.readinessReleaseValue")],
  ];
  const fitFor = [
    lt("landing.fitForOne"),
    lt("landing.fitForTwo"),
    lt("landing.fitForThree"),
  ];
  const fitNotFor = [lt("landing.fitNotOne"), lt("landing.fitNotTwo")];
  return (
    <div className="relative min-h-screen overflow-hidden bg-canvas">
      {" "}
      <div className="pointer-events-none absolute inset-0 shell-grid opacity-25" />{" "}
      <div className="relative mx-auto flex min-h-screen max-w-[1380px] flex-col px-5 py-6 sm:px-8 lg:px-10">
        {" "}
        <header className="flex flex-wrap items-center justify-between gap-4">
          {" "}
          <div className="page-eyebrow">{lt("landing.eyebrow")}</div>{" "}
          <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
            {" "}
            <LanguageSwitcher compact />{" "}
            <Link
              href="/login"
              className="btn-premium inline-flex h-10 items-center justify-center rounded-lg px-4 text-[13px] font-medium"
            >
              {" "}
              {lt("landing.primaryCta")}{" "}
            </Link>{" "}
          </div>{" "}
        </header>{" "}
        <main className="motion-stagger readability-wrap flex-1 py-8 lg:py-12">
          {" "}
          <section className="page-hero motion-page-enter overflow-hidden">
            {" "}
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
              {" "}
              <div className="max-w-3xl">
                {" "}
                <div className="page-eyebrow">{lt("landing.eyebrow")}</div>{" "}
                <h1 className="mt-4 max-w-4xl font-display text-4xl text-text sm:text-5xl lg:text-6xl">
                  {" "}
                  {lt("landing.title")}{" "}
                </h1>{" "}
                <p className="mt-5 max-w-2xl text-[15px] leading-7 text-text-secondary sm:text-[16px]">
                  {" "}
                  {lt("landing.subtitle")}{" "}
                </p>{" "}
                <div className="mt-7 flex flex-wrap gap-3">
                  {" "}
                  <Link
                    href="/login"
                    className="btn-premium inline-flex h-12 w-full items-center justify-center rounded-lg px-5 text-[14px] font-semibold sm:w-auto"
                  >
                    {" "}
                    {lt("landing.primaryCta")}{" "}
                    <ArrowRight className="h-4 w-4" />{" "}
                  </Link>{" "}
                  <Link
                    href="/login?next=/installer"
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface-subtle px-5 text-[14px] font-medium text-text sm:w-auto"
                  >
                    {" "}
                    {lt("landing.secondaryCta")}{" "}
                  </Link>{" "}
                </div>{" "}
              </div>{" "}
              <div className={landingPanelClass("grid gap-4 p-5 sm:grid-cols-3")}>
                {" "}
                <div className="rounded-lg border border-border bg-surface-subtle px-4 py-4">
                  {" "}
                  <div className="text-[11px] uppercase text-text-secondary">
                    {" "}
                    {lt("landing.statAdmin")}{" "}
                  </div>{" "}
                  <div className="mt-2 text-3xl font-semibold text-text">
                    6+
                  </div>{" "}
                </div>{" "}
                <div className="rounded-lg border border-border bg-surface-subtle px-4 py-4">
                  {" "}
                  <div className="text-[11px] uppercase text-text-secondary">
                    {" "}
                    {lt("landing.statInstaller")}{" "}
                  </div>{" "}
                  <div className="mt-2 text-3xl font-semibold text-text">
                    {installerSurfaceValue}
                  </div>{" "}
                </div>{" "}
                <div className="rounded-lg border border-border bg-surface-subtle px-4 py-4">
                  {" "}
                  <div className="text-[11px] uppercase text-text-secondary">
                    {" "}
                    {lt("landing.statLanguages")}{" "}
                  </div>{" "}
                  <div className="mt-2 text-3xl font-semibold text-text">
                    3
                  </div>{" "}
                </div>{" "}
              </div>{" "}
            </div>{" "}
          </section>{" "}
          <section className="motion-page-enter mt-8 grid gap-4 lg:grid-cols-3">
            {" "}
            {pillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <article
                  key={pillar.title}
                  className={landingPanelClass("readability-wrap card-lift p-5")}
                >
                  {" "}
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface-subtle">
                    {" "}
                    <Icon className="h-5 w-5 text-accent" />{" "}
                  </div>{" "}
                  <h2 className="mt-4 text-xl font-semibold text-text">
                    {pillar.title}
                  </h2>{" "}
                  <p className="mt-3 text-[14px] leading-6 text-text-secondary">
                    {pillar.text}
                  </p>{" "}
                </article>
              );
            })}{" "}
          </section>{" "}
          <section className="motion-page-enter mt-8 grid gap-4 lg:grid-cols-[1fr_1fr]">
            {" "}
            <article className={landingPanelClass("p-6")}>
              {" "}
              <div className="page-eyebrow">
                {lt("landing.rolesTitle")}
              </div>{" "}
              <div className="mt-5 grid gap-4">
                {" "}
                <div className="rounded-lg border border-border bg-surface-subtle p-4">
                  {" "}
                  <div className="text-lg font-semibold text-text">
                    {" "}
                    {lt("landing.roleAdminTitle")}{" "}
                  </div>{" "}
                  <p className="mt-2 text-[14px] leading-6 text-text-secondary">
                    {" "}
                    {lt("landing.roleAdminText")}{" "}
                  </p>{" "}
                </div>{" "}
                <div className="rounded-lg border border-border bg-surface-subtle p-4">
                  {" "}
                  <div className="text-lg font-semibold text-text">
                    {" "}
                    {lt("landing.roleInstallerTitle")}{" "}
                  </div>{" "}
                  <p className="mt-2 text-[14px] leading-6 text-text-secondary">
                    {" "}
                    {lt("landing.roleInstallerText")}{" "}
                  </p>{" "}
                </div>{" "}
              </div>{" "}
            </article>{" "}
            <article className={landingPanelClass("p-6")}>
              {" "}
              <div className="page-eyebrow">
                {lt("landing.proofTitle")}
              </div>{" "}
              <div className="mt-5 grid gap-3">
                {" "}
                {proofPoints.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-lg border border-border bg-surface-subtle px-4 py-4"
                  >
                    {" "}
                    <Globe2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />{" "}
                    <div className="text-[14px] leading-6 text-text">
                      {item}
                    </div>{" "}
                  </div>
                ))}{" "}
              </div>{" "}
            </article>{" "}
          </section>{" "}
          <section className="motion-page-enter mt-8 grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
            {" "}
            <article className={landingPanelClass("p-6")}>
              {" "}
              <div className="page-eyebrow">
                {lt("landing.previewTitle")}
              </div>{" "}
              <div className="mt-3 max-w-2xl text-[14px] leading-6 text-text-secondary">
                {" "}
                {lt("landing.previewText")}{" "}
              </div>{" "}
              <div className="mt-6 grid gap-4 xl:grid-cols-3">
                {" "}
                {routePreviews.map((item) => (
                  <div
                    key={item.route}
                    className="card-lift overflow-hidden rounded-lg border border-border bg-surface"
                  >
                    {" "}
                    <div className="relative h-32 border-b border-border bg-surface-subtle">
                      {" "}
                      <div className="absolute inset-0 shell-grid opacity-20" />{" "}
                      <div className="absolute start-4 top-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-medium text-text">
                        {" "}
                        <Sparkles className="h-3.5 w-3.5 text-accent" />{" "}
                        {lt("landing.secureRoute")}{" "}
                      </div>{" "}
                      <div className="absolute bottom-4 start-4 end-4 rounded-lg border border-border bg-surface px-4 py-3">
                        {" "}
                        <div className="text-[11px] uppercase text-text-secondary">
                          {" "}
                          {lt("landing.openRoute")}{" "}
                        </div>{" "}
                        <div className="mt-1 font-mono text-sm text-text">
                          {item.route}
                        </div>{" "}
                      </div>{" "}
                    </div>{" "}
                    <div className="p-5">
                      {" "}
                      <div className="text-lg font-semibold text-text">
                        {item.title}
                      </div>{" "}
                      <p className="mt-2 text-[14px] leading-6 text-text-secondary">
                        {item.text}
                      </p>{" "}
                      <Link
                        href={item.href}
                        className="mt-5 inline-flex items-center gap-2 text-[13px] font-medium text-accent"
                      >
                        {" "}
                        {lt("landing.openRoute")}{" "}
                        <ArrowRight className="h-4 w-4" />{" "}
                      </Link>{" "}
                    </div>{" "}
                  </div>
                ))}{" "}
              </div>{" "}
            </article>{" "}
            <article className={landingPanelClass("p-6")}>
              {" "}
              <div className="page-eyebrow">{lt("landing.demoTitle")}</div>{" "}
              <div className="mt-5 grid gap-3">
                {" "}
                {demoSteps.map((step) => (
                  <div
                    key={step}
                    className="rounded-lg border border-border bg-surface-subtle px-4 py-4 text-[14px] leading-6 text-text"
                  >
                    {" "}
                    {step}{" "}
                  </div>
                ))}{" "}
              </div>{" "}
            </article>{" "}
          </section>{" "}
          <section className="motion-page-enter mt-8 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            {" "}
            <article className={landingPanelClass("p-6")}>
              {" "}
              <div className="page-eyebrow">
                {lt("landing.trustTitle")}
              </div>{" "}
              <p className="mt-3 max-w-3xl text-[14px] leading-6 text-text-secondary">
                {" "}
                {lt("landing.trustText")}{" "}
              </p>{" "}
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {" "}
                {trustMetrics.map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-border bg-surface-subtle px-4 py-4"
                  >
                    {" "}
                    <div className="text-[11px] uppercase text-text-secondary">
                      {" "}
                      {label}{" "}
                    </div>{" "}
                    <div className="mt-2 text-2xl font-semibold text-text">
                      {value}
                    </div>{" "}
                  </div>
                ))}{" "}
              </div>{" "}
              <div className="mt-6 grid gap-4 xl:grid-cols-3">
                {" "}
                {trustSignals.map((signal) => {
                  const Icon = signal.icon;
                  return (
                    <div
                      key={signal.title}
                      className="rounded-lg border border-border bg-surface p-5"
                    >
                      {" "}
                      <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface-subtle">
                        {" "}
                        <Icon className="h-5 w-5 text-accent" />{" "}
                      </div>{" "}
                      <div className="mt-4 text-lg font-semibold text-text">
                        {signal.title}
                      </div>{" "}
                      <p className="mt-2 text-[14px] leading-6 text-text-secondary">
                        {" "}
                        {signal.text}{" "}
                      </p>{" "}
                    </div>
                  );
                })}{" "}
              </div>{" "}
            </article>{" "}
            <article className={landingPanelClass("p-6")}>
              {" "}
              <div className="page-eyebrow">
                {lt("landing.accessTitle")}
              </div>{" "}
              <div className="mt-5 grid gap-4">
                {" "}
                <div className="rounded-lg border border-border bg-surface-subtle p-4">
                  {" "}
                  <div className="text-lg font-semibold text-text">
                    {" "}
                    {lt("landing.accessAdminTitle")}{" "}
                  </div>{" "}
                  <p className="mt-2 text-[14px] leading-6 text-text-secondary">
                    {" "}
                    {lt("landing.accessAdminText")}{" "}
                  </p>{" "}
                  <Link
                    href="/login?next=/operations"
                    className="mt-4 inline-flex items-center gap-2 text-[13px] font-medium text-accent"
                  >
                    {" "}
                    {lt("landing.openRoute")}{" "}
                    <ArrowRight className="h-4 w-4" />{" "}
                  </Link>{" "}
                </div>{" "}
                <div className="rounded-lg border border-border bg-surface-subtle p-4">
                  {" "}
                  <div className="text-lg font-semibold text-text">
                    {" "}
                    {lt("landing.accessInstallerTitle")}{" "}
                  </div>{" "}
                  <p className="mt-2 text-[14px] leading-6 text-text-secondary">
                    {" "}
                    {lt("landing.accessInstallerText")}{" "}
                  </p>{" "}
                  <Link
                    href="/login?next=/installer"
                    className="mt-4 inline-flex items-center gap-2 text-[13px] font-medium text-accent"
                  >
                    {" "}
                    {lt("landing.openRoute")}{" "}
                    <ArrowRight className="h-4 w-4" />{" "}
                  </Link>{" "}
                </div>{" "}
              </div>{" "}
            </article>{" "}
          </section>{" "}
          <section className="motion-page-enter mt-8">
            {" "}
            <article className={landingPanelClass("p-6")}>
              {" "}
              <div className="page-eyebrow">
                {lt("landing.architectureTitle")}
              </div>{" "}
              <p className="mt-3 max-w-3xl text-[14px] leading-6 text-text-secondary">
                {" "}
                {lt("landing.architectureText")}{" "}
              </p>{" "}
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {" "}
                {architectureModules.map((module) => {
                  const Icon = module.icon;
                  return (
                    <div
                      key={module.title}
                      className="rounded-lg border border-border bg-surface p-5"
                    >
                      {" "}
                      <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface-subtle">
                        {" "}
                        <Icon className="h-5 w-5 text-accent" />{" "}
                      </div>{" "}
                      <div className="mt-4 text-lg font-semibold text-text">
                        {module.title}
                      </div>{" "}
                      <p className="mt-2 text-[14px] leading-6 text-text-secondary">
                        {" "}
                        {module.text}{" "}
                      </p>{" "}
                    </div>
                  );
                })}{" "}
              </div>{" "}
            </article>{" "}
          </section>{" "}
          <section className="motion-page-enter mt-8">
            {" "}
            <article className={landingPanelClass("p-6")}>
              {" "}
              <div className="page-eyebrow">
                {lt("landing.useCasesTitle")}
              </div>{" "}
              <p className="mt-3 max-w-3xl text-[14px] leading-6 text-text-secondary">
                {" "}
                {lt("landing.useCasesText")}{" "}
              </p>{" "}
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {" "}
                {useCases.map((useCase) => (
                  <div
                    key={useCase.title}
                    className="rounded-lg border border-border bg-surface p-5"
                  >
                    {" "}
                    <div className="text-xl font-semibold text-text">
                      {useCase.title}
                    </div>{" "}
                    <div className="mt-4 grid gap-3">
                      {" "}
                      {useCase.steps.map((step) => (
                        <div
                          key={step}
                          className="rounded-lg border border-border bg-surface-subtle px-4 py-4 text-[14px] leading-6 text-text"
                        >
                          {" "}
                          {step}{" "}
                        </div>
                      ))}{" "}
                    </div>{" "}
                    <Link
                      href={useCase.href}
                      className="mt-5 inline-flex items-center gap-2 text-[13px] font-medium text-accent"
                    >
                      {" "}
                      {lt("landing.openRoute")}{" "}
                      <ArrowRight className="h-4 w-4" />{" "}
                    </Link>{" "}
                  </div>
                ))}{" "}
              </div>{" "}
            </article>{" "}
          </section>{" "}
          <section className="motion-page-enter mt-8">
            {" "}
            <article className={landingPanelClass("p-6")}>
              {" "}
              <div className="page-eyebrow">
                {lt("landing.readinessTitle")}
              </div>{" "}
              <div className="mt-3 grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
                {" "}
                <div>
                  {" "}
                  <p className="max-w-3xl text-[14px] leading-6 text-text-secondary">
                    {" "}
                    {lt("landing.readinessText")}{" "}
                  </p>{" "}
                  <p className="mt-4 text-[14px] leading-6 text-text">
                    {" "}
                    {lt("landing.readinessDocs")}{" "}
                  </p>{" "}
                </div>{" "}
                <div className="grid gap-3 sm:grid-cols-3">
                  {" "}
                  {readinessMetrics.map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-lg border border-border bg-surface-subtle px-4 py-4"
                    >
                      {" "}
                      <div className="text-[11px] uppercase text-text-secondary">
                        {" "}
                        {label}{" "}
                      </div>{" "}
                      <div className="mt-2 text-lg font-semibold text-text">
                        {value}
                      </div>{" "}
                    </div>
                  ))}{" "}
                </div>{" "}
              </div>{" "}
              <div className="mt-6 flex flex-wrap gap-3">
                {" "}
                <Link
                  href="/login"
                  className="btn-premium h-11 rounded-lg px-4 text-[13px] font-medium"
                >
                  {" "}
                  {lt("landing.readinessPrimaryCta")}{" "}
                </Link>{" "}
                <Link
                  href="/login?next=/installer"
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-surface-subtle px-4 text-[13px] font-medium text-text"
                >
                  {" "}
                  {lt("landing.readinessSecondaryCta")}{" "}
                </Link>{" "}
              </div>{" "}
            </article>{" "}
          </section>{" "}
          <section className="motion-page-enter mt-8 grid gap-4 lg:grid-cols-[1fr_1fr]">
            {" "}
            <article className={landingPanelClass("p-6")}>
              {" "}
              <div className="page-eyebrow">{lt("landing.fitTitle")}</div>{" "}
              <p className="mt-3 max-w-3xl text-[14px] leading-6 text-text-secondary">
                {" "}
                {lt("landing.fitText")}{" "}
              </p>{" "}
              <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                {" "}
                <div className="rounded-lg border border-border bg-surface p-5">
                  {" "}
                  <div className="text-lg font-semibold text-text">
                    {lt("landing.fitForTitle")}
                  </div>{" "}
                  <div className="mt-4 grid gap-3">
                    {" "}
                    {fitFor.map((item) => (
                      <div
                        key={item}
                        className="rounded-lg border border-border bg-surface-subtle px-4 py-4 text-[14px] leading-6 text-text"
                      >
                        {" "}
                        {item}{" "}
                      </div>
                    ))}{" "}
                  </div>{" "}
                </div>{" "}
                <div className="rounded-lg border border-border bg-surface p-5">
                  {" "}
                  <div className="text-lg font-semibold text-text">
                    {lt("landing.fitNotTitle")}
                  </div>{" "}
                  <div className="mt-4 grid gap-3">
                    {" "}
                    {fitNotFor.map((item) => (
                      <div
                        key={item}
                        className="rounded-lg border border-border bg-surface-subtle px-4 py-4 text-[14px] leading-6 text-text-secondary"
                      >
                        {" "}
                        {item}{" "}
                      </div>
                    ))}{" "}
                  </div>{" "}
                </div>{" "}
              </div>{" "}
            </article>{" "}
          </section>{" "}
          <section className="motion-page-enter mt-8">
            {" "}
            <div className={landingPanelClass("overflow-hidden p-6")}>
              {" "}
              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
                {" "}
                <div className="max-w-2xl">
                  {" "}
                  <div className="page-eyebrow">
                    {lt("landing.finalTitle")}
                  </div>{" "}
                  <div className="mt-3 text-2xl font-semibold text-text">
                    {" "}
                    {lt("landing.closingTitle")}{" "}
                  </div>{" "}
                  <p className="mt-3 text-[14px] leading-6 text-text-secondary">
                    {" "}
                    {lt("landing.closingText")}{" "}
                  </p>{" "}
                  <p className="mt-3 text-[14px] leading-6 text-text-secondary">
                    {" "}
                    {lt("landing.finalText")}{" "}
                  </p>{" "}
                </div>{" "}
                <div className="rounded-lg border border-border bg-surface p-5">
                  {" "}
                  <div className="text-[11px] uppercase text-text-secondary">
                    {" "}
                    {lt("landing.secureRoute")}{" "}
                  </div>{" "}
                  <div className="mt-2 font-mono text-sm text-text">/login</div>{" "}
                  <div className="mt-5 flex flex-wrap gap-3">
                    {" "}
                    <Link
                      href="/login"
                      className="btn-premium h-11 rounded-lg px-4 text-[13px] font-medium"
                    >
                      {" "}
                      {lt("landing.closingPrimaryCta")}{" "}
                    </Link>{" "}
                    <Link
                      href="/login?next=/installer"
                      className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-surface-subtle px-4 text-[13px] font-medium text-text"
                    >
                      {" "}
                      {lt("landing.closingSecondaryCta")}{" "}
                    </Link>{" "}
                  </div>{" "}
                </div>{" "}
              </div>{" "}
            </div>{" "}
          </section>{" "}
        </main>{" "}
      </div>{" "}
    </div>
  );
}
