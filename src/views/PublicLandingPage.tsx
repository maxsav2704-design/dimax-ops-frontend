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
import { useI18n, type Locale } from "@/lib/i18n";

const landingOverrides: Partial<Record<Locale, Record<string, string>>> = {
  ru: {
    "landing.eyebrow": "DIMAX Operations Suite",
    "landing.title": "Операционный контроль для админ-команд и монтажников в одной системе.",
    "landing.subtitle":
      "Премиальный командный слой для восстановления проектов, работы монтажников, диагностики доставки и управленческой отчётности.",
    "landing.primaryCta": "Открыть защищённый вход",
    "landing.secondaryCta": "Открыть web-кабинет монтажника",
    "landing.statAdmin": "Admin-контуры",
    "landing.statInstaller": "Поток монтажника",
    "landing.statLanguages": "Языки",
    "landing.pillarOpsTitle": "Центр операций",
    "landing.pillarOpsText": "Импорт, outbox, webhook-диагностика, retry и восстановление очередей в одном обзоре.",
    "landing.pillarReportsTitle": "Связка с отчётностью",
    "landing.pillarReportsText":
      "Управленческая аналитика, напрямую связанная с действиями, preset-сценариями и операционным drilldown.",
    "landing.pillarInstallerTitle": "Веб-кабинет монтажника",
    "landing.pillarInstallerText":
      "Workspace, расписание, исполнение по проекту и continuity по issue без зависимости от mobile-приложения.",
    "landing.rolesTitle": "Один продукт, два рабочих режима",
    "landing.roleAdminTitle": "Для admin / dispatch",
    "landing.roleAdminText":
      "Контроль портфеля, импорты, коммуникации, ставки, проблемы, отчёты и recovery-процессы.",
    "landing.roleInstallerTitle": "Для монтажников",
    "landing.roleInstallerText":
      "Приоритеты дня, deep-link расписание, контекст двери и triage проблем с сохранением языка.",
    "landing.proofTitle": "Основа, готовая к эксплуатации",
    "landing.proofTesting": "Quality gates, integration coverage и strict installer e2e",
    "landing.proofI18n": "Английский, русский и иврит с поддержкой RTL",
    "landing.proofGovernance":
      "Защищённый workflow с branch guards, PR templates и release discipline",
    "landing.previewTitle": "Посмотри продуктовые маршруты до входа",
    "landing.previewText":
      "Краткий обзор тех admin и installer-маршрутов, которыми команда пользуется каждый день.",
    "landing.previewOpsTitle": "Центр операций",
    "landing.previewOpsText":
      "Давление очередей, webhook-сигналы, recovery-действия и delivery lanes в одном командном обзоре.",
    "landing.previewOpsRoute": "/operations",
    "landing.previewReportsTitle": "Отчёты",
    "landing.previewReportsText":
      "Фокусные отчёты, связанные с recovery-действиями, preset-сценариями и операционным drilldown.",
    "landing.previewReportsRoute": "/reports",
    "landing.previewInstallerTitle": "Веб-кабинет монтажника",
    "landing.previewInstallerText":
      "Приоритеты дня, continuity расписания и работа по проекту без потери полевого контекста.",
    "landing.previewInstallerRoute": "/installer",
    "landing.openRoute": "Открыть маршрут",
    "landing.secureRoute": "Защищённый маршрут",
    "landing.demoTitle": "Как устроен demo-flow",
    "landing.demoStepOne": "1. Публичный landing объясняет продуктовые контуры и разделение ролей.",
    "landing.demoStepTwo": "2. Защищённый login изолирует admin и installer workspace.",
    "landing.demoStepThree": "3. Deep-link вход открывает точный рабочий маршрут после авторизации.",
    "landing.trustTitle": "Признаки реально зрелой системы",
    "landing.trustText":
      "Публичный слой должен показывать уверенность продукта, release-дисциплину и role-aware вход ещё до первого защищённого клика.",
    "landing.trustMetricQuality": "Базовый quality gate",
    "landing.trustMetricQualityValue": "100%",
    "landing.trustMetricLocales": "Локализованные UI-контуры",
    "landing.trustMetricLocalesValue": "EN / RU / HE",
    "landing.trustMetricPreview": "Preview-вход",
    "landing.trustMetricPreviewValue": "/welcome",
    "landing.signalOneTitle": "Release-grade flow",
    "landing.signalOneText":
      "Защищённые admin и installer маршруты остаются за login, а публичная страница объясняет продуктовый контур.",
    "landing.signalTwoTitle": "Операционная глубина",
    "landing.signalTwoText":
      "Operations, reports, очереди, recovery и installer execution уже связаны deep-link переходами.",
    "landing.signalThreeTitle": "Demo-ready entry",
    "landing.signalThreeText":
      "Одна публичная страница показывает продукт и сразу ведёт зрителя в точный защищённый workspace.",
    "landing.accessTitle": "Demo-доступ по ролям",
    "landing.accessAdminTitle": "Admin-маршрут",
    "landing.accessAdminText":
      "Через защищённый login открываются operations, reports, projects и recovery lanes.",
    "landing.accessInstallerTitle": "Маршрут монтажника",
    "landing.accessInstallerText":
      "Через защищённый login с installer-учёткой открываются workspace, календарь и project execution.",
    "landing.architectureTitle": "Ключевая архитектура продукта",
    "landing.architectureText":
      "Публичный слой должен показывать и реальную модульную глубину продукта за login-стеной.",
    "landing.archProjectsTitle": "Проекты",
    "landing.archProjectsText":
      "Import runs, финансовый контроль, reconcile flow и видимость layout на уровне дверей.",
    "landing.archIssuesTitle": "Проблемы",
    "landing.archIssuesText":
      "Issue workflow, ownership, due dates и triage-экраны, связанные с исполнением проекта.",
    "landing.archJournalTitle": "Журнал",
    "landing.archJournalText":
      "Коммуникационная очередь, retry-контроль, шаблоны и provider-aware сопровождение доставки.",
    "landing.archInstallersTitle": "Монтажники",
    "landing.archInstallersText":
      "Installer board, ставки, sync-context и web execution surfaces для полевых команд.",
    "landing.useCasesTitle": "Два реальных рабочих дня внутри продукта",
    "landing.useCasesText":
      "Самая сильная demo-подача — не список функций, а правдоподобная последовательность работы от сигнала к действию.",
    "landing.useCaseAdminTitle": "День admin recovery",
    "landing.useCaseAdminStepOne":
      "Начать в Operations Center и выделить actionable-давление по import, outbox и webhook.",
    "landing.useCaseAdminStepTwo":
      "Перейти в focused reports и подтвердить точный scope до retry или reconcile.",
    "landing.useCaseAdminStepThree":
      "Вернуться в queue controls, выполнить recovery и сохранить audit-видимость в том же операционном цикле.",
    "landing.useCaseInstallerTitle": "День монтажника",
    "landing.useCaseInstallerStepOne":
      "Открыть web workspace и увидеть приоритеты дня, problem-проекты и давление по задачам.",
    "landing.useCaseInstallerStepTwo":
      "Перейти через schedule и project details с continuity по issue, door filters и priority shortcuts.",
    "landing.useCaseInstallerStepThree":
      "Закончить полевые действия в контексте, не теряя активную дверь, проблему или schedule lane.",
    "landing.readinessTitle": "Готовность к demo и deploy",
    "landing.readinessText":
      "Этот публичный front door опирается на мультиязычный UI, защищённую маршрутизацию и воспроизводимый preview baseline.",
    "landing.readinessPreview": "Preview baseline",
    "landing.readinessPreviewValue": "localhost:5174",
    "landing.readinessI18n": "Готовность локализации",
    "landing.readinessI18nValue": "EN / RU / HE + RTL",
    "landing.readinessRelease": "Release-дисциплина",
    "landing.readinessReleaseValue": "quality-gated",
    "landing.readinessDocs": "Staging handoff и deploy docs уже подготовлены в workspace-слое.",
    "landing.readinessPrimaryCta": "Открыть защищённый demo-вход",
    "landing.readinessSecondaryCta": "Показать путь монтажника",
    "landing.fitTitle": "Для кого это сделано",
    "landing.fitText":
      "Продукт сильнее всего там, где команде нужен операционный контроль, быстрый recovery и чёткое разделение ролей.",
    "landing.fitForTitle": "Подходит лучше всего",
    "landing.fitForOne":
      "Admin-командам, которые ведут imports, reports, delivery lanes и recovery из единой command-поверхности.",
    "landing.fitForTwo":
      "Командам монтажников, которым нужен web-first execution без потери issue, door или schedule-контекста.",
    "landing.fitForThree":
      "Операторам, которым нужен мультиязычный доступ, строгая маршрутизация и demo-ready flow без переделки core app.",
    "landing.fitNotTitle": "Не для этого",
    "landing.fitNotOne": "Команд, которым нужен просто brochure-site без операционной глубины за ним.",
    "landing.fitNotTwo":
      "Процессов, где не нужны role-aware recovery, visibility по очередям и continuity полевого исполнения.",
    "landing.finalTitle": "Готово для demo, staging и роста продукта",
    "landing.finalText":
      "Используй этот слой как публичную точку входа, сохраняя операционное приложение изолированным за защищённым login.",
    "landing.closingTitle": "Показывай продукт людям, не открывая control plane наружу.",
    "landing.closingText":
      "Публичный landing задаёт историю, а затем переводит зрителя в защищённый admin или installer путь с уже подготовленным точным маршрутом.",
    "landing.closingPrimaryCta": "Войти в admin flow",
    "landing.closingSecondaryCta": "Войти в путь монтажника",
  },
  he: {
    "landing.eyebrow": "DIMAX Operations Suite",
    "landing.title": "שליטה תפעולית לצוותי אדמין ולמתקינים במערכת אחת.",
    "landing.subtitle":
      "שכבת פיקוד פרימיום לשיקום פרויקטים, עבודה למתקינים, דיאגנוסטיקת משלוחים ודוחות ניהוליים.",
    "landing.primaryCta": "פתח כניסה מאובטחת",
    "landing.secondaryCta": "פתח את ממשק המתקין",
    "landing.statAdmin": "מסכי אדמין",
    "landing.statInstaller": "זרימת מתקין",
    "landing.statLanguages": "שפות",
    "landing.pillarOpsTitle": "מרכז התפעול",
    "landing.pillarOpsText": "ייבוא, outbox, דיאגנוסטיקת webhook, retry ושחזור תורים במשטח אחד.",
    "landing.pillarReportsTitle": "חיבור לדוחות",
    "landing.pillarReportsText": "אנליטיקה ניהולית שמחוברת ישירות לפעולות, presets ו-drilldown תפעולי.",
    "landing.pillarInstallerTitle": "ממשק המתקין",
    "landing.pillarInstallerText":
      "Workspace, לוח זמנים, ביצוע פרויקט ורצף תקלות בלי תלות באפליקציית מובייל.",
    "landing.rolesTitle": "מוצר אחד, שני מצבי עבודה",
    "landing.roleAdminTitle": "עבור Admin / Dispatch",
    "landing.roleAdminText":
      "שליטה בתיק הפרויקטים, imports, תקשורת, תעריפים, תקלות, דוחות ותהליכי recovery.",
    "landing.roleInstallerTitle": "עבור מתקינים",
    "landing.roleInstallerText":
      "עדיפויות יומיות, לוח זמנים עם deep-link, הקשר דלת ו-triage לתקלות עם שימור שפה.",
    "landing.proofTitle": "בסיס שמוכן להפעלה",
    "landing.proofTesting": "Quality gates, כיסוי אינטגרציה ו-strict installer e2e",
    "landing.proofI18n": "אנגלית, רוסית ועברית עם תמיכת RTL",
    "landing.proofGovernance": "Workflow מוגן עם branch guards, תבניות PR ומשמעת release",
    "landing.previewTitle": "ראה את מסלולי המוצר לפני ההתחברות",
    "landing.previewText": "סקירה קצרה של מסכי ה-admin וה-installer שבהם הצוות משתמש בכל יום.",
    "landing.previewOpsTitle": "מרכז התפעול",
    "landing.previewOpsText": "לחצי תורים, אותות webhook, פעולות recovery ונתיבי delivery במסך פיקוד אחד.",
    "landing.previewOpsRoute": "/operations",
    "landing.previewReportsTitle": "דוחות",
    "landing.previewReportsText": "דוחות ממוקדים שמחוברים לפעולות recovery, presets ו-drilldown תפעולי.",
    "landing.previewReportsRoute": "/reports",
    "landing.previewInstallerTitle": "ממשק המתקין",
    "landing.previewInstallerText": "עדיפויות יומיות, רצף לוח זמנים ועבודה על פרויקט בלי לאבד הקשר שטח.",
    "landing.previewInstallerRoute": "/installer",
    "landing.openRoute": "פתח מסלול",
    "landing.secureRoute": "מסלול מאובטח",
    "landing.demoTitle": "איך ה-demo flow עובד",
    "landing.demoStepOne": "1. דף הנחיתה הציבורי מסביר את מסלולי המוצר ואת פיצול התפקידים.",
    "landing.demoStepTwo": "2. ה-login המאובטח מבודד את סביבות העבודה של admin ושל installer.",
    "landing.demoStepThree": "3. כניסה עם deep-link פותחת את המסלול המדויק לאחר האימות.",
    "landing.trustTitle": "הוכחה לבשלות תפעולית אמיתית",
    "landing.trustText":
      "השכבה הציבורית צריכה להראות בטחון מוצרי, משמעת release וכניסה לפי תפקיד עוד לפני הקליק המאובטח הראשון.",
    "landing.trustMetricQuality": "Baseline של quality gate",
    "landing.trustMetricQualityValue": "100%",
    "landing.trustMetricLocales": "מסכי UI מתורגמים",
    "landing.trustMetricLocalesValue": "EN / RU / HE",
    "landing.trustMetricPreview": "נתיב preview",
    "landing.trustMetricPreviewValue": "/welcome",
    "landing.signalOneTitle": "Release-grade flow",
    "landing.signalOneText":
      "מסלולי admin ו-installer המאובטחים נשארים מאחורי login, בעוד שהעמוד הציבורי מסביר את נרטיב המוצר.",
    "landing.signalTwoTitle": "עומק תפעולי",
    "landing.signalTwoText":
      "Operations, reports, תורים, recovery ו-execution למתקין כבר מחוברים דרך deep-links.",
    "landing.signalThreeTitle": "Demo-ready entry",
    "landing.signalThreeText":
      "עמוד ציבורי אחד מציג את המוצר ומוביל את הצופה ישירות למרחב העבודה המאובטח הנכון.",
    "landing.accessTitle": "גישה לדמו לפי תפקיד",
    "landing.accessAdminTitle": "מסלול Admin",
    "landing.accessAdminText": "דרך login מאובטח ממשיכים ל-operations, reports, projects ו-recovery lanes.",
    "landing.accessInstallerTitle": "מסלול מתקין",
    "landing.accessInstallerText": "דרך login מאובטח עם משתמש installer ממשיכים ל-workspace, calendar ו-project execution.",
    "landing.architectureTitle": "ארכיטקטורת המוצר המרכזית",
    "landing.architectureText": "השכבה הציבורית צריכה להראות גם את עומק המודולים האמיתי שמאחורי חומת ה-login.",
    "landing.archProjectsTitle": "Projects",
    "landing.archProjectsText": "Import runs, בקרה פיננסית, reconcile flow ונראות layout ברמת הדלת.",
    "landing.archIssuesTitle": "Issues",
    "landing.archIssuesText": "Issue workflow, ownership, due dates ומסכי triage שמחוברים לביצוע הפרויקט.",
    "landing.archJournalTitle": "Journal",
    "landing.archJournalText": "תור תקשורת, בקרת retry, תבניות ומעקב delivery לפי provider.",
    "landing.archInstallersTitle": "Installers",
    "landing.archInstallersText": "Installer board, תעריפים, sync context ומשטחי web execution לצוותי שטח.",
    "landing.useCasesTitle": "שני ימי עבודה אמיתיים בתוך המוצר",
    "landing.useCasesText": "הדמו החזק ביותר הוא לא רשימת יכולות, אלא רצף עבודה אמין מהאות ועד לפעולה.",
    "landing.useCaseAdminTitle": "יום recovery של admin",
    "landing.useCaseAdminStepOne": "להתחיל ב-Operations Center ולבודד לחץ actionable של import, outbox ו-webhook.",
    "landing.useCaseAdminStepTwo": "לעבור ל-focused reports ולאמת את ה-scope המדויק לפני retry או reconcile.",
    "landing.useCaseAdminStepThree": "לחזור ל-queue controls, להריץ recovery ולשמור audit visibility בתוך אותו לופ תפעולי.",
    "landing.useCaseInstallerTitle": "יום execution של מתקין",
    "landing.useCaseInstallerStepOne": "לפתוח את ה-web workspace ולזהות עדיפויות יומיות, פרויקטים בעייתיים ולחץ משימות.",
    "landing.useCaseInstallerStepTwo": "לעבור דרך schedule ו-project details עם issue continuity, door filters ו-priority shortcuts.",
    "landing.useCaseInstallerStepThree": "לסיים פעולות שטח בתוך ההקשר בלי לאבד את הדלת, התקלה או נתיב ה-schedule הפעיל.",
    "landing.readinessTitle": "מוכנות ל-demo ול-deploy",
    "landing.readinessText": "הדלת הציבורית הזו נשענת על UI רב-לשוני, ניתוב מאובטח ו-baseline שחזורי של preview.",
    "landing.readinessPreview": "Preview baseline",
    "landing.readinessPreviewValue": "localhost:5174",
    "landing.readinessI18n": "מוכנות לוקליזציה",
    "landing.readinessI18nValue": "EN / RU / HE + RTL",
    "landing.readinessRelease": "משמעת release",
    "landing.readinessReleaseValue": "quality-gated",
    "landing.readinessDocs": "מסמכי staging handoff ו-deploy כבר מוכנים בשכבת ה-workspace.",
    "landing.readinessPrimaryCta": "פתח כניסת demo מאובטחת",
    "landing.readinessSecondaryCta": "הצג את נתיב המתקין",
    "landing.fitTitle": "למי זה מתאים",
    "landing.fitText": "המוצר חזק ביותר כאשר הצוות צריך שליטה תפעולית, recovery מהיר והפרדת תפקידים ברורה.",
    "landing.fitForTitle": "התאמה מיטבית",
    "landing.fitForOne": "לצוותי admin שמריצים imports, reports, delivery lanes ו-recovery ממסך פיקוד אחד.",
    "landing.fitForTwo": "לצוותי מתקינים שצריכים execution מבוסס-web בלי לאבד הקשר של issue, door או schedule.",
    "landing.fitForThree": "למפעילים שצריכים גישה רב-לשונית, ניתוב קשיח ו-demo-ready flow בלי לשכתב את אפליקציית הליבה.",
    "landing.fitNotTitle": "לא מתאים עבור",
    "landing.fitNotOne": "צוותים שמחפשים רק אתר תדמית בלי עומק תפעולי מאחוריו.",
    "landing.fitNotTwo": "תהליכים שלא צריכים role-aware recovery, נראות תורים או רצף execution בשטח.",
    "landing.finalTitle": "מוכן ל-demo, staging וצמיחת המוצר",
    "landing.finalText": "השתמש בשכבה הזו כנקודת הכניסה הציבורית, תוך שמירה על האפליקציה התפעולית מאחורי login מאובטח.",
    "landing.closingTitle": "להציג את המוצר בלי לחשוף את מישור השליטה החוצה.",
    "landing.closingText": "דף הנחיתה הציבורי מספר את הסיפור ואז מעביר את הצופה למסלול admin או installer מאובטח כשהנתיב המדויק כבר מוכן.",
    "landing.closingPrimaryCta": "כניסה ל-admin flow",
    "landing.closingSecondaryCta": "כניסה למסלול המתקין",
  },
};

export default function PublicLandingPage() {
  const { locale, t } = useI18n();

  const lt = (key: string) => landingOverrides[locale]?.[key] ?? t(key);

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
      accent: "from-[hsl(var(--accent)/0.22)] via-transparent to-transparent",
    },
    {
      title: lt("landing.previewReportsTitle"),
      text: lt("landing.previewReportsText"),
      route: lt("landing.previewReportsRoute"),
      href: "/login?next=/reports",
      accent: "from-[hsl(var(--primary)/0.16)] via-transparent to-transparent",
    },
    {
      title: lt("landing.previewInstallerTitle"),
      text: lt("landing.previewInstallerText"),
      route: lt("landing.previewInstallerRoute"),
      href: "/login?next=/installer",
      accent: "from-[hsl(var(--accent)/0.14)] via-transparent to-transparent",
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
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,hsl(var(--accent)/0.16),transparent_32%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)/0.96))]">
      <div className="pointer-events-none absolute inset-0 shell-grid opacity-25" />
      <div className="pointer-events-none absolute left-[-10rem] top-[-6rem] h-[26rem] w-[26rem] rounded-full bg-accent/18 blur-3xl" />
      <div className="pointer-events-none absolute right-[-8rem] top-20 h-[24rem] w-[24rem] rounded-full bg-primary/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-[1380px] flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4">
          <div className="page-eyebrow">{lt("landing.eyebrow")}</div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher compact />
            <Link
              href="/login"
              className="btn-premium h-10 rounded-xl px-4 text-[13px] font-medium"
            >
              {lt("landing.primaryCta")}
            </Link>
          </div>
        </header>

        <main className="motion-stagger flex-1 py-8 lg:py-12">
          <section className="page-hero motion-page-enter overflow-hidden">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
              <div className="max-w-3xl">
                <div className="page-eyebrow">{lt("landing.eyebrow")}</div>
                <h1 className="mt-4 max-w-4xl font-display text-4xl tracking-[-0.05em] text-foreground sm:text-5xl lg:text-6xl">
                  {lt("landing.title")}
                </h1>
                <p className="mt-5 max-w-2xl text-[15px] leading-7 text-muted-foreground sm:text-[16px]">
                  {lt("landing.subtitle")}
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    href="/login"
                    className="btn-premium h-12 rounded-2xl px-5 text-[14px] font-semibold"
                  >
                    {lt("landing.primaryCta")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/login?next=/installer"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-border/70 bg-background/70 px-5 text-[14px] font-medium text-foreground"
                  >
                    {lt("landing.secondaryCta")}
                  </Link>
                </div>
              </div>

              <div className="surface-panel grid gap-4 p-5 sm:grid-cols-3">
                <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {lt("landing.statAdmin")}
                  </div>
                  <div className="mt-2 text-3xl font-semibold text-foreground">6+</div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {lt("landing.statInstaller")}
                  </div>
                  <div className="mt-2 text-3xl font-semibold text-foreground">Web</div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {lt("landing.statLanguages")}
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
              <div className="page-eyebrow">{lt("landing.rolesTitle")}</div>
              <div className="mt-5 grid gap-4">
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  <div className="text-lg font-semibold text-foreground">
                    {lt("landing.roleAdminTitle")}
                  </div>
                  <p className="mt-2 text-[14px] leading-6 text-muted-foreground">
                    {lt("landing.roleAdminText")}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  <div className="text-lg font-semibold text-foreground">
                    {lt("landing.roleInstallerTitle")}
                  </div>
                  <p className="mt-2 text-[14px] leading-6 text-muted-foreground">
                    {lt("landing.roleInstallerText")}
                  </p>
                </div>
              </div>
            </article>

            <article className="surface-panel p-6">
              <div className="page-eyebrow">{lt("landing.proofTitle")}</div>
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
              <div className="page-eyebrow">{lt("landing.previewTitle")}</div>
              <div className="mt-3 max-w-2xl text-[14px] leading-6 text-muted-foreground">
                {lt("landing.previewText")}
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
                        {lt("landing.secureRoute")}
                      </div>
                      <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-border/70 bg-background/80 px-4 py-3 backdrop-blur">
                        <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                          {lt("landing.openRoute")}
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
                        {lt("landing.openRoute")}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="surface-panel p-6">
              <div className="page-eyebrow">{lt("landing.demoTitle")}</div>
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
              <div className="page-eyebrow">{lt("landing.trustTitle")}</div>
              <p className="mt-3 max-w-3xl text-[14px] leading-6 text-muted-foreground">
                {lt("landing.trustText")}
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
              <div className="page-eyebrow">{lt("landing.accessTitle")}</div>
              <div className="mt-5 grid gap-4">
                <div className="rounded-2xl border border-border/70 bg-background/72 p-4">
                  <div className="text-lg font-semibold text-foreground">
                    {lt("landing.accessAdminTitle")}
                  </div>
                  <p className="mt-2 text-[14px] leading-6 text-muted-foreground">
                    {lt("landing.accessAdminText")}
                  </p>
                  <Link
                    href="/login?next=/operations"
                    className="mt-4 inline-flex items-center gap-2 text-[13px] font-medium text-accent"
                  >
                    {lt("landing.openRoute")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="rounded-2xl border border-border/70 bg-background/72 p-4">
                  <div className="text-lg font-semibold text-foreground">
                    {lt("landing.accessInstallerTitle")}
                  </div>
                  <p className="mt-2 text-[14px] leading-6 text-muted-foreground">
                    {lt("landing.accessInstallerText")}
                  </p>
                  <Link
                    href="/login?next=/installer"
                    className="mt-4 inline-flex items-center gap-2 text-[13px] font-medium text-accent"
                  >
                    {lt("landing.openRoute")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </article>
          </section>

          <section className="motion-page-enter mt-8">
            <article className="surface-panel p-6">
              <div className="page-eyebrow">{lt("landing.architectureTitle")}</div>
              <p className="mt-3 max-w-3xl text-[14px] leading-6 text-muted-foreground">
                {lt("landing.architectureText")}
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
            <article className="surface-panel p-6">
              <div className="page-eyebrow">{lt("landing.useCasesTitle")}</div>
              <p className="mt-3 max-w-3xl text-[14px] leading-6 text-muted-foreground">
                {lt("landing.useCasesText")}
              </p>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {useCases.map((useCase) => (
                  <div
                    key={useCase.title}
                    className="rounded-[1.6rem] border border-border/70 bg-background/72 p-5"
                  >
                    <div className="text-xl font-semibold text-foreground">{useCase.title}</div>
                    <div className="mt-4 grid gap-3">
                      {useCase.steps.map((step) => (
                        <div
                          key={step}
                          className="rounded-2xl border border-border/70 bg-background/78 px-4 py-4 text-[14px] leading-6 text-foreground"
                        >
                          {step}
                        </div>
                      ))}
                    </div>
                    <Link
                      href={useCase.href}
                      className="mt-5 inline-flex items-center gap-2 text-[13px] font-medium text-accent"
                    >
                      {lt("landing.openRoute")}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="motion-page-enter mt-8">
            <article className="surface-panel p-6">
              <div className="page-eyebrow">{lt("landing.readinessTitle")}</div>
              <div className="mt-3 grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
                <div>
                  <p className="max-w-3xl text-[14px] leading-6 text-muted-foreground">
                    {lt("landing.readinessText")}
                  </p>
                  <p className="mt-4 text-[14px] leading-6 text-foreground">
                    {lt("landing.readinessDocs")}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {readinessMetrics.map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-border/70 bg-background/72 px-4 py-4"
                    >
                      <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        {label}
                      </div>
                      <div className="mt-2 text-lg font-semibold text-foreground">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className="btn-premium h-11 rounded-xl px-4 text-[13px] font-medium"
                >
                  {lt("landing.readinessPrimaryCta")}
                </Link>
                <Link
                  href="/login?next=/installer"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-border/70 bg-background/70 px-4 text-[13px] font-medium text-foreground"
                >
                  {lt("landing.readinessSecondaryCta")}
                </Link>
              </div>
            </article>
          </section>

          <section className="motion-page-enter mt-8 grid gap-4 lg:grid-cols-[1fr_1fr]">
            <article className="surface-panel p-6">
              <div className="page-eyebrow">{lt("landing.fitTitle")}</div>
              <p className="mt-3 max-w-3xl text-[14px] leading-6 text-muted-foreground">
                {lt("landing.fitText")}
              </p>

              <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-[1.5rem] border border-border/70 bg-background/72 p-5">
                  <div className="text-lg font-semibold text-foreground">{lt("landing.fitForTitle")}</div>
                  <div className="mt-4 grid gap-3">
                    {fitFor.map((item) => (
                      <div
                        key={item}
                        className="rounded-2xl border border-border/70 bg-background/78 px-4 py-4 text-[14px] leading-6 text-foreground"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-border/70 bg-background/72 p-5">
                  <div className="text-lg font-semibold text-foreground">{lt("landing.fitNotTitle")}</div>
                  <div className="mt-4 grid gap-3">
                    {fitNotFor.map((item) => (
                      <div
                        key={item}
                        className="rounded-2xl border border-border/70 bg-background/78 px-4 py-4 text-[14px] leading-6 text-muted-foreground"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          </section>

          <section className="motion-page-enter mt-8">
            <div className="surface-panel overflow-hidden p-6">
              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
                <div className="max-w-2xl">
                  <div className="page-eyebrow">{lt("landing.finalTitle")}</div>
                  <div className="mt-3 text-2xl font-semibold text-foreground">
                    {lt("landing.closingTitle")}
                  </div>
                  <p className="mt-3 text-[14px] leading-6 text-muted-foreground">
                    {lt("landing.closingText")}
                  </p>
                  <p className="mt-3 text-[14px] leading-6 text-muted-foreground">
                    {lt("landing.finalText")}
                  </p>
                </div>

                <div className="rounded-[1.5rem] border border-border/70 bg-background/72 p-5">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {lt("landing.secureRoute")}
                  </div>
                  <div className="mt-2 font-mono text-sm text-foreground">/login</div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href="/login"
                      className="btn-premium h-11 rounded-xl px-4 text-[13px] font-medium"
                    >
                      {lt("landing.closingPrimaryCta")}
                    </Link>
                    <Link
                      href="/login?next=/installer"
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-border/70 bg-background/70 px-4 text-[13px] font-medium text-foreground"
                    >
                      {lt("landing.closingSecondaryCta")}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
