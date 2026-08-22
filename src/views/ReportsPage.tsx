import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  BellRing,
  CalendarClock,
  CheckCircle2,
  CheckCheck,
  FileText,
  FolderKanban,
  LineChart,
  Mail,
  MessageSquare,
  Plus,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Star,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { apiDownload, apiFetch } from "@/lib/api";
import { readableApiError } from "@/lib/api-error-display";
import { useAuthSession } from "@/hooks/use-auth-session";
import {
  canAccessAdminModule,
  canRunPrivilegedAdminActions,
  canViewRates,
} from "@/lib/admin-access";
import {
  formatLocaleDateTime as formatLocalizedDateTime,
  formatLocaleNumber as formatLocalizedNumber,
  formatLocalePercent as formatLocalizedPercent,
} from "@/lib/formatting";
import { useI18n, type Locale } from "@/lib/i18n";
import { createRequestLimiter } from "@/lib/request-limiter";
import { cn } from "@/lib/utils";

const LIVE_REPORT_REFRESH_MS = 30_000;
const STANDARD_REPORT_REFRESH_MS = 5 * 60_000;

const reportsOverrides: Record<Locale, Record<string, string>> = {
  en: {
    "reports.notAvailableShort": "n/a",
    "reports.openInProjects": "Open in Projects",
    "reports.noFailingProjectsCurrentWindow":
      "No failing projects in current window.",
    "reports.healthMetricsPlaybooks": "Health metrics and action playbooks",
    "reports.loadingSlaMetrics": "Loading SLA metrics...",
    "reports.loadingIssuesAnalytics": "Loading issues analytics...",
    "reports.loadingMarginLeakage": "Loading margin leakage...",
    "reports.projectPlanVsFactTitle": "Project Plan vs Fact",
    "reports.projectPlanVsFactSubtitle":
      "Compare planned commercial targets against actual delivery, payroll, and margin performance.",
    "reports.actualMissing": "Actual missing",
    "reports.payroll": "Payroll",
    "reports.profit": "Profit",
    "reports.projectRiskTitle": "Project Risk Drill-down",
    "reports.projectRiskSubtitle":
      "Why the selected project is leaking margin: drivers, stalled reasons and risky orders",
    "reports.loadingProjects": "Loading projects...",
    "reports.loadingProjectRisk": "Loading project risk drill-down...",
    "reports.failedProjectRisk": "Failed to load project risk drill-down",
    "reports.importModes": "Import Modes",
    "reports.analyzeRetry": "Analyze {analyze} | Retry {retry}",
    "reports.outboxRisk": "Outbox Risk",
    "reports.limitAlerts": "Limit Alerts",
    "reports.warnDanger24h": "24h warn {warn} | danger {danger}",
    "reports.topFailingProjectsTitle":
      "Top Failing Projects (7d import errors)",
    "reports.failureRuns": "{count} fails",
    "reports.openShort": "Open",
    "reports.operationsSlaTitle": "Operations SLA",
    "reports.projectMarginExecutiveTitle": "Project Margin Executive",
    "reports.projectMarginExecutiveSubtitle":
      "Top profitable and low-margin projects based on actual realized margin",
    "reports.topMarginProjects": "Top Margin Projects",
    "reports.loadingTopMarginProjects": "Loading top margin projects...",
    "reports.failedTopMarginProjects": "Failed to load top margin projects",
    "reports.noProfitableProjects": "No profitable projects yet.",
    "reports.statusIssues": "Status {status} | Issues {issues}",
    "reports.lowMarginRiskProjects": "Low Margin / Risk Projects",
    "reports.loadingLowMarginProjects": "Loading low-margin projects...",
    "reports.failedLowMarginProjects": "Failed to load low-margin projects",
    "reports.noLowMarginProjects": "No low-margin projects.",
    "reports.completionIssues": "Completion {completion} | Issues {issues}",
    "reports.riskConcentrationTitle": "Risk Concentration",
    "reports.riskConcentrationSubtitle":
      "Where margin risk is currently concentrated across projects, orders and installers",
    "reports.loadingRiskConcentration": "Loading risk concentration...",
    "reports.failedRiskConcentration": "Failed to load risk concentration",
    "reports.delayedProfitLabel": "Delayed Profit",
    "reports.openIssueRisk": "Open issue risk {amount}",
    "reports.blockedIssueRisk": "Blocked Issue Risk",
    "reports.worstInstaller": "Worst installer {amount}",
    "reports.riskyProjectsOrders": "Risky Projects / Orders",
    "reports.worstProject": "Worst project {amount}",
    "reports.revenuePayrollProfit": "Revenue / Payroll / Profit",
    "reports.projectsOrders": "Projects / Orders",
    "reports.installedDoors": "Installed doors: {count}",
    "reports.openIssuesMissingRates": "Open Issues / Missing Rates",
    "reports.lastInstall": "Last install:",
    "reports.addonsImpact": "Addons Impact",
    "reports.addonsProfitMissingPlans":
      "Profit {profit} | Missing plans {count}",
    "reports.openOperationsCenter": "Open Operations Center",
    "reports.openActionableOps": "Open Actionable Ops",
    "reports.loadingCommandCenter": "Loading command center...",
    "reports.issuesAnalyticsTitle": "Issues Analytics",
    "reports.issuesAnalyticsSubtitle":
      "MTTR, overdue pressure and backlog dynamics",
    "reports.marginLeakageTitle": "Margin Leakage",
    "reports.marginLeakageSubtitle":
      "Open issue exposure, stalled reasons and add-on uplift",
    "reports.loadingProjectsForPlanFact": "Loading projects...",
    "reports.preparingPlanFactFilters":
      "Preparing project filters for plan vs fact.",
    "reports.loadingProjectPlanFact": "Loading project plan vs fact...",
    "reports.failedProjectPlanFact": "Failed to load project plan vs fact",
    "reports.failedIssuesAnalytics": "Failed to load issues analytics",
    "reports.openTotal": "Open / Total",
    "reports.overdueRate": "Overdue Rate",
    "reports.overdueOpen": "{count} overdue open",
    "reports.blockedOpen": "Blocked Open",
    "reports.backlogByWorkflow": "Backlog by Workflow",
    "reports.backlogByPriority": "Backlog by Priority",
    "reports.trendLastDays": "Trend (last {days} days)",
    "reports.failedMarginLeakage": "Failed to load margin leakage",
    "reports.openIssuesAtRisk": "Open Issues at Risk",
    "reports.profitAtRisk": "Profit at risk {amount}",
    "reports.blockedMarginRisk": "Blocked Margin Risk",
    "reports.blockedProfit": "Blocked profit {amount}",
    "reports.delayedDoors": "Delayed Doors",
    "reports.delayedProfit": "Delayed profit {amount}",
    "reports.addonUplift": "Add-on Uplift",
    "reports.summary": "Summary",
    "reports.openIssuesExposure": "Open Issues Exposure",
    "reports.delayedNotInstalled": "Delayed Not Installed",
    "reports.addonRealized": "Add-on Realized",
    "reports.delayedByReason": "Delayed by Reason / Defect",
    "reports.noDelayedReasons": "No delayed reasons.",
    "reports.addonProfitImpact": "Add-on Profit Impact",
    "reports.addon": "Add-on",
    "reports.missingPlans": "Missing Plans",
    "reports.noAddonImpactRows": "No add-on impact rows.",
    "reports.installerProfitabilityMatrix": "Installer Profitability Matrix",
    "reports.installerProfitabilitySubtitle":
      "Ranking by money output, margin quality and issue pressure",
    "reports.loadingInstallerProfitability":
      "Loading installer profitability matrix...",
    "reports.projectsAddons": "Projects {projects} | Add-ons {addons}",
    "reports.installerCrossViewTitle": "Installer x Project Cross-view",
    "reports.installerCrossViewSubtitle":
      "Which installer-project combinations create or destroy margin",
    "reports.loadingInstallerCrossView":
      "Loading installer-project cross-view...",
    "reports.installersKpiTitle": "Installers KPI",
    "reports.installersKpiSubtitle":
      "Sorted, paginated installer performance and money metrics",
    "reports.loadingInstallersKpi": "Loading installers KPI...",
    "reports.rowsCount": "Rows: {count}",
    "reports.exportInstallersCsv": "Export Installers CSV",
    "reports.failedInstallerDetails": "Failed to load installer details",
    "reports.exportOrdersCsv": "Export Orders CSV",
    "reports.prev": "Prev",
    "reports.next": "Next",
    "reports.installerDrilldownTitle": "Installer Drill-down",
  },
  ru: {
    "reports.notAvailableShort": "н/д",
    "reports.openInProjects": "Открыть в проектах",
    "reports.noFailingProjectsCurrentWindow":
      "В текущем окне нет проблемных проектов.",
    "reports.healthMetricsPlaybooks": "Метрики здоровья и сценарии действий",
    "reports.loadingSlaMetrics": "Загружаем SLA-метрики...",
    "reports.loadingIssuesAnalytics": "Загружаем аналитику проблем...",
    "reports.loadingMarginLeakage": "Загружаем утечку маржи...",
    "reports.projectPlanVsFactTitle": "План и факт по проекту",
    "reports.projectPlanVsFactSubtitle":
      "Сравнение плановых коммерческих целей с фактическими работами, начислениями и маржой.",
    "reports.actualMissing": "Фактически отсутствует",
    "reports.payroll": "Начисления",
    "reports.profit": "Прибыль",
    "reports.projectRiskTitle": "Разбор рисков проекта",
    "reports.projectRiskSubtitle":
      "Почему выбранный проект теряет маржу: драйверы, зависшие причины и рискованные заказы.",
    "reports.loadingProjects": "Загружаем проекты...",
    "reports.loadingProjectRisk": "Загружаем разбор рисков проекта...",
    "reports.failedProjectRisk": "Не удалось загрузить разбор рисков проекта",
    "reports.importModes": "Режимы импорта",
    "reports.analyzeRetry": "Анализ {analyze} | Повтор {retry}",
    "reports.outboxRisk": "Риск очереди отправки",
    "reports.limitAlerts": "Алерты лимитов",
    "reports.warnDanger24h": "24 ч: предупреждений {warn} | критических {danger}",
    "reports.topFailingProjectsTitle":
      "Проблемные проекты (ошибки импорта за 7д)",
    "reports.failureRuns": "{count} сбоев",
    "reports.openShort": "Открыть",
    "reports.operationsSlaTitle": "Операционный SLA",
    "reports.projectMarginExecutiveTitle": "Исполнительная маржа по проектам",
    "reports.projectMarginExecutiveSubtitle":
      "Самые прибыльные и низкомаржинальные проекты по фактической марже.",
    "reports.topMarginProjects": "Топ по марже",
    "reports.loadingTopMarginProjects": "Загружаем проекты с лучшей маржой...",
    "reports.failedTopMarginProjects":
      "Не удалось загрузить проекты с лучшей маржой",
    "reports.noProfitableProjects": "Прибыльных проектов пока нет.",
    "reports.statusIssues": "Статус {status} | Проблемы {issues}",
    "reports.lowMarginRiskProjects": "Низкая маржа / риск",
    "reports.loadingLowMarginProjects":
      "Загружаем низкомаржинальные проекты...",
    "reports.failedLowMarginProjects":
      "Не удалось загрузить низкомаржинальные проекты",
    "reports.noLowMarginProjects": "Низкомаржинальных проектов нет.",
    "reports.completionIssues": "Готовность {completion} | Проблемы {issues}",
    "reports.riskConcentrationTitle": "Концентрация риска",
    "reports.riskConcentrationSubtitle":
      "Где сейчас сконцентрирован риск маржи по проектам, заказам и монтажникам.",
    "reports.loadingRiskConcentration": "Загружаем концентрацию риска...",
    "reports.failedRiskConcentration":
      "Не удалось загрузить концентрацию риска",
    "reports.delayedProfitLabel": "Отложенная прибыль",
    "reports.openIssueRisk": "Риск открытых проблем {amount}",
    "reports.blockedIssueRisk": "Риск заблокированных проблем",
    "reports.worstInstaller": "Худший монтажник {amount}",
    "reports.riskyProjectsOrders": "Рискованные проекты / заказы",
    "reports.worstProject": "Худший проект {amount}",
    "reports.revenuePayrollProfit": "Выручка / начисления / прибыль",
    "reports.projectsOrders": "Проекты / заказы",
    "reports.installedDoors": "Установлено дверей: {count}",
    "reports.openIssuesMissingRates":
      "Открытые проблемы / отсутствующие ставки",
    "reports.lastInstall": "Последняя установка:",
    "reports.addonsImpact": "Влияние допов",
    "reports.addonsProfitMissingPlans": "Прибыль {profit} | Нет планов {count}",
    "reports.openOperationsCenter": "Открыть операционный центр",
    "reports.openActionableOps": "Открыть задачи, требующие действий",
    "reports.loadingCommandCenter": "Загружаем командный центр...",
    "reports.issuesAnalyticsTitle": "Аналитика проблем",
    "reports.issuesAnalyticsSubtitle": "MTTR, просрочки и динамика бэклога",
    "reports.marginLeakageTitle": "Утечка маржи",
    "reports.marginLeakageSubtitle":
      "Риск по открытым проблемам, зависшим причинам и допам",
    "reports.loadingProjectsForPlanFact": "Загружаем проекты...",
    "reports.preparingPlanFactFilters":
      "Готовим фильтры проекта для сравнения плана и факта.",
    "reports.loadingProjectPlanFact": "Загружаем план и факт по проекту...",
    "reports.failedProjectPlanFact":
      "Не удалось загрузить план и факт по проекту",
    "reports.failedIssuesAnalytics": "Не удалось загрузить аналитику проблем",
    "reports.openTotal": "Открыто / всего",
    "reports.overdueRate": "Доля просрочки",
    "reports.overdueOpen": "Просрочено открытых: {count}",
    "reports.blockedOpen": "Блокировано",
    "reports.backlogByWorkflow": "Незакрытые проблемы по этапам",
    "reports.backlogByPriority": "Бэклог по приоритету",
    "reports.trendLastDays": "Тренд за {days} дней",
    "reports.failedMarginLeakage": "Не удалось загрузить утечку маржи",
    "reports.openIssuesAtRisk": "Открытые проблемы в риске",
    "reports.profitAtRisk": "Прибыль под риском {amount}",
    "reports.blockedMarginRisk": "Риск блокированной маржи",
    "reports.blockedProfit": "Блокированная прибыль {amount}",
    "reports.delayedDoors": "Задержанные двери",
    "reports.delayedProfit": "Отложенная прибыль {amount}",
    "reports.addonUplift": "Рост за счет допов",
    "reports.summary": "Сводка",
    "reports.openIssuesExposure": "Экспозиция открытых проблем",
    "reports.delayedNotInstalled": "Задержанные неустановленные",
    "reports.addonRealized": "Реализованные допы",
    "reports.delayedByReason": "Задержки по причине / дефекту",
    "reports.noDelayedReasons": "Причин задержки нет.",
    "reports.addonProfitImpact": "Влияние допов на прибыль",
    "reports.addon": "Доп",
    "reports.missingPlans": "Нет планов",
    "reports.noAddonImpactRows": "Строк по влиянию допов нет.",
    "reports.installerProfitabilityMatrix": "Матрица прибыльности монтажников",
    "reports.installerProfitabilitySubtitle":
      "Рейтинг по денежному результату, качеству маржи и давлению проблем",
    "reports.loadingInstallerProfitability":
      "Загружаем матрицу прибыльности монтажников...",
    "reports.projectsAddons": "Проекты {projects} | Допы {addons}",
    "reports.installerCrossViewTitle": "Срез монтажник x проект",
    "reports.installerCrossViewSubtitle":
      "Какие связки монтажник-проект создают или съедают маржу",
    "reports.loadingInstallerCrossView": "Загружаем срез монтажник x проект...",
    "reports.installersKpiTitle": "KPI монтажников",
    "reports.installersKpiSubtitle":
      "Сортируемые и постраничные метрики монтажников",
    "reports.loadingInstallersKpi": "Загружаем KPI монтажников...",
    "reports.rowsCount": "Строк: {count}",
    "reports.exportInstallersCsv": "Экспорт CSV по монтажникам",
    "reports.failedInstallerDetails": "Не удалось загрузить детали монтажника",
    "reports.exportOrdersCsv": "Экспорт CSV по заказам",
    "reports.prev": "Назад",
    "reports.next": "Далее",
    "reports.installerDrilldownTitle": "Разбор монтажника",
  },
  he: {
    "reports.notAvailableShort": "לא זמין",
    "reports.openInProjects": "פתח בפרויקטים",
    "reports.noFailingProjectsCurrentWindow":
      "אין פרויקטים כושלים בחלון הנוכחי.",
    "reports.healthMetricsPlaybooks": "מדדי בריאות וספרי פעולה",
    "reports.loadingSlaMetrics": "טוען מדדי SLA...",
    "reports.loadingIssuesAnalytics": "טוען אנליטיקת תקלות...",
    "reports.loadingMarginLeakage": "טוען דליפת מרווח...",
    "reports.projectPlanVsFactTitle": "תכנית מול ביצוע לפרויקט",
    "reports.projectPlanVsFactSubtitle":
      "השוואה בין היעדים המסחריים המתוכננים לבין הביצוע בפועל, השכר והמרווח.",
    "reports.actualMissing": "חסר בפועל",
    "reports.payroll": "שכר",
    "reports.profit": "רווח",
    "reports.projectRiskTitle": "פירוט סיכוני פרויקט",
    "reports.projectRiskSubtitle":
      "למה הפרויקט שנבחר שוחק מרווח: מניעים, סיבות תקועות והזמנות בסיכון.",
    "reports.loadingProjects": "טוען פרויקטים...",
    "reports.loadingProjectRisk": "טוען פירוט סיכוני פרויקט...",
    "reports.failedProjectRisk": "טעינת פירוט סיכוני הפרויקט נכשלה",
    "reports.importModes": "מצבי ייבוא",
    "reports.analyzeRetry": "ניתוח {analyze} | ניסיון חוזר {retry}",
    "reports.outboxRisk": "סיכון בתור השליחה",
    "reports.limitAlerts": "התראות מגבלות",
    "reports.warnDanger24h": "24ש׳ אזהרה {warn} | סכנה {danger}",
    "reports.topFailingProjectsTitle":
      "פרויקטים כושלים (שגיאות ייבוא ב-7 ימים)",
    "reports.failureRuns": "{count} כשלים",
    "reports.openShort": "פתח",
    "reports.operationsSlaTitle": "SLA תפעולי",
    "reports.projectMarginExecutiveTitle": "מרווח הנהלתי לפי פרויקט",
    "reports.projectMarginExecutiveSubtitle":
      "הפרויקטים הרווחיים ביותר והנמוכים ביותר לפי מרווח ממומש בפועל.",
    "reports.topMarginProjects": "פרויקטי מרווח מובילים",
    "reports.loadingTopMarginProjects": "טוען פרויקטים עם מרווח גבוה...",
    "reports.failedTopMarginProjects": "טעינת פרויקטים עם מרווח גבוה נכשלה",
    "reports.noProfitableProjects": "עדיין אין פרויקטים רווחיים.",
    "reports.statusIssues": "סטטוס {status} | תקלות {issues}",
    "reports.lowMarginRiskProjects": "מרווח נמוך / סיכון",
    "reports.loadingLowMarginProjects": "טוען פרויקטים עם מרווח נמוך...",
    "reports.failedLowMarginProjects": "טעינת פרויקטים עם מרווח נמוך נכשלה",
    "reports.noLowMarginProjects": "אין פרויקטים עם מרווח נמוך.",
    "reports.completionIssues": "השלמה {completion} | תקלות {issues}",
    "reports.riskConcentrationTitle": "ריכוז סיכון",
    "reports.riskConcentrationSubtitle":
      "היכן סיכון המרווח מרוכז כעת בין פרויקטים, הזמנות ומתקינים.",
    "reports.loadingRiskConcentration": "טוען ריכוז סיכון...",
    "reports.failedRiskConcentration": "טעינת ריכוז הסיכון נכשלה",
    "reports.delayedProfitLabel": "רווח מעוכב",
    "reports.openIssueRisk": "סיכון תקלות פתוחות {amount}",
    "reports.blockedIssueRisk": "סיכון תקלות חסומות",
    "reports.worstInstaller": "המתקין הגרוע ביותר {amount}",
    "reports.riskyProjectsOrders": "פרויקטים / הזמנות בסיכון",
    "reports.worstProject": "הפרויקט הגרוע ביותר {amount}",
    "reports.revenuePayrollProfit": "הכנסה / שכר / רווח",
    "reports.projectsOrders": "פרויקטים / הזמנות",
    "reports.installedDoors": "דלתות מותקנות: {count}",
    "reports.openIssuesMissingRates": "תקלות פתוחות / תעריפים חסרים",
    "reports.lastInstall": "התקנה אחרונה:",
    "reports.addonsImpact": "השפעת תוספות",
    "reports.addonsProfitMissingPlans": "רווח {profit} | תוכניות חסרות {count}",
    "reports.openOperationsCenter": "פתח את מרכז התפעול",
    "reports.openActionableOps": "פתח משימות הדורשות פעולה",
    "reports.loadingCommandCenter": "טוען את מרכז הפיקוד...",
    "reports.issuesAnalyticsTitle": "אנליטיקת תקלות",
    "reports.issuesAnalyticsSubtitle": "MTTR, עומס איחורים ודינמיקת משימות פתוחות",
    "reports.marginLeakageTitle": "דליפת מרווח",
    "reports.marginLeakageSubtitle":
      "חשיפת תקלות פתוחות, סיבות תקועות ותרומת עבודות נוספות",
    "reports.loadingProjectsForPlanFact": "טוען פרויקטים...",
    "reports.preparingPlanFactFilters": "מכין מסננים להשוואת תכנון וביצוע.",
    "reports.loadingProjectPlanFact": "טוען תכנון וביצוע לפרויקט...",
    "reports.failedProjectPlanFact": "טעינת התכנון והביצוע של הפרויקט נכשלה",
    "reports.failedIssuesAnalytics": "טעינת אנליטיקת התקלות נכשלה",
    "reports.openTotal": 'פתוחות / סה"כ',
    "reports.overdueRate": "שיעור איחור",
    "reports.overdueOpen": "{count} פתוחות באיחור",
    "reports.blockedOpen": "פתוחות חסומות",
    "reports.backlogByWorkflow": "משימות פתוחות לפי שלב",
    "reports.backlogByPriority": "משימות פתוחות לפי עדיפות",
    "reports.trendLastDays": "מגמה ב-{days} הימים האחרונים",
    "reports.failedMarginLeakage": "טעינת דליפת המרווח נכשלה",
    "reports.openIssuesAtRisk": "תקלות פתוחות בסיכון",
    "reports.profitAtRisk": "רווח בסיכון {amount}",
    "reports.blockedMarginRisk": "סיכון מרווח חסום",
    "reports.blockedProfit": "רווח חסום {amount}",
    "reports.delayedDoors": "דלתות מושהות",
    "reports.delayedProfit": "רווח מושהה {amount}",
    "reports.addonUplift": "תרומת עבודות נוספות",
    "reports.summary": "סיכום",
    "reports.openIssuesExposure": "חשיפת תקלות פתוחות",
    "reports.delayedNotInstalled": "מושהות ולא מותקנות",
    "reports.addonRealized": "עבודות נוספות שבוצעו",
    "reports.delayedByReason": "עיכוב לפי סיבה / פגם",
    "reports.noDelayedReasons": "אין סיבות עיכוב.",
    "reports.addonProfitImpact": "השפעת עבודות נוספות על הרווח",
    "reports.addon": "עבודה נוספת",
    "reports.missingPlans": "תוכניות חסרות",
    "reports.noAddonImpactRows": "אין נתוני השפעה של עבודות נוספות.",
    "reports.installerProfitabilityMatrix": "מטריצת רווחיות מתקינים",
    "reports.installerProfitabilitySubtitle":
      "דירוג לפי תפוקה כספית, איכות מרווח ולחץ תקלות",
    "reports.loadingInstallerProfitability": "טוען מטריצת רווחיות מתקינים...",
    "reports.projectsAddons": "פרויקטים {projects} | תוספות {addons}",
    "reports.installerCrossViewTitle": "חתך מתקין x פרויקט",
    "reports.installerCrossViewSubtitle":
      "אילו שילובים של מתקין-פרויקט יוצרים או שוחקים מרווח",
    "reports.loadingInstallerCrossView": "טוען חתך מתקין x פרויקט...",
    "reports.installersKpiTitle": "KPI למתקינים",
    "reports.installersKpiSubtitle": "מדדי מתקינים עם מיון ודפדוף",
    "reports.loadingInstallersKpi": "טוען KPI למתקינים...",
    "reports.rowsCount": "שורות: {count}",
    "reports.exportInstallersCsv": "ייצוא CSV למתקינים",
    "reports.failedInstallerDetails": "טעינת פרטי המתקין נכשלה",
    "reports.exportOrdersCsv": "ייצוא CSV להזמנות",
    "reports.prev": "הקודם",
    "reports.next": "הבא",
    "reports.installerDrilldownTitle": "פירוט מתקין",
  },
};

type LimitAlertItem = {
  id: string;
  created_at: string;
  action: string;
  level: string;
  metric: string | null;
  current: number | null;
  max: number | null;
  utilization_pct: number | null;
  plan_code: string | null;
  is_unread: boolean;
};

type LimitAlertsResponse = {
  items: LimitAlertItem[];
  unread_count: number;
  last_read_at: string | null;
  limit: number;
  offset: number;
};

type LimitAlertsReadResponse = {
  unread_count: number;
  last_read_at: string;
};

type DeliveryStatsResponse = {
  period_from: string | null;
  period_to: string | null;
  whatsapp_pending: number;
  whatsapp_delivered: number;
  whatsapp_failed: number;
  email_sent: number;
  email_failed: number;
};

type OutboxSummaryResponse = {
  total: number;
  by_channel: Record<string, number>;
  by_status: Record<string, number>;
  by_delivery_status: Record<string, number>;
  pending_overdue_15m: number;
  failed_total: number;
};

type OutboxItem = {
  id: string;
  channel: string;
  status: string;
  delivery_status: string;
  attempts: number;
  max_attempts: number;
  scheduled_at: string;
  created_at: string;
  last_error: string | null;
};

type OutboxListResponse = {
  items: OutboxItem[];
};

type OutboxRetryResponse = {
  item: OutboxItem;
};

type WebhookSignalItem = {
  id: string;
  provider: string;
  event_type: string;
  external_id: string | null;
  result: string;
  status: string | null;
  error: string | null;
  outbox_id: string | null;
  created_at: string;
};

type WebhookSignalListResponse = {
  items: WebhookSignalItem[];
};

type OutboxRetryAuditItem = {
  id: string;
  outbox_id: string;
  actor_user_id: string;
  reason: string | null;
  before_status: string | null;
  after_status: string | null;
  before_delivery_status: string | null;
  after_delivery_status: string | null;
  created_at: string;
};

type OutboxRetryAuditListResponse = {
  items: OutboxRetryAuditItem[];
};

type AuditCatalogChangeItem = {
  id: string;
  created_at: string;
  entity_type: string;
  entity_id?: string;
  actor_user_id?: string;
  action: string;
  reason: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
};

type AuditCatalogChangesResponse = {
  items: AuditCatalogChangeItem[];
  summary: {
    total: number;
    by_entity: Record<string, number>;
    by_action: Record<string, number>;
  };
};

type OperationsCenterResponse = {
  generated_at: string;
  imports: {
    window_hours: number;
    total_runs: number;
    analyze_runs: number;
    import_runs: number;
    retry_runs: number;
    success_runs: number;
    partial_runs: number;
    failed_runs: number;
    empty_runs: number;
  };
  outbox: {
    total: number;
    failed_total: number;
    pending_overdue_15m: number;
    by_channel: Record<string, number>;
  };
  alerts: {
    unread_count: number;
    total_last_24h: number;
    warn_last_24h: number;
    danger_last_24h: number;
    latest_created_at: string | null;
  };
  top_failing_projects: Array<{
    project_id: string;
    project_name: string;
    failure_runs: number;
    last_run_at: string;
    last_error: string | null;
  }>;
};

type OperationsSlaMetric = {
  code: string;
  title: string;
  unit: string;
  current: number;
  target: number;
  warn_threshold: number;
  danger_threshold: number;
  status: "OK" | "WARN" | "DANGER" | string;
};

type OperationsSlaPlaybook = {
  code: string;
  severity: "OK" | "WARN" | "DANGER" | string;
  title: string;
  description: string;
  action_url: string;
};

type OperationsSlaResponse = {
  generated_at: string;
  overall_status: "OK" | "WARN" | "DANGER" | string;
  metrics: OperationsSlaMetric[];
  playbooks: OperationsSlaPlaybook[];
};

type OperationsSlaHistoryPoint = {
  day: string;
  overall_status: "OK" | "WARN" | "DANGER" | string;
  import_status: "OK" | "WARN" | "DANGER" | string;
  outbox_status: "OK" | "WARN" | "DANGER" | string;
  alerts_status: "OK" | "WARN" | "DANGER" | string;
  import_runs: number;
  risky_import_runs: number;
  import_failure_rate_pct: number;
  outbox_total: number;
  outbox_failed: number;
  outbox_failed_rate_pct: number;
  danger_alerts_count: number;
};

type OperationsSlaHistorySummary = {
  ok_days: number;
  warn_days: number;
  danger_days: number;
  current_status: "OK" | "WARN" | "DANGER" | string;
  delta_import_failure_rate_pct: number;
  delta_outbox_failed_rate_pct: number;
  delta_danger_alerts_count: number;
};

type OperationsSlaHistoryResponse = {
  generated_at: string;
  days: number;
  points: OperationsSlaHistoryPoint[];
  summary: OperationsSlaHistorySummary;
};

type IssuesAnalyticsSummary = {
  total_issues: number;
  open_issues: number;
  closed_issues: number;
  overdue_open_issues: number;
  blocked_open_issues: number;
  p1_open_issues: number;
  overdue_open_rate_pct: number;
  mttr_hours: number;
  mttr_p50_hours: number;
  mttr_sample_size: number;
  backlog_by_workflow: Record<string, number>;
  backlog_by_priority: Record<string, number>;
};

type IssuesAnalyticsTrendPoint = {
  day: string;
  opened: number;
  closed: number;
  backlog_open_end: number;
};

type IssuesAnalyticsResponse = {
  generated_at: string;
  days: number;
  summary: IssuesAnalyticsSummary;
  trend: IssuesAnalyticsTrendPoint[];
};

type ProjectOption = {
  id: string;
  name: string;
};

type InstallerKpiItem = {
  installer_id: string;
  installer_name: string;
  installed_doors: number;
  payroll_total: number;
  revenue_total: number;
  profit_total: number;
  missing_rates_installed_doors: number;
};

type InstallersKpiResponse = {
  period_from: string | null;
  period_to: string | null;
  items: InstallerKpiItem[];
};

type InstallerProfitabilityMatrixItem = {
  installer_id: string;
  installer_name: string;
  performance_band: string;
  installed_doors: number;
  active_projects: number;
  open_issues: number;
  addons_done_qty: number;
  revenue_total: number;
  payroll_total: number;
  profit_total: number;
  margin_pct: number;
  avg_profit_per_door: number;
  missing_rates_installed_doors: number;
  missing_addon_plans_facts: number;
  last_installed_at: string | null;
};

type InstallerProfitabilityMatrixResponse = {
  total: number;
  limit: number;
  offset: number;
  items: InstallerProfitabilityMatrixItem[];
};

type InstallerProjectProfitabilityItem = {
  installer_id: string;
  installer_name: string;
  project_id: string;
  project_name: string;
  performance_band: string;
  installed_doors: number;
  open_issues: number;
  addons_done_qty: number;
  revenue_total: number;
  payroll_total: number;
  profit_total: number;
  margin_pct: number;
  avg_profit_per_door: number;
  missing_rates_installed_doors: number;
  missing_addon_plans_facts: number;
  last_installed_at: string | null;
};

type InstallerProjectProfitabilityResponse = {
  total: number;
  limit: number;
  offset: number;
  items: InstallerProjectProfitabilityItem[];
};

type InstallerKpiProjectItem = {
  project_id: string;
  project_name: string;
  installed_doors: number;
  open_issues: number;
  revenue_total: number;
  payroll_total: number;
  profit_total: number;
  last_installed_at: string | null;
};

type InstallerKpiOrderItem = {
  order_number: string;
  installed_doors: number;
  revenue_total: number;
  payroll_total: number;
  profit_total: number;
};

type InstallerKpiDetailsResponse = {
  installer_id: string;
  installer_name: string;
  installed_doors: number;
  active_projects: number;
  order_numbers: number;
  open_issues: number;
  addons_done_qty: number;
  addon_revenue_total: number;
  addon_payroll_total: number;
  addon_profit_total: number;
  revenue_total: number;
  payroll_total: number;
  profit_total: number;
  missing_rates_installed_doors: number;
  missing_addon_plans_facts: number;
  last_installed_at: string | null;
  top_projects: InstallerKpiProjectItem[];
  order_breakdown: InstallerKpiOrderItem[];
};

type OrderNumberKpiItem = {
  order_number: string;
  total_doors: number;
  installed_doors: number;
  not_installed_doors: number;
  open_issues: number;
  planned_revenue_total: number;
  installed_revenue_total: number;
  payroll_total: number;
  profit_total: number;
  missing_rates_installed_doors: number;
  completion_pct: number;
};

type OrderNumbersKpiResponse = {
  total: number;
  limit: number;
  offset: number;
  items: OrderNumberKpiItem[];
};

type ProjectPlanFactResponse = {
  project_id: string;
  total_doors: number;
  installed_doors: number;
  not_installed_doors: number;
  completion_pct: number;
  open_issues: number;
  planned_revenue_total: number;
  actual_revenue_total: number;
  revenue_gap_total: number;
  planned_payroll_total: number;
  actual_payroll_total: number;
  payroll_gap_total: number;
  planned_profit_total: number;
  actual_profit_total: number;
  profit_gap_total: number;
  planned_addons_qty: number;
  actual_addons_qty: number;
  urgency_surcharges_count: number;
  urgency_order_surcharges_count: number;
  urgency_client_total: number;
  urgency_installer_total: number;
  urgency_profit_total: number;
  missing_planned_rates_doors: number;
  missing_actual_rates_doors: number;
  missing_addon_plans_facts: number;
};

type ProjectAddonPlanItem = {
  id?: string;
  addon_type_id: string;
  addon_name?: string | null;
  qty_planned: string | number;
  client_price: string | number;
  installer_price: string | number;
  notes?: string | null;
};

type UrgencySurchargeItem = {
  id?: string;
  scope: "PROJECT" | "ORDER_NUMBER";
  order_number?: string | null;
  reason: string;
  client_amount: string | number;
  installer_amount: string | number;
  effective_date?: string | null;
  notes?: string | null;
};

type ProjectRiskDriverItem = {
  code: string;
  label: string;
  severity: string;
  value: number;
};

type ProjectRiskReasonItem = {
  reason_id: string | null;
  reason_name: string;
  doors: number;
  revenue_delayed_total: number;
  profit_delayed_total: number;
};

type ProjectRiskOrderItem = {
  order_number: string;
  total_doors: number;
  installed_doors: number;
  not_installed_doors: number;
  open_issues: number;
  planned_revenue_total: number;
  actual_revenue_total: number;
  revenue_gap_total: number;
  actual_profit_total: number;
  completion_pct: number;
};

type ProjectRiskDrilldownSummary = {
  total_doors: number;
  installed_doors: number;
  not_installed_doors: number;
  completion_pct: number;
  open_issues: number;
  blocked_open_issues: number;
  planned_revenue_total: number;
  actual_revenue_total: number;
  revenue_gap_total: number;
  planned_profit_total: number;
  actual_profit_total: number;
  profit_gap_total: number;
  actual_margin_pct: number;
  delayed_revenue_total: number;
  delayed_profit_total: number;
  blocked_issue_profit_at_risk: number;
  addon_revenue_total: number;
  addon_profit_total: number;
  urgency_surcharges_count: number;
  urgency_order_surcharges_count: number;
  urgency_client_total: number;
  urgency_installer_total: number;
  urgency_profit_total: number;
  missing_planned_rates_doors: number;
  missing_actual_rates_doors: number;
  missing_addon_plans_facts: number;
};

type ProjectRiskDrilldownResponse = {
  generated_at: string;
  project_id: string;
  project_name: string;
  summary: ProjectRiskDrilldownSummary;
  drivers: ProjectRiskDriverItem[];
  top_reasons: ProjectRiskReasonItem[];
  risky_orders: ProjectRiskOrderItem[];
};

type ProjectMarginItem = {
  project_id: string;
  project_name: string;
  project_status: string;
  total_doors: number;
  installed_doors: number;
  completion_pct: number;
  open_issues: number;
  revenue_total: number;
  payroll_total: number;
  profit_total: number;
  margin_pct: number;
  missing_rates_installed_doors: number;
  missing_addon_plans_facts: number;
  last_installed_at: string | null;
};

type ProjectsMarginResponse = {
  total: number;
  limit: number;
  offset: number;
  items: ProjectMarginItem[];
};

type IssuesAddonsImpactSummary = {
  open_issues: number;
  blocked_open_issues: number;
  not_installed_doors: number;
  open_issue_revenue_at_risk: number;
  open_issue_payroll_at_risk: number;
  open_issue_profit_at_risk: number;
  blocked_issue_profit_at_risk: number;
  delayed_revenue_total: number;
  delayed_payroll_total: number;
  delayed_profit_total: number;
  addon_revenue_total: number;
  addon_payroll_total: number;
  addon_profit_total: number;
  missing_addon_plans_facts: number;
};

type IssuesAddonsImpactReasonItem = {
  reason_id: string | null;
  reason_name: string;
  doors: number;
  revenue_delayed_total: number;
  payroll_delayed_total: number;
  profit_delayed_total: number;
};

type IssuesAddonsImpactAddonItem = {
  addon_type_id: string | null;
  addon_name: string;
  qty_done: number;
  revenue_total: number;
  payroll_total: number;
  profit_total: number;
  missing_plan_facts: number;
};

type IssuesAddonsImpactResponse = {
  generated_at: string;
  summary: IssuesAddonsImpactSummary;
  top_reasons: IssuesAddonsImpactReasonItem[];
  addon_impact: IssuesAddonsImpactAddonItem[];
};

type RiskConcentrationSummary = {
  open_issue_profit_at_risk: number;
  blocked_issue_profit_at_risk: number;
  delayed_profit_total: number;
  risky_projects: number;
  risky_orders: number;
  risky_installers: number;
  worst_project_profit_total: number;
  worst_order_profit_total: number;
  worst_installer_profit_total: number;
};

type RiskConcentrationResponse = {
  generated_at: string;
  summary: RiskConcentrationSummary;
  projects: ProjectMarginItem[];
  orders: OrderNumberKpiItem[];
  installers: InstallerProfitabilityMatrixItem[];
};

type ReportsPreset = {
  id: string;
  name: string;
  created_at: string;
  slaHistoryDays: number;
  installerMatrixSortBy: InstallerMatrixSortBy;
  installerMatrixSortDir: SortDir;
  installerProjectSortBy: InstallerProjectSortBy;
  installerProjectSortDir: SortDir;
  installersSortBy: InstallersSortBy;
  installersSortDir: SortDir;
  orderNumbersSortBy: OrderNumbersSortBy;
  orderNumbersSortDir: SortDir;
  orderNumbersQuery: string;
  orderNumbersProjectId: string;
  projectPlanFactProjectId: string;
  projectRiskProjectId: string;
};

type ReportsFocus = "operations" | "delivery" | "issues";
type ReportsOpsPreset = "failed-imports" | "delivery-risk" | "issue-pressure";

type SortDir = "asc" | "desc";
type InstallersSortBy =
  | "installed_doors"
  | "payroll_total"
  | "revenue_total"
  | "profit_total"
  | "installer_name";
type InstallerMatrixSortBy =
  | "profit_total"
  | "margin_pct"
  | "installed_doors"
  | "avg_profit_per_door"
  | "open_issues";
type InstallerProjectSortBy =
  | "profit_total"
  | "margin_pct"
  | "installed_doors"
  | "open_issues"
  | "avg_profit_per_door";
type OrderNumbersSortBy =
  | "order_number"
  | "total_doors"
  | "installed_doors"
  | "not_installed_doors"
  | "planned_revenue_total"
  | "installed_revenue_total"
  | "payroll_total"
  | "profit_total"
  | "missing_rates_installed_doors";

const PAGE_SIZE = 20;
const KPI_PAGE_SIZE = 20;
const FAILED_OUTBOX_LIMIT = 8;
const AUDIT_PREVIEW_LIMIT = 8;
const AUDIT_EXPORT_LIMIT = 10000;
const KPI_EXPORT_LIMIT = 5000;
const ISSUES_ANALYTICS_DAYS = 30;
const PROJECT_MARGIN_LIMIT = 5;
const INSTALLER_MATRIX_LIMIT = 8;
const INSTALLER_PROJECT_LIMIT = 10;
const RISK_CONCENTRATION_LIMIT = 5;
const REPORTS_PRESETS_STORAGE_KEY = "dimax_reports_presets_v1";
const REPORTS_FOCUS_IDS: Record<ReportsFocus, string> = {
  operations: "reports-operations-center",
  delivery: "reports-delivery-risk",
  issues: "reports-issues-analytics",
};

function getReportsFocusCopy(
  t: (key: string) => string,
): Record<ReportsFocus, { title: string; description: string }> {
  return {
    operations: {
      title: t("reports.operationsFocusTitle"),
      description: t("reports.operationsFocusDescription"),
    },
    delivery: {
      title: t("reports.deliveryFocusTitle"),
      description: t("reports.deliveryFocusDescription"),
    },
    issues: {
      title: t("reports.issuesFocusTitle"),
      description: t("reports.issuesFocusDescription"),
    },
  };
}

function getReportsOpsPresetCopy(
  t: (key: string) => string,
): Record<
  ReportsOpsPreset,
  { title: string; description: string; slaHistoryDays: number }
> {
  return {
    "failed-imports": {
      title: t("reports.failedImportsPresetTitle"),
      description: t("reports.failedImportsPresetDescription"),
      slaHistoryDays: 7,
    },
    "delivery-risk": {
      title: t("reports.deliveryRiskPresetTitle"),
      description: t("reports.deliveryRiskPresetDescription"),
      slaHistoryDays: 7,
    },
    "issue-pressure": {
      title: t("reports.issuePressurePresetTitle"),
      description: t("reports.issuePressurePresetDescription"),
      slaHistoryDays: 14,
    },
  };
}

type ReportsScopedContext = {
  projectId: string | null;
  outboxId: string | null;
  installerId: string | null;
  deliveryChannel: string | null;
  webhookProvider: string | null;
};

function parseReportsFocus(value: string | null): ReportsFocus | null {
  if (value === "operations" || value === "delivery" || value === "issues") {
    return value;
  }
  return null;
}

function parseReportsOpsPreset(value: string | null): ReportsOpsPreset | null {
  if (
    value === "failed-imports" ||
    value === "delivery-risk" ||
    value === "issue-pressure"
  ) {
    return value;
  }
  return null;
}

function getReportsFocusTargetId(
  focus: ReportsFocus | null,
  scope: ReportsScopedContext,
): string | null {
  if (scope.projectId) {
    return "reports-project-plan-fact";
  }
  if (scope.outboxId) {
    return "reports-failed-outbox";
  }
  if (scope.deliveryChannel || scope.webhookProvider) {
    return "reports-delivery-scope";
  }
  if (scope.installerId) {
    return "reports-installers-kpi";
  }
  if (!focus) {
    return null;
  }
  return REPORTS_FOCUS_IDS[focus];
}
const AUDIT_ENTITY_OPTIONS = [
  "door_type",
  "reason",
  "company",
  "project",
  "sync_state",
] as const;
const AUDIT_ACTION_OPTIONS = [
  "DOOR_TYPE_CREATE",
  "DOOR_TYPE_UPDATE",
  "DOOR_TYPE_DELETE",
  "REASON_CREATE",
  "REASON_UPDATE",
  "REASON_DELETE",
  "SETTINGS_COMPANY_UPDATE",
  "PROJECT_DOORS_IMPORT_ANALYZE",
  "PROJECT_DOORS_IMPORT_APPLY",
  "PROJECT_DOORS_IMPORT_RETRY",
  "PROJECT_DOORS_IMPORT_RETRY_BULK",
  "SYNC_STATE_RESET",
] as const;
const ISSUE_AUDIT_ACTION_OPTIONS = [
  "ISSUE_STATUS_UPDATE",
  "ISSUE_WORKFLOW_UPDATE",
  "ISSUE_WORKFLOW_BULK_UPDATE",
] as const;
const SLA_HISTORY_DAYS_OPTIONS = [7, 30] as const;
const SORT_DIR_OPTIONS: Array<{ value: SortDir; label: string }> = [
  { value: "desc", label: "Desc" },
  { value: "asc", label: "Asc" },
];
const INSTALLERS_SORT_OPTIONS: Array<{
  value: InstallersSortBy;
  label: string;
}> = [
  { value: "installed_doors", label: "Installed Doors" },
  { value: "payroll_total", label: "Payroll" },
  { value: "revenue_total", label: "Revenue" },
  { value: "profit_total", label: "Profit" },
  { value: "installer_name", label: "Installer Name" },
];
const INSTALLER_MATRIX_SORT_OPTIONS: Array<{
  value: InstallerMatrixSortBy;
  label: string;
}> = [
  { value: "profit_total", label: "Profit" },
  { value: "margin_pct", label: "Margin %" },
  { value: "installed_doors", label: "Installed Doors" },
  { value: "avg_profit_per_door", label: "Profit / Door" },
  { value: "open_issues", label: "Open Issues" },
];
const INSTALLER_PROJECT_SORT_OPTIONS: Array<{
  value: InstallerProjectSortBy;
  label: string;
}> = [
  { value: "profit_total", label: "Profit" },
  { value: "margin_pct", label: "Margin %" },
  { value: "installed_doors", label: "Installed Doors" },
  { value: "avg_profit_per_door", label: "Profit / Door" },
  { value: "open_issues", label: "Open Issues" },
];
const ORDER_NUMBERS_SORT_OPTIONS: Array<{
  value: OrderNumbersSortBy;
  label: string;
}> = [
  { value: "total_doors", label: "Total Doors" },
  { value: "installed_doors", label: "Installed Doors" },
  { value: "not_installed_doors", label: "Not Installed" },
  { value: "planned_revenue_total", label: "Planned Revenue" },
  { value: "installed_revenue_total", label: "Installed Revenue" },
  { value: "payroll_total", label: "Payroll" },
  { value: "profit_total", label: "Profit" },
  { value: "missing_rates_installed_doors", label: "Missing Rates" },
  { value: "order_number", label: "Order Number" },
];

const SLA_STATUS_CLASS: Record<string, string> = {
  OK: "border-status-ok-border bg-status-ok-bg text-status-ok-fg",
  WARN: "border-status-warning-border bg-status-warning-bg text-status-warning-fg",
  DANGER:
    "border-status-problem-border bg-status-problem-bg text-status-problem-fg",
};

function installerPerformanceBandClass(band: string): string {
  if (band === "STRONG") {
    return "text-status-ok-fg bg-status-ok-bg border-status-ok-border";
  }
  if (band === "RISK") {
    return "text-status-problem-fg bg-status-problem-bg border-status-problem-border";
  }
  return "text-status-warning-fg bg-status-warning-bg border-status-warning-border";
}

function reportsNoticeClass(
  tone: "success" | "error" | "warning" | "accent" | "muted",
): string {
  if (tone === "success") {
    return "rounded-lg border border-status-ok-border bg-status-ok-bg px-4 py-3 text-[13px] text-status-ok-fg";
  }
  if (tone === "error") {
    return "rounded-lg border border-status-problem-border bg-status-problem-bg px-4 py-3 text-[13px] text-status-problem-fg";
  }
  if (tone === "warning") {
    return "rounded-lg border border-status-warning-border bg-status-warning-bg px-4 py-3 text-[13px] text-status-warning-fg";
  }
  if (tone === "accent") {
    return "rounded-lg border border-accent bg-[var(--dmx-accent-tint)] px-4 py-3 text-[13px] text-text";
  }
  return "rounded-lg border border-border bg-surface px-4 py-3 text-[13px] text-text-secondary";
}

function reportsPanelClass(extra?: string): string {
  return cn("rounded-lg border border-border bg-surface", extra);
}

function reportsMetricCardClass(
  tone: "soft" | "success" | "warning" | "danger" = "soft",
): string {
  return cn(
    "rounded-lg border p-4",
    tone === "success" && "border-status-ok-border bg-status-ok-bg",
    tone === "warning" && "border-status-warning-border bg-status-warning-bg",
    tone === "danger" && "border-status-problem-border bg-status-problem-bg",
    tone === "soft" && "border-border bg-surface",
  );
}

function formatDateTime(value: string): string {
  return formatLocalizedDateTime(value);
}

function metricLabel(metric: string | null): string {
  if (!metric) {
    return "unknown";
  }
  return metric.replaceAll("_", " ");
}

function compactMap(map: Record<string, number> | undefined): string {
  if (!map || Object.keys(map).length === 0) {
    return "n/a";
  }
  return Object.entries(map)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" | ");
}

function buildOperationsHref(params: {
  actionable?: boolean;
  deliveryChannel?: string;
  webhookProvider?: string;
}): string {
  const query = new URLSearchParams();
  if (params.actionable) {
    query.set("actionable", "1");
  }
  if (params.deliveryChannel) {
    query.set("delivery_channel", params.deliveryChannel);
  }
  if (params.webhookProvider) {
    query.set("webhook_provider", params.webhookProvider);
  }
  const value = query.toString();
  return value ? `/operations?${value}` : "/operations";
}

function formatAmount(value: number | null | undefined): string {
  return formatLocalizedNumber(value ?? 0, undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercent(value: number | null | undefined): string {
  return formatLocalizedPercent(value ?? 0);
}

function formatCount(value: number | string | null | undefined): string {
  return formatLocalizedNumber(value ?? 0, undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function toReportNumber(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

type ReportsDashboardTone = "blue" | "green" | "neutral" | "orange" | "red";

type ReportsInsight = {
  cta: string;
  delta: string;
  detail: string;
  eyebrow: string;
  onClick?: () => void;
  title: string;
  tone: ReportsDashboardTone;
  value: string;
  variant: "bars" | "line-down" | "line-up";
};

type ReportsLibraryRow = {
  badge?: "live" | "new" | "pinned";
  icon: string;
  meta: string;
  onClick?: () => void;
  subtitle: string;
  title: string;
};

type ReportsLibraryGroup = {
  count: number;
  icon: LucideIcon;
  rows: ReportsLibraryRow[];
  subtitle: string;
  title: string;
  tone: ReportsDashboardTone;
};

function reportsDashboardToneClasses(tone: ReportsDashboardTone) {
  if (tone === "red") {
    return {
      accent: "bg-status-problem-fg",
      border: "before:bg-status-problem-fg",
      icon: "bg-status-problem-bg text-status-problem-fg",
      text: "text-status-problem-fg",
      badge: "bg-status-problem-bg text-status-problem-fg",
    };
  }
  if (tone === "orange") {
    return {
      accent: "bg-status-warning-fg",
      border: "before:bg-status-warning-fg",
      icon: "bg-status-warning-bg text-status-warning-fg",
      text: "text-status-warning-fg",
      badge: "bg-status-warning-bg text-status-warning-fg",
    };
  }
  if (tone === "green") {
    return {
      accent: "bg-status-ok-fg",
      border: "before:bg-status-ok-fg",
      icon: "bg-status-ok-bg text-status-ok-fg",
      text: "text-status-ok-fg",
      badge: "bg-status-ok-bg text-status-ok-fg",
    };
  }
  if (tone === "blue") {
    return {
      accent: "bg-link",
      border: "before:bg-link",
      icon: "bg-blue-50 text-link",
      text: "text-link",
      badge: "bg-blue-50 text-link",
    };
  }
  return {
    accent: "bg-border-strong",
    border: "before:bg-border-strong",
    icon: "bg-surface-subtle text-text-secondary",
    text: "text-text",
    badge: "bg-surface-subtle text-text-secondary",
  };
}

function ReportsInsightChart({
  tone,
  variant,
}: {
  tone: ReportsDashboardTone;
  variant: ReportsInsight["variant"];
}) {
  const stroke =
    tone === "red"
      ? "var(--dmx-status-problem-fg)"
      : tone === "orange"
        ? "var(--dmx-status-warning-fg)"
        : "var(--dmx-status-ok-fg)";

  if (variant === "bars") {
    return (
      <svg
        aria-hidden="true"
        className="h-auto w-full"
        viewBox="0 0 320 100"
        preserveAspectRatio="xMidYMid meet"
      >
        <line x1="18" y1="78" x2="306" y2="78" stroke="var(--dmx-border)" />
        {[64, 38, 28, 18, 12, 10, 8, 6].map((height, index) => (
          <rect
            key={index}
            x={24 + index * 34}
            y={78 - height}
            width="24"
            height={height}
            rx="3"
            fill={index === 0 ? "var(--dmx-kpi-orange)" : "var(--dmx-kpi-yellow)"}
            opacity={index === 0 ? 1 : 0.7}
          />
        ))}
        <line
          x1="16"
          y1="35"
          x2="306"
          y2="35"
          stroke="var(--dmx-border-strong)"
          strokeDasharray="3 3"
        />
      </svg>
    );
  }

  const points =
    variant === "line-up"
      ? "48,68 80,60 112,62 144,52 176,54 208,42 240,38 272,28 304,22"
      : "48,28 80,34 112,30 144,42 176,50 208,54 240,60 272,66 304,72";

  return (
    <svg
      aria-hidden="true"
      className="h-auto w-full"
      viewBox="0 0 320 100"
      preserveAspectRatio="xMidYMid meet"
    >
      <line x1="40" y1="20" x2="308" y2="20" stroke="var(--dmx-border-subtle)" />
      <line x1="40" y1="45" x2="308" y2="45" stroke="var(--dmx-border-subtle)" />
      <line x1="40" y1="70" x2="308" y2="70" stroke="var(--dmx-border-subtle)" />
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
      <circle cx="304" cy={variant === "line-up" ? 22 : 72} r="4" fill="var(--dmx-bg-surface)" stroke={stroke} strokeWidth="2" />
    </svg>
  );
}

function ReportsInsightCard({ insight }: { insight: ReportsInsight }) {
  const tone = reportsDashboardToneClasses(insight.tone);

  return (
    <button
      type="button"
      onClick={insight.onClick}
      className="overflow-hidden rounded-lg border border-border bg-surface text-start transition-colors hover:border-border-strong"
    >
      <div className={cn("h-[3px]", tone.accent)} />
      <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-4">
        <div className="min-w-0">
          <div
            className={cn(
              "text-[10px] font-semibold uppercase tracking-[0.06em]",
              tone.text,
            )}
          >
            {insight.eyebrow}
          </div>
          <div className="mt-1 truncate text-[14.5px] font-medium text-text">
            {insight.title}
          </div>
        </div>
        <span className="text-lg text-text-tertiary">›</span>
      </div>
      <div className="flex flex-wrap items-baseline gap-2 px-4 pb-3">
        <div className={cn("text-[28px] font-semibold leading-none", tone.text)}>
          {insight.value}
        </div>
        <div className="text-[11.5px] text-text-secondary">{insight.delta}</div>
      </div>
      <div className="border-y border-border-subtle bg-gradient-to-b from-surface-subtle to-surface px-4 py-3">
        <ReportsInsightChart tone={insight.tone} variant={insight.variant} />
      </div>
      <div className="px-4 py-3 text-[11.5px] leading-5 text-text-secondary">
        {insight.detail}{" "}
        <span className="font-medium text-link">{insight.cta}</span>
      </div>
    </button>
  );
}

function ReportsLibraryCard({ group, locale }: { group: ReportsLibraryGroup; locale: Locale }) {
  const tone = reportsDashboardToneClasses(group.tone);
  const Icon = group.icon;
  const copy = (en: string, ru: string, he: string) =>
    locale === "ru" ? ru : locale === "he" ? he : en;

  return (
    <div className="overflow-hidden rounded-[12px] border border-border bg-surface">
      <div className="flex items-center gap-3 border-b border-border-subtle px-4 py-3.5">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            tone.icon,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-medium text-text">
            {group.title}
          </div>
          <div className="truncate text-[11px] text-text-secondary">
            {group.count} {copy("reports ·", "отчётов ·", "דוחות ·")} {group.subtitle}
          </div>
        </div>
      </div>
      <div className="divide-y divide-border-subtle">
        {group.rows.map((row) => (
          <button
            key={`${group.title}-${row.title}`}
            type="button"
            onClick={row.onClick}
            className="grid w-full grid-cols-[24px_minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-3 text-start transition hover:bg-surface-subtle"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md border border-border-subtle bg-surface-subtle text-[11px] font-medium text-text-secondary">
              {row.icon}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium text-text">
                {row.title}
              </span>
              <span className="block truncate text-[11px] text-text-secondary">
                {row.subtitle}
              </span>
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[9.5px] font-medium",
                row.badge === "live" && "bg-status-ok-bg text-status-ok-fg",
                row.badge === "new" && "bg-blue-50 text-link",
                row.badge === "pinned" && "bg-accent/20 text-text",
                !row.badge && "bg-transparent text-transparent",
              )}
            >
              {row.badge === "pinned" ? "pin" : row.badge || "-"}
            </span>
            <span className="text-end text-[10.5px] font-medium text-text-tertiary">
              {row.meta}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SavedReportViewCard({
  eyebrow,
  tone,
  title,
  value,
}: {
  eyebrow: string;
  tone: ReportsDashboardTone;
  title: string;
  value: string;
}) {
  const toneClasses = reportsDashboardToneClasses(tone);
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[10px] border border-border bg-surface px-4 py-3 before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:rounded-r-full",
        toneClasses.border,
      )}
    >
      <div className="pl-2">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate text-[9.5px] font-semibold uppercase tracking-[0.05em] text-text-secondary">
            {eyebrow}
          </div>
          <Star className="h-3.5 w-3.5 shrink-0 text-accent" />
        </div>
        <div className="mt-2 text-[12.5px] font-medium text-text">{title}</div>
        <div className={cn("mt-2 truncate text-lg font-semibold", toneClasses.text)}>
          {value}
        </div>
      </div>
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function downloadCsvExport(
  pathWithQuery: string,
  fallbackFilename: string,
): Promise<void> {
  const response = await apiDownload(pathWithQuery, {
    method: "GET",
    credentials: "include",
  });
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] || fallbackFilename;
  downloadBlob(blob, filename);
}

function auditDateFromValue(value: string): string | null {
  if (!value) {
    return null;
  }
  return new Date(`${value}T00:00:00`).toISOString();
}

function auditDateToValue(value: string): string | null {
  if (!value) {
    return null;
  }
  return new Date(`${value}T23:59:59.999`).toISOString();
}

function buildAuditParams({
  entityType,
  entityId,
  action,
  dateFrom,
  dateTo,
  limit,
  offset,
}: {
  entityType: string;
  entityId?: string;
  action: string;
  dateFrom: string;
  dateTo: string;
  limit: number;
  offset: number;
}): string {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  if (entityType) {
    params.set("entity_type", entityType);
  }
  if (entityId) {
    params.set("issue_id", entityId);
  }
  if (action) {
    params.set("action", action);
  }
  const from = auditDateFromValue(dateFrom);
  const to = auditDateToValue(dateTo);
  if (from) {
    params.set("date_from", from);
  }
  if (to) {
    params.set("date_to", to);
  }
  return params.toString();
}

function changedFieldKeys(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): string[] {
  const beforeObj = before || {};
  const afterObj = after || {};
  const keys = new Set<string>([
    ...Object.keys(beforeObj),
    ...Object.keys(afterObj),
  ]);
  const changed: string[] = [];
  for (const key of keys) {
    const left = JSON.stringify(beforeObj[key] ?? null);
    const right = JSON.stringify(afterObj[key] ?? null);
    if (left !== right) {
      changed.push(key);
    }
  }
  changed.sort((a, b) => a.localeCompare(b, "en"));
  return changed;
}

function prettyJson(value: unknown): string {
  if (value === null || value === undefined) {
    return "{}";
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function readReportsPresets(): ReportsPreset[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(REPORTS_PRESETS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeReportsPresets(presets: ReportsPreset[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(
    REPORTS_PRESETS_STORAGE_KEY,
    JSON.stringify(presets),
  );
}

function SectionMessage({
  title,
  detail,
  tone = "muted",
}: {
  title: string;
  detail: string;
  tone?: "muted" | "error";
}) {
  const toneClass =
    tone === "error"
      ? "border-status-problem-border bg-status-problem-bg text-status-problem-fg"
      : "border-border bg-surface text-text-secondary";
  return (
    <div className={cn("rounded-lg border px-4 py-3 text-[13px]", toneClass)}>
      <div className="font-medium">{title}</div>
      <div className="mt-1 text-[12px]">{detail}</div>
    </div>
  );
}

export default function ReportsPage() {
  const [reportRequestLimiter] = useState(() => createRequestLimiter(4));
  const reportApiFetch = <T,>(
    path: string,
    signal: AbortSignal,
  ): Promise<T> =>
    reportRequestLimiter.run(() => apiFetch<T>(path, { signal }), signal);
  const { locale, t } = useI18n();
  const readError = (error: unknown, fallback: string) =>
    readableApiError(error, locale, fallback);
  const tt = (key: string) => reportsOverrides[locale]?.[key] ?? t(key);
  const copy = (en: string, ru: string, he: string) => {
    if (locale === "ru") return ru;
    if (locale === "he") return he;
    return en;
  };
  const optionLabel = (label: string) => {
    switch (label) {
      case "Profit":
        return copy("Profit", "Прибыль", "רווח");
      case "Margin %":
        return copy("Margin %", "Маржа %", "מרווח %");
      case "Installed Doors":
        return copy("Installed Doors", "Смонтированные двери", "דלתות מותקנות");
      case "Profit / Door":
        return copy("Profit / Door", "Прибыль / дверь", "רווח / דלת");
      case "Open Issues":
        return copy("Open Issues", "Открытые проблемы", "תקלות פתוחות");
      case "Total Doors":
        return copy("Total Doors", "Всего дверей", 'סה"כ דלתות');
      case "Not Installed":
        return copy("Not Installed", "Не смонтировано", "לא הותקן");
      case "Planned Revenue":
        return copy("Planned Revenue", "Плановая выручка", "הכנסה מתוכננת");
      case "Installed Revenue":
        return copy("Installed Revenue", "Выручка по монтажу", "הכנסה מותקנת");
      default:
        return label;
    }
  };
  const reportsFocusCopy = getReportsFocusCopy(t);
  const reportsOpsPresetCopy = useMemo(() => getReportsOpsPresetCopy(t), [t]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const session = useAuthSession();
  const canRunPrivilegedActions = canRunPrivilegedAdminActions(session);
  const canOpenOperations = canAccessAdminModule(session, "operations");
  const canExportFinancialReports = canViewRates(session);
  const privilegedActionHint = canRunPrivilegedActions
    ? undefined
    : t("reports.installerReadOnlyHint");
  const financialReportsRestrictedTitle = copy(
    "Financial reports are restricted",
    "Финансовые отчёты ограничены",
    "הדוחות הכספיים מוגבלים",
  );
  const financialReportsRestrictedDetail = copy(
    "Your current admin scope can work with operations, but payroll, revenue, profit and price details require finance access.",
    "Ваша текущая область администратора может работать с операциями, но данные о заработной плате, доходах, прибыли и ценах требуют доступа к финансам.",
    "הרשאת הניהול הנוכחית מתאימה לתפעול, אך שכר, הכנסה, רווח ופרטי מחירים דורשים גישת כספים.",
  );
  const ratesScopeHint = canExportFinancialReports
    ? undefined
    : "Financial exports are restricted for your current admin scope.";
  const [offset, setOffset] = useState(0);
  const [auditOffset, setAuditOffset] = useState(0);
  const [auditEntityType, setAuditEntityType] = useState("");
  const [auditAction, setAuditAction] = useState("");
  const [auditDateFrom, setAuditDateFrom] = useState("");
  const [auditDateTo, setAuditDateTo] = useState("");
  const [issueAuditOffset, setIssueAuditOffset] = useState(0);
  const [issueAuditAction, setIssueAuditAction] = useState("");
  const [issueAuditDateFrom, setIssueAuditDateFrom] = useState("");
  const [issueAuditDateTo, setIssueAuditDateTo] = useState("");
  const [issueAuditIssueId, setIssueAuditIssueId] = useState("");
  const [expandedIssueAuditId, setExpandedIssueAuditId] = useState<
    string | null
  >(null);
  const [slaHistoryDays, setSlaHistoryDays] = useState<number>(30);
  const [installerMatrixSortBy, setInstallerMatrixSortBy] =
    useState<InstallerMatrixSortBy>("profit_total");
  const [installerMatrixSortDir, setInstallerMatrixSortDir] =
    useState<SortDir>("desc");
  const [installerProjectSortBy, setInstallerProjectSortBy] =
    useState<InstallerProjectSortBy>("profit_total");
  const [installerProjectSortDir, setInstallerProjectSortDir] =
    useState<SortDir>("desc");
  const [installersKpiOffset, setInstallersKpiOffset] = useState(0);
  const [installersSortBy, setInstallersSortBy] =
    useState<InstallersSortBy>("installed_doors");
  const [installersSortDir, setInstallersSortDir] = useState<SortDir>("desc");
  const [installerDetailsId, setInstallerDetailsId] = useState("");
  const [orderNumbersKpiOffset, setOrderNumbersKpiOffset] = useState(0);
  const [orderNumbersSortBy, setOrderNumbersSortBy] =
    useState<OrderNumbersSortBy>("total_doors");
  const [orderNumbersSortDir, setOrderNumbersSortDir] =
    useState<SortDir>("desc");
  const [orderNumbersQuery, setOrderNumbersQuery] = useState("");
  const [orderNumbersProjectId, setOrderNumbersProjectId] = useState("");
  const [projectPlanFactProjectId, setProjectPlanFactProjectId] = useState("");
  const [projectRiskProjectId, setProjectRiskProjectId] = useState("");
  const [presetName, setPresetName] = useState("");
  const [savedPresets, setSavedPresets] = useState<ReportsPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [presetNotice, setPresetNotice] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const activeFocus = parseReportsFocus(searchParams?.get("focus") || null);
  const activeOpsPreset = parseReportsOpsPreset(
    searchParams?.get("ops_preset") || null,
  );
  const scopedProjectId = searchParams?.get("project_id") || null;
  const scopedOutboxId = searchParams?.get("outbox_id") || null;
  const scopedInstallerId = searchParams?.get("installer_id") || null;
  const scopedDeliveryChannel =
    searchParams?.get("delivery_channel")?.trim().toUpperCase() || null;
  const scopedWebhookProvider =
    searchParams?.get("webhook_provider")?.trim().toLowerCase() || null;
  const appliedOpsPresetRef = useRef<ReportsOpsPreset | null>(null);
  const appliedProjectScopeRef = useRef<string | null>(null);
  const appliedInstallerScopeRef = useRef<string | null>(null);
  const issueAuditIssueIdTrimmed = issueAuditIssueId.trim();
  const issueAuditIssueIdNormalized = isUuid(issueAuditIssueIdTrimmed)
    ? issueAuditIssueIdTrimmed
    : "";
  const orderNumbersQueryNormalized = orderNumbersQuery.trim();

  const installersParams = new URLSearchParams();
  installersParams.set("limit", String(KPI_PAGE_SIZE));
  installersParams.set("offset", String(installersKpiOffset));
  installersParams.set("sort_by", installersSortBy);
  installersParams.set("sort_dir", installersSortDir);

  const orderNumbersParams = new URLSearchParams();
  orderNumbersParams.set("limit", String(KPI_PAGE_SIZE));
  orderNumbersParams.set("offset", String(orderNumbersKpiOffset));
  orderNumbersParams.set("sort_by", orderNumbersSortBy);
  orderNumbersParams.set("sort_dir", orderNumbersSortDir);
  if (orderNumbersQueryNormalized) {
    orderNumbersParams.set("q", orderNumbersQueryNormalized);
  }
  if (orderNumbersProjectId) {
    orderNumbersParams.set("project_id", orderNumbersProjectId);
  }

  const alertsQuery = useQuery({
    queryKey: ["limit-alerts", offset],
    queryFn: ({ signal }) =>
      reportApiFetch<LimitAlertsResponse>(
        `/api/v1/admin/reports/limit-alerts?limit=${PAGE_SIZE}&offset=${offset}`,
        signal,
      ),
    refetchInterval: LIVE_REPORT_REFRESH_MS,
  });

  const deliveryQuery = useQuery({
    queryKey: ["reports-delivery"],
    queryFn: ({ signal }) =>
      reportApiFetch<DeliveryStatsResponse>(
        "/api/v1/admin/reports/delivery",
        signal,
      ),
    refetchInterval: LIVE_REPORT_REFRESH_MS,
  });

  const outboxSummaryQuery = useQuery({
    queryKey: ["outbox-summary"],
    queryFn: ({ signal }) =>
      reportApiFetch<OutboxSummaryResponse>(
        "/api/v1/admin/outbox/summary",
        signal,
      ),
    refetchInterval: LIVE_REPORT_REFRESH_MS,
  });

  const operationsCenterQuery = useQuery({
    queryKey: ["reports-operations-center"],
    queryFn: ({ signal }) =>
      reportApiFetch<OperationsCenterResponse>(
        "/api/v1/admin/reports/operations-center",
        signal,
      ),
    refetchInterval: LIVE_REPORT_REFRESH_MS,
  });

  const operationsSlaQuery = useQuery({
    queryKey: ["reports-operations-sla"],
    queryFn: ({ signal }) =>
      reportApiFetch<OperationsSlaResponse>(
        "/api/v1/admin/reports/operations-sla",
        signal,
      ),
    refetchInterval: STANDARD_REPORT_REFRESH_MS,
  });

  const operationsSlaHistoryQuery = useQuery({
    queryKey: ["reports-operations-sla-history", slaHistoryDays],
    queryFn: ({ signal }) =>
      reportApiFetch<OperationsSlaHistoryResponse>(
        `/api/v1/admin/reports/operations-sla/history?days=${slaHistoryDays}`,
        signal,
      ),
    refetchInterval: STANDARD_REPORT_REFRESH_MS,
  });

  const issuesAnalyticsQuery = useQuery({
    queryKey: ["reports-issues-analytics", ISSUES_ANALYTICS_DAYS],
    queryFn: ({ signal }) =>
      reportApiFetch<IssuesAnalyticsResponse>(
        `/api/v1/admin/reports/issues-analytics?days=${ISSUES_ANALYTICS_DAYS}`,
        signal,
      ),
    refetchInterval: STANDARD_REPORT_REFRESH_MS,
  });

  const issuesAddonsImpactQuery = useQuery({
    queryKey: ["reports-issues-addons-impact"],
    queryFn: ({ signal }) =>
      reportApiFetch<IssuesAddonsImpactResponse>(
        "/api/v1/admin/reports/issues-addons-impact",
        signal,
      ),
    enabled: canExportFinancialReports,
    refetchInterval: STANDARD_REPORT_REFRESH_MS,
  });

  const riskConcentrationQuery = useQuery({
    queryKey: ["reports-risk-concentration"],
    queryFn: ({ signal }) =>
      reportApiFetch<RiskConcentrationResponse>(
        `/api/v1/admin/reports/risk-concentration?limit=${RISK_CONCENTRATION_LIMIT}`,
        signal,
      ),
    enabled: canExportFinancialReports,
    refetchInterval: STANDARD_REPORT_REFRESH_MS,
  });

  const installerProfitabilityMatrixQuery = useQuery({
    queryKey: [
      "reports-installer-profitability-matrix",
      installerMatrixSortBy,
      installerMatrixSortDir,
    ],
    queryFn: ({ signal }) =>
      reportApiFetch<InstallerProfitabilityMatrixResponse>(
        `/api/v1/admin/reports/installers-profitability-matrix` +
          `?limit=${INSTALLER_MATRIX_LIMIT}` +
          `&sort_by=${installerMatrixSortBy}` +
          `&sort_dir=${installerMatrixSortDir}`,
        signal,
      ),
    enabled: canExportFinancialReports,
    refetchInterval: STANDARD_REPORT_REFRESH_MS,
  });

  const installerProjectProfitabilityQuery = useQuery({
    queryKey: [
      "reports-installer-project-profitability",
      installerProjectSortBy,
      installerProjectSortDir,
    ],
    queryFn: ({ signal }) =>
      reportApiFetch<InstallerProjectProfitabilityResponse>(
        `/api/v1/admin/reports/installer-project-profitability` +
          `?limit=${INSTALLER_PROJECT_LIMIT}` +
          `&sort_by=${installerProjectSortBy}` +
          `&sort_dir=${installerProjectSortDir}`,
        signal,
      ),
    enabled: canExportFinancialReports,
    refetchInterval: STANDARD_REPORT_REFRESH_MS,
  });

  const projectsQuery = useQuery({
    queryKey: ["reports-project-options"],
    queryFn: ({ signal }) =>
      reportApiFetch<{ items: ProjectOption[] }>(
        "/api/v1/admin/projects",
        signal,
      ),
    refetchInterval: 120_000,
  });

  const projectPlanFactQuery = useQuery({
    queryKey: ["reports-project-plan-fact", projectPlanFactProjectId],
    queryFn: ({ signal }) =>
      reportApiFetch<ProjectPlanFactResponse>(
        `/api/v1/admin/reports/project-plan-fact/${projectPlanFactProjectId}`,
        signal,
      ),
    enabled: canExportFinancialReports && Boolean(projectPlanFactProjectId),
    refetchInterval: STANDARD_REPORT_REFRESH_MS,
  });

  const projectAddonPlanQuery = useQuery({
    queryKey: ["reports-project-addon-plan", projectPlanFactProjectId],
    queryFn: async ({ signal }) => {
      const response = await reportApiFetch<
        ProjectAddonPlanItem[] | { items?: ProjectAddonPlanItem[] }
      >(
        `/api/v1/admin/projects/${projectPlanFactProjectId}/addons/plan`,
        signal,
      );
      return Array.isArray(response) ? response : response.items || [];
    },
    enabled: canExportFinancialReports && Boolean(projectPlanFactProjectId),
    refetchInterval: STANDARD_REPORT_REFRESH_MS,
  });

  const projectUrgencySurchargesQuery = useQuery({
    queryKey: ["reports-project-urgency-surcharges", projectPlanFactProjectId],
    queryFn: async ({ signal }) => {
      const response = await reportApiFetch<
        UrgencySurchargeItem[] | { items?: UrgencySurchargeItem[] }
      >(
        `/api/v1/admin/projects/${projectPlanFactProjectId}/urgency-surcharges`,
        signal,
      );
      return Array.isArray(response) ? response : response.items || [];
    },
    enabled: canExportFinancialReports && Boolean(projectPlanFactProjectId),
    refetchInterval: STANDARD_REPORT_REFRESH_MS,
  });

  const projectRiskDrilldownQuery = useQuery({
    queryKey: ["reports-project-risk-drilldown", projectRiskProjectId],
    queryFn: ({ signal }) =>
      reportApiFetch<ProjectRiskDrilldownResponse>(
        `/api/v1/admin/reports/project-risk-drilldown/${projectRiskProjectId}?limit=5`,
        signal,
      ),
    enabled: canExportFinancialReports && Boolean(projectRiskProjectId),
    refetchInterval: STANDARD_REPORT_REFRESH_MS,
  });

  const topProjectsMarginQuery = useQuery({
    queryKey: ["reports-projects-margin", "top"],
    queryFn: ({ signal }) =>
      reportApiFetch<ProjectsMarginResponse>(
        `/api/v1/admin/reports/projects-margin?limit=${PROJECT_MARGIN_LIMIT}&sort_by=profit_total&sort_dir=desc`,
        signal,
      ),
    enabled: canExportFinancialReports,
    refetchInterval: STANDARD_REPORT_REFRESH_MS,
  });

  const riskProjectsMarginQuery = useQuery({
    queryKey: ["reports-projects-margin", "risk"],
    queryFn: ({ signal }) =>
      reportApiFetch<ProjectsMarginResponse>(
        `/api/v1/admin/reports/projects-margin?limit=${PROJECT_MARGIN_LIMIT}&sort_by=profit_total&sort_dir=asc`,
        signal,
      ),
    enabled: canExportFinancialReports,
    refetchInterval: STANDARD_REPORT_REFRESH_MS,
  });

  const installersKpiQuery = useQuery({
    queryKey: [
      "reports-installers-kpi",
      installersKpiOffset,
      installersSortBy,
      installersSortDir,
    ],
    queryFn: ({ signal }) =>
      reportApiFetch<InstallersKpiResponse>(
        `/api/v1/admin/reports/installers-kpi?${installersParams.toString()}`,
        signal,
      ),
    enabled: canExportFinancialReports,
    refetchInterval: STANDARD_REPORT_REFRESH_MS,
  });

  const installerDetailsQuery = useQuery({
    queryKey: ["reports-installer-kpi-details", installerDetailsId],
    queryFn: ({ signal }) =>
      reportApiFetch<InstallerKpiDetailsResponse>(
        `/api/v1/admin/reports/installers-kpi/${installerDetailsId}`,
        signal,
      ),
    enabled: canExportFinancialReports && Boolean(installerDetailsId),
    refetchInterval: STANDARD_REPORT_REFRESH_MS,
  });

  const orderNumbersKpiQuery = useQuery({
    queryKey: [
      "reports-order-numbers-kpi",
      orderNumbersKpiOffset,
      orderNumbersSortBy,
      orderNumbersSortDir,
      orderNumbersQueryNormalized,
      orderNumbersProjectId,
    ],
    queryFn: ({ signal }) =>
      reportApiFetch<OrderNumbersKpiResponse>(
        `/api/v1/admin/reports/order-numbers-kpi?${orderNumbersParams.toString()}`,
        signal,
      ),
    enabled: canExportFinancialReports,
    refetchInterval: STANDARD_REPORT_REFRESH_MS,
  });

  const failedOutboxQuery = useQuery({
    queryKey: ["outbox-failed", scopedDeliveryChannel],
    queryFn: ({ signal }) =>
      reportApiFetch<OutboxListResponse>(
        `/api/v1/admin/outbox?${(() => {
          const params = new URLSearchParams();
          params.set("status", "FAILED");
          params.set("limit", String(FAILED_OUTBOX_LIMIT));
          if (scopedDeliveryChannel) {
            params.set("channel", scopedDeliveryChannel);
          }
          return params.toString();
        })()}`,
        signal,
      ),
    refetchInterval: LIVE_REPORT_REFRESH_MS,
  });

  const webhookSignalsQuery = useQuery({
    queryKey: ["reports-webhook-signals", scopedWebhookProvider],
    queryFn: ({ signal }) =>
      reportApiFetch<WebhookSignalListResponse>(
        "/api/v1/admin/outbox/webhook-signals?limit=12",
        signal,
      ),
    refetchInterval: LIVE_REPORT_REFRESH_MS,
  });
  const retryAuditsQuery = useQuery({
    queryKey: ["reports-outbox-retry-audits", scopedOutboxId],
    queryFn: ({ signal }) =>
      reportApiFetch<OutboxRetryAuditListResponse>(
        "/api/v1/admin/outbox/retry-audits?limit=12",
        signal,
      ),
    refetchInterval: LIVE_REPORT_REFRESH_MS,
  });

  const auditCatalogsQuery = useQuery({
    queryKey: [
      "audit-catalogs-preview",
      auditOffset,
      auditEntityType,
      auditAction,
      auditDateFrom,
      auditDateTo,
    ],
    queryFn: ({ signal }) =>
      reportApiFetch<AuditCatalogChangesResponse>(
        `/api/v1/admin/reports/audit-catalogs?${buildAuditParams({
          entityType: auditEntityType,
          action: auditAction,
          dateFrom: auditDateFrom,
          dateTo: auditDateTo,
          limit: AUDIT_PREVIEW_LIMIT,
          offset: auditOffset,
        })}`,
        signal,
      ),
    refetchInterval: 60_000,
  });

  const issueAuditQuery = useQuery({
    queryKey: [
      "audit-issues-preview",
      issueAuditOffset,
      issueAuditAction,
      issueAuditDateFrom,
      issueAuditDateTo,
      issueAuditIssueIdNormalized,
    ],
    queryFn: ({ signal }) =>
      reportApiFetch<AuditCatalogChangesResponse>(
        `/api/v1/admin/reports/audit-issues?${buildAuditParams({
          entityType: "",
          entityId: issueAuditIssueIdNormalized,
          action: issueAuditAction,
          dateFrom: issueAuditDateFrom,
          dateTo: issueAuditDateTo,
          limit: AUDIT_PREVIEW_LIMIT,
          offset: issueAuditOffset,
        })}`,
        signal,
      ),
    refetchInterval: 60_000,
  });

  const markReadMutation = useMutation({
    mutationFn: () =>
      apiFetch<LimitAlertsReadResponse>(
        "/api/v1/admin/reports/limit-alerts/read",
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      ),
    onSuccess: async () => {
      setActionNotice(
        copy(
          "Alerts marked as read.",
          "Алерты отмечены как прочитанные.",
          "ההתראות סומנו כנקראו.",
        ),
      );
      await queryClient.invalidateQueries({ queryKey: ["limit-alerts"] });
      await queryClient.invalidateQueries({
        queryKey: ["limit-alerts-unread"],
      });
    },
  });

  const retryMutation = useMutation({
    mutationFn: (outboxId: string) =>
      apiFetch<OutboxRetryResponse>(`/api/v1/admin/outbox/${outboxId}/retry`, {
        method: "POST",
        body: JSON.stringify({ reason: "manual retry from reports" }),
      }),
    onSuccess: async () => {
      setActionNotice(
        copy(
          "Delivery retry started and reports were refreshed.",
          "Повтор доставки запущен, а отчёты обновлены.",
          "ניסיון המשלוח הופעל מחדש והדוחות רועננו.",
        ),
      );
      await queryClient.invalidateQueries({ queryKey: ["outbox-summary"] });
      await queryClient.invalidateQueries({ queryKey: ["outbox-failed"] });
      await queryClient.invalidateQueries({ queryKey: ["reports-delivery"] });
    },
  });

  const exportAuditMutation = useMutation({
    mutationFn: () =>
      downloadCsvExport(
        `/api/v1/admin/reports/audit-catalogs/export?${buildAuditParams({
          entityType: auditEntityType,
          action: auditAction,
          dateFrom: auditDateFrom,
          dateTo: auditDateTo,
          limit: AUDIT_EXPORT_LIMIT,
          offset: 0,
        })}`,
        "audit_catalogs.csv",
      ),
    onSuccess: () => {
      setActionNotice(
        copy(
          "Catalog audit export is ready.",
          "Экспорт аудита каталога готов.",
          "ייצוא ביקורת הקטלוג מוכן.",
        ),
      );
    },
  });

  const exportIssueAuditMutation = useMutation({
    mutationFn: () =>
      downloadCsvExport(
        `/api/v1/admin/reports/audit-issues/export?${buildAuditParams({
          entityType: "",
          entityId: issueAuditIssueIdNormalized,
          action: issueAuditAction,
          dateFrom: issueAuditDateFrom,
          dateTo: issueAuditDateTo,
          limit: AUDIT_EXPORT_LIMIT,
          offset: 0,
        })}`,
        "audit_issues.csv",
      ),
    onSuccess: () => {
      setActionNotice(
        copy(
          "Issue audit export is ready.",
          "Экспорт аудита проблем готов.",
          "ייצוא ביקורת התקלות מוכן.",
        ),
      );
    },
  });

  const exportInstallersKpiMutation = useMutation({
    mutationFn: () => {
      const params = new URLSearchParams();
      params.set("limit", String(KPI_EXPORT_LIMIT));
      params.set("offset", "0");
      params.set("sort_by", installersSortBy);
      params.set("sort_dir", installersSortDir);
      return downloadCsvExport(
        `/api/v1/admin/reports/installers-kpi/export?${params.toString()}`,
        "installers_kpi.csv",
      );
    },
    onSuccess: () => {
      setActionNotice(
        copy(
          "Installer KPI export is ready.",
          "Экспорт KPI монтажников готов.",
          "ייצוא KPI למתקינים מוכן.",
        ),
      );
    },
  });

  const exportOrderNumbersKpiMutation = useMutation({
    mutationFn: () => {
      const params = new URLSearchParams();
      params.set("limit", String(KPI_EXPORT_LIMIT));
      params.set("offset", "0");
      params.set("sort_by", orderNumbersSortBy);
      params.set("sort_dir", orderNumbersSortDir);
      if (orderNumbersQueryNormalized) {
        params.set("q", orderNumbersQueryNormalized);
      }
      if (orderNumbersProjectId) {
        params.set("project_id", orderNumbersProjectId);
      }
      return downloadCsvExport(
        `/api/v1/admin/reports/order-numbers-kpi/export?${params.toString()}`,
        "order_numbers_kpi.csv",
      );
    },
    onSuccess: () => {
      setActionNotice(
        copy(
          "Order numbers export is ready.",
          "Экспорт по номерам заказов готов.",
          "ייצוא מספרי ההזמנות מוכן.",
        ),
      );
    },
  });

  const exportExecutiveMutation = useMutation({
    mutationFn: () => {
      const params = new URLSearchParams();
      if (projectPlanFactProjectId) {
        params.set("project_plan_fact_project_id", projectPlanFactProjectId);
      }
      if (projectRiskProjectId) {
        params.set("project_risk_project_id", projectRiskProjectId);
      }
      return downloadCsvExport(
        `/api/v1/admin/reports/executive/export?${params.toString()}`,
        "reports_executive_snapshot.csv",
      );
    },
    onSuccess: () => {
      setActionNotice(
        copy(
          "Executive export is ready.",
          "Исполнительный экспорт готов.",
          "ייצוא הנהלה מוכן.",
        ),
      );
    },
  });

  const items = alertsQuery.data?.items || [];
  const unreadCount = alertsQuery.data?.unread_count || 0;
  const opsUnreadCount = operationsCenterQuery.data?.alerts?.unread_count;
  const unreadBadge = opsUnreadCount ?? unreadCount;
  const canGoPrev = offset > 0;
  const canGoNext = items.length >= PAGE_SIZE;

  const delivery = deliveryQuery.data;
  const outboxSummary = outboxSummaryQuery.data;
  const operationsCenter = operationsCenterQuery.data;
  const operationsSla = operationsSlaQuery.data;
  const operationsSlaHistory = operationsSlaHistoryQuery.data;
  const issuesAnalytics = issuesAnalyticsQuery.data;
  const issuesAddonsImpact = issuesAddonsImpactQuery.data;
  const riskConcentration = riskConcentrationQuery.data;
  const installerProfitabilityMatrix =
    installerProfitabilityMatrixQuery.data?.items || [];
  const installerProjectProfitability =
    installerProjectProfitabilityQuery.data?.items || [];
  const projectOptions = useMemo(
    () => projectsQuery.data?.items || [],
    [projectsQuery.data?.items],
  );
  const scopedProjectInOptions = scopedProjectId
    ? projectOptions.some((project) => project.id === scopedProjectId)
    : false;
  const scopedProjectMissing = Boolean(
    scopedProjectId &&
      projectsQuery.isFetched &&
      !projectsQuery.isLoading &&
      !scopedProjectInOptions,
  );
  const projectPlanFact = projectPlanFactQuery.data;
  const projectAddonPlan = useMemo(
    () => projectAddonPlanQuery.data || [],
    [projectAddonPlanQuery.data],
  );
  const projectUrgencySurcharges = useMemo(
    () => projectUrgencySurchargesQuery.data || [],
    [projectUrgencySurchargesQuery.data],
  );
  const selectedProjectPlanFact = useMemo(
    () =>
      projectOptions.find(
        (project) => project.id === projectPlanFactProjectId,
      ) || null,
    [projectOptions, projectPlanFactProjectId],
  );
  const projectAddonPlanTotals = useMemo(
    () =>
      projectAddonPlan.reduce(
        (acc, item) => {
          const qty = Number(item.qty_planned) || 0;
          const clientPrice = Number(item.client_price) || 0;
          const installerPrice = Number(item.installer_price) || 0;
          acc.rows += 1;
          acc.qty += qty;
          acc.client += qty * clientPrice;
          acc.installer += qty * installerPrice;
          return acc;
        },
        { rows: 0, qty: 0, client: 0, installer: 0 },
      ),
    [projectAddonPlan],
  );
  const projectUrgencyTotals = useMemo(
    () =>
      projectUrgencySurcharges.reduce(
        (acc, item) => {
          acc.rows += 1;
          acc.client += Number(item.client_amount) || 0;
          acc.installer += Number(item.installer_amount) || 0;
          if (item.scope === "ORDER_NUMBER") {
            acc.orderScoped += 1;
          }
          return acc;
        },
        { rows: 0, client: 0, installer: 0, orderScoped: 0 },
      ),
    [projectUrgencySurcharges],
  );
  const projectUrgencyContractTotals = useMemo(() => {
    const client =
      Number(
        projectPlanFact?.urgency_client_total ?? projectUrgencyTotals.client,
      ) || 0;
    const installer =
      Number(
        projectPlanFact?.urgency_installer_total ??
          projectUrgencyTotals.installer,
      ) || 0;
    return {
      rows:
        Number(
          projectPlanFact?.urgency_surcharges_count ??
            projectUrgencyTotals.rows,
        ) || 0,
      orderScoped:
        Number(
          projectPlanFact?.urgency_order_surcharges_count ??
            projectUrgencyTotals.orderScoped,
        ) || 0,
      client,
      installer,
      profit:
        Number(projectPlanFact?.urgency_profit_total ?? client - installer) ||
        0,
    };
  }, [projectPlanFact, projectUrgencyTotals]);
  const projectCommercialAdjustments = useMemo(
    () => ({
      rows: projectAddonPlanTotals.rows + projectUrgencyContractTotals.rows,
      client:
        projectAddonPlanTotals.client + projectUrgencyContractTotals.client,
      installer:
        projectAddonPlanTotals.installer +
        projectUrgencyContractTotals.installer,
    }),
    [projectAddonPlanTotals, projectUrgencyContractTotals],
  );
  const issuesImpactSummaryRows = [
    {
      label: tt("reports.openIssuesExposure"),
      revenue: formatAmount(
        issuesAddonsImpact?.summary?.open_issue_revenue_at_risk,
      ),
      payroll: formatAmount(
        issuesAddonsImpact?.summary?.open_issue_payroll_at_risk,
      ),
      profit: formatAmount(
        issuesAddonsImpact?.summary?.open_issue_profit_at_risk,
      ),
    },
    {
      label: tt("reports.delayedNotInstalled"),
      revenue: formatAmount(issuesAddonsImpact?.summary?.delayed_revenue_total),
      payroll: formatAmount(issuesAddonsImpact?.summary?.delayed_payroll_total),
      profit: formatAmount(issuesAddonsImpact?.summary?.delayed_profit_total),
    },
    {
      label: tt("reports.addonRealized"),
      revenue: formatAmount(issuesAddonsImpact?.summary?.addon_revenue_total),
      payroll: formatAmount(issuesAddonsImpact?.summary?.addon_payroll_total),
      profit: formatAmount(issuesAddonsImpact?.summary?.addon_profit_total),
    },
  ];
  const projectPlanFactRows = projectPlanFact
    ? [
        {
          label: t("reports.revenue"),
          plan: formatAmount(projectPlanFact.planned_revenue_total),
          fact: formatAmount(projectPlanFact.actual_revenue_total),
          gap: formatAmount(projectPlanFact.revenue_gap_total),
        },
        {
          label: tt("reports.payroll"),
          plan: formatAmount(projectPlanFact.planned_payroll_total),
          fact: formatAmount(projectPlanFact.actual_payroll_total),
          gap: formatAmount(projectPlanFact.payroll_gap_total),
        },
        {
          label: copy("Profit", "Прибыль", "רווח"),
          plan: formatAmount(projectPlanFact.planned_profit_total),
          fact: formatAmount(projectPlanFact.actual_profit_total),
          gap: formatAmount(projectPlanFact.profit_gap_total),
        },
      ]
    : [];
  const projectRiskDrilldown = projectRiskDrilldownQuery.data;
  const topProjectsMargin = topProjectsMarginQuery.data?.items || [];
  const riskProjectsMargin = useMemo(
    () => riskProjectsMarginQuery.data?.items || [],
    [riskProjectsMarginQuery.data?.items],
  );
  const installersKpiItems = useMemo(
    () => installersKpiQuery.data?.items || [],
    [installersKpiQuery.data?.items],
  );
  const scopedInstallerInKpi = scopedInstallerId
    ? installersKpiItems.some((item) => item.installer_id === scopedInstallerId)
    : false;
  const scopedInstallerMissing = Boolean(
    scopedInstallerId &&
      installersKpiQuery.isFetched &&
      !installersKpiQuery.isLoading &&
      !scopedInstallerInKpi,
  );
  const installerDetails = installerDetailsQuery.data;
  const orderNumbersKpiItems = orderNumbersKpiQuery.data?.items || [];
  const topFailingProjects = operationsCenter?.top_failing_projects || [];
  const slaMetrics = operationsSla?.metrics || [];
  const slaPlaybooks = operationsSla?.playbooks || [];
  const slaHistoryPoints = operationsSlaHistory?.points || [];
  const slaHistorySummary = operationsSlaHistory?.summary;
  const slaHistoryRecent = slaHistoryPoints.slice(-10).reverse();
  const failedItems = failedOutboxQuery.data?.items || [];
  const webhookSignalItems = webhookSignalsQuery.data?.items || [];
  const scopedWebhookSignals = webhookSignalItems.filter(
    (item) =>
      !scopedWebhookProvider ||
      item.provider.toLowerCase() === scopedWebhookProvider,
  );
  const retryAuditItems = retryAuditsQuery.data?.items || [];
  const scopedRetryAuditItems = retryAuditItems.filter(
    (item) => !scopedOutboxId || item.outbox_id === scopedOutboxId,
  );
  const auditItems = auditCatalogsQuery.data?.items || [];
  const auditSummary = auditCatalogsQuery.data?.summary;
  const auditCanPrev = auditOffset > 0;
  const auditCanNext =
    auditOffset + AUDIT_PREVIEW_LIMIT < (auditSummary?.total || 0);
  const issueAuditItems = issueAuditQuery.data?.items || [];
  const issueAuditSummary = issueAuditQuery.data?.summary;
  const issueAuditCanPrev = issueAuditOffset > 0;
  const issueAuditCanNext =
    issueAuditOffset + AUDIT_PREVIEW_LIMIT < (issueAuditSummary?.total || 0);
  const installersKpiCanPrev = installersKpiOffset > 0;
  const installersKpiCanNext = installersKpiItems.length >= KPI_PAGE_SIZE;
  const orderNumbersKpiCanPrev = orderNumbersKpiOffset > 0;
  const orderNumbersKpiCanNext =
    orderNumbersKpiOffset + KPI_PAGE_SIZE <
    (orderNumbersKpiQuery.data?.total || 0);
  const focusedFailingProjectIds = topFailingProjects.map(
    (item) => item.project_id,
  );
  const focusedFailedProjectsHref =
    focusedFailingProjectIds.length > 0
      ? `/projects?failed_project_ids=${encodeURIComponent(
          focusedFailingProjectIds.join(","),
        )}&only_failed_runs=1`
      : "/projects?only_failed_runs=1";
  const focusFollowupActions =
    activeFocus === "operations"
      ? [
          {
            label: t("reports.openActionableOps"),
            href: "/operations?actionable=1",
          },
          {
            label: t("reports.openFailedProjects"),
            href: focusedFailedProjectsHref,
          },
        ]
      : activeFocus === "delivery"
        ? [
            {
              label: t("reports.openActionableOps"),
              href: buildOperationsHref({
                actionable: true,
                deliveryChannel: scopedDeliveryChannel || undefined,
                webhookProvider: scopedWebhookProvider || undefined,
              }),
            },
            { label: t("reports.openJournalQueue"), href: "/journal" },
          ]
        : activeFocus === "issues"
          ? [
              {
                label: t("reports.openActionableOps"),
                href: "/operations?actionable=1",
              },
              { label: t("reports.openIssuesBoard"), href: "/issues" },
            ]
          : [];
  const scopedContext: ReportsScopedContext = {
    projectId: scopedProjectId,
    outboxId: scopedOutboxId,
    installerId: scopedInstallerId,
    deliveryChannel: scopedDeliveryChannel,
    webhookProvider: scopedWebhookProvider,
  };
  const focusTargetId = getReportsFocusTargetId(activeFocus, scopedContext);
  const scopeSummary = scopedProjectId
    ? t("reports.scopedProject").replace("{id}", scopedProjectId)
    : scopedOutboxId
      ? t("reports.scopedOutbox").replace("{id}", scopedOutboxId)
      : scopedDeliveryChannel
        ? t("reports.scopedDeliveryChannel").replace(
            "{id}",
            scopedDeliveryChannel,
          )
        : scopedWebhookProvider
          ? t("reports.scopedWebhookProvider").replace(
              "{id}",
              scopedWebhookProvider,
            )
          : scopedInstallerId
            ? t("reports.scopedInstaller").replace("{id}", scopedInstallerId)
            : null;
  const hasScopedContextOnly =
    !activeFocus &&
    Boolean(
      (scopedProjectId && !scopedProjectMissing) ||
        (scopedInstallerId && !scopedInstallerMissing),
    );
  const scopedContextLabel = scopedProjectId
    ? copy("Focused project", "Выбранный проект", "הפרויקט שנבחר")
    : scopedInstallerId
      ? copy("Focused installer", "Фокус по монтажнику", "מיקוד מתקין")
      : "";
  const scopedContextValue = scopedProjectId || scopedInstallerId || "";
  const reportsJumpLinks = [
    {
      label: copy(
        "Open Operations SLA",
        "Открыть SLA операций",
        "פתח SLA תפעולי",
      ),
      target: "reports-operations-sla",
    },
    {
      label: copy(
        "Open Plan vs Fact",
        "Открыть план / факт",
        "פתח תכנון מול ביצוע",
      ),
      target: "reports-project-plan-fact",
    },
    {
      label: copy(
        "Open Project Risk",
        "Открыть риск проекта",
        "פתח סיכון פרויקט",
      ),
      target: "reports-project-risk-drilldown",
    },
    {
      label: copy(
        "Open Installers KPI",
        "Открыть KPI монтажников",
        "פתח KPI מתקינים",
      ),
      target: "reports-installers-kpi",
    },
  ];

  const refetchAllReports = () => {
    const refreshes: Array<Promise<unknown>> = [
      alertsQuery.refetch(),
      deliveryQuery.refetch(),
      outboxSummaryQuery.refetch(),
      operationsCenterQuery.refetch(),
      operationsSlaQuery.refetch(),
      operationsSlaHistoryQuery.refetch(),
      issuesAnalyticsQuery.refetch(),
      projectsQuery.refetch(),
      failedOutboxQuery.refetch(),
      auditCatalogsQuery.refetch(),
      issueAuditQuery.refetch(),
    ];

    if (canExportFinancialReports) {
      refreshes.push(
        issuesAddonsImpactQuery.refetch(),
        riskConcentrationQuery.refetch(),
        installerProfitabilityMatrixQuery.refetch(),
        installerProjectProfitabilityQuery.refetch(),
        projectPlanFactQuery.refetch(),
        projectAddonPlanQuery.refetch(),
        projectUrgencySurchargesQuery.refetch(),
        projectRiskDrilldownQuery.refetch(),
        topProjectsMarginQuery.refetch(),
        riskProjectsMarginQuery.refetch(),
        installersKpiQuery.refetch(),
        installerDetailsQuery.refetch(),
        orderNumbersKpiQuery.refetch(),
      );
    }

    void Promise.all(refreshes);
  };

  const scrollToReportsSection = (targetId: string) => {
    if (typeof window === "undefined") {
      return;
    }
    const element = document.getElementById(targetId);
    if (!element) {
      return;
    }
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    if (scopedProjectId) {
      if (!projectsQuery.isFetched && projectOptions.length === 0) {
        return;
      }
      if (!scopedProjectInOptions) {
        if (projectPlanFactProjectId) {
          setProjectPlanFactProjectId("");
        }
        return;
      }
      if (projectPlanFactProjectId !== scopedProjectId) {
        setProjectPlanFactProjectId(scopedProjectId);
      }
      return;
    }
    if (projectOptions.length === 0) {
      if (projectPlanFactProjectId) {
        setProjectPlanFactProjectId("");
      }
      return;
    }
    const exists = projectOptions.some(
      (project) => project.id === projectPlanFactProjectId,
    );
    if (!exists) {
      setProjectPlanFactProjectId(projectOptions[0].id);
    }
  }, [
    projectOptions,
    projectPlanFactProjectId,
    projectsQuery.isFetched,
    scopedProjectId,
    scopedProjectInOptions,
  ]);

  useEffect(() => {
    if (scopedProjectId) {
      if (!projectsQuery.isFetched && projectOptions.length === 0) {
        return;
      }
      if (!scopedProjectInOptions) {
        if (projectRiskProjectId) {
          setProjectRiskProjectId("");
        }
        return;
      }
      if (projectRiskProjectId !== scopedProjectId) {
        setProjectRiskProjectId(scopedProjectId);
      }
      return;
    }
    const preferredId =
      riskProjectsMargin[0]?.project_id || projectOptions[0]?.id || "";
    if (!preferredId) {
      if (projectRiskProjectId) {
        setProjectRiskProjectId("");
      }
      return;
    }
    const exists =
      projectOptions.some((project) => project.id === projectRiskProjectId) ||
      riskProjectsMargin.some(
        (project) => project.project_id === projectRiskProjectId,
      );
    if (!exists) {
      setProjectRiskProjectId(preferredId);
    }
  }, [
    projectOptions,
    projectRiskProjectId,
    projectsQuery.isFetched,
    riskProjectsMargin,
    scopedProjectId,
    scopedProjectInOptions,
  ]);

  useEffect(() => {
    if (installersKpiItems.length === 0) {
      if (installerDetailsId) {
        setInstallerDetailsId("");
      }
      return;
    }
    if (scopedInstallerId) {
      if (!scopedInstallerInKpi) {
        if (installerDetailsId) {
          setInstallerDetailsId("");
        }
        return;
      }
      if (installerDetailsId !== scopedInstallerId) {
        setInstallerDetailsId(scopedInstallerId);
      }
      return;
    }
    const exists = installersKpiItems.some(
      (item) => item.installer_id === installerDetailsId,
    );
    if (!exists) {
      setInstallerDetailsId(installersKpiItems[0].installer_id);
    }
  }, [
    installersKpiItems,
    installerDetailsId,
    scopedInstallerId,
    scopedInstallerInKpi,
  ]);

  const exportErrorMessage =
    (exportAuditMutation.isError &&
      readError(
        exportAuditMutation.error,
        t("reports.catalogAuditExportFailed"),
      )) ||
    (exportIssueAuditMutation.isError &&
      readError(
        exportIssueAuditMutation.error,
        t("reports.issueAuditExportFailed"),
      )) ||
    (exportInstallersKpiMutation.isError &&
      readError(
        exportInstallersKpiMutation.error,
        t("reports.installersKpiExportFailed"),
      )) ||
    (exportOrderNumbersKpiMutation.isError &&
      readError(
        exportOrderNumbersKpiMutation.error,
        t("reports.orderNumbersKpiExportFailed"),
      )) ||
    (exportExecutiveMutation.isError &&
      readError(
        exportExecutiveMutation.error,
        t("reports.executiveExportFailed"),
      )) ||
    null;

  useEffect(() => {
    setSavedPresets(readReportsPresets());
  }, []);

  useEffect(() => {
    if (!presetNotice) {
      return undefined;
    }
    const timer = window.setTimeout(() => setPresetNotice(null), 2500);
    return () => window.clearTimeout(timer);
  }, [presetNotice]);

  useEffect(() => {
    if (!actionNotice) {
      return undefined;
    }
    const timer = window.setTimeout(() => setActionNotice(null), 2500);
    return () => window.clearTimeout(timer);
  }, [actionNotice]);

  useEffect(() => {
    if (!activeFocus) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      const target = focusTargetId
        ? document.getElementById(focusTargetId)
        : null;
      target?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeFocus, focusTargetId]);

  useEffect(() => {
    if (!activeOpsPreset) {
      appliedOpsPresetRef.current = null;
      return;
    }
    if (appliedOpsPresetRef.current === activeOpsPreset) {
      return;
    }
    const preset = reportsOpsPresetCopy[activeOpsPreset];
    appliedOpsPresetRef.current = activeOpsPreset;
    setSlaHistoryDays(preset.slaHistoryDays);
  }, [activeOpsPreset, reportsOpsPresetCopy]);

  useEffect(() => {
    if (!scopedProjectId) {
      appliedProjectScopeRef.current = null;
      return;
    }
    if (
      (!projectsQuery.isFetched && projectOptions.length === 0) ||
      appliedProjectScopeRef.current === scopedProjectId
    ) {
      return;
    }
    if (!scopedProjectInOptions) {
      appliedProjectScopeRef.current = null;
      if (orderNumbersProjectId) {
        setOrderNumbersProjectId("");
      }
      return;
    }
    appliedProjectScopeRef.current = scopedProjectId;
    setProjectPlanFactProjectId(scopedProjectId);
    setProjectRiskProjectId(scopedProjectId);
    setOrderNumbersProjectId(scopedProjectId);
    setOrderNumbersKpiOffset(0);
  }, [
    orderNumbersProjectId,
    projectOptions,
    projectsQuery.isFetched,
    scopedProjectId,
    scopedProjectInOptions,
  ]);

  useEffect(() => {
    if (!scopedInstallerId) {
      appliedInstallerScopeRef.current = null;
      return;
    }
    if (
      installersKpiItems.length === 0 ||
      appliedInstallerScopeRef.current === scopedInstallerId
    ) {
      return;
    }
    const exists = installersKpiItems.some(
      (item) => item.installer_id === scopedInstallerId,
    );
    if (!exists) {
      return;
    }
    appliedInstallerScopeRef.current = scopedInstallerId;
    setInstallerDetailsId(scopedInstallerId);
  }, [installersKpiItems, scopedInstallerId]);

  function applyPreset(preset: ReportsPreset): void {
    setSlaHistoryDays(preset.slaHistoryDays);
    setInstallerMatrixSortBy(preset.installerMatrixSortBy);
    setInstallerMatrixSortDir(preset.installerMatrixSortDir);
    setInstallerProjectSortBy(preset.installerProjectSortBy);
    setInstallerProjectSortDir(preset.installerProjectSortDir);
    setInstallersSortBy(preset.installersSortBy);
    setInstallersSortDir(preset.installersSortDir);
    setOrderNumbersSortBy(preset.orderNumbersSortBy);
    setOrderNumbersSortDir(preset.orderNumbersSortDir);
    setOrderNumbersQuery(preset.orderNumbersQuery);
    setOrderNumbersProjectId(preset.orderNumbersProjectId);
    setProjectPlanFactProjectId(preset.projectPlanFactProjectId);
    setProjectRiskProjectId(preset.projectRiskProjectId);
    setInstallersKpiOffset(0);
    setOrderNumbersKpiOffset(0);
    setPresetNotice(t("reports.presetLoaded").replace("{name}", preset.name));
  }

  function handleSavePreset(): void {
    const normalizedName = presetName.trim();
    if (!normalizedName) {
      setPresetNotice(t("reports.presetNameRequired"));
      return;
    }
    const preset: ReportsPreset = {
      id: crypto.randomUUID(),
      name: normalizedName,
      created_at: new Date().toISOString(),
      slaHistoryDays,
      installerMatrixSortBy,
      installerMatrixSortDir,
      installerProjectSortBy,
      installerProjectSortDir,
      installersSortBy,
      installersSortDir,
      orderNumbersSortBy,
      orderNumbersSortDir,
      orderNumbersQuery,
      orderNumbersProjectId,
      projectPlanFactProjectId,
      projectRiskProjectId,
    };
    const next = [preset, ...savedPresets].slice(0, 12);
    writeReportsPresets(next);
    setSavedPresets(next);
    setSelectedPresetId(preset.id);
    setPresetName("");
    setPresetNotice(t("reports.presetSaved").replace("{name}", preset.name));
  }

  function handleApplySelectedPreset(): void {
    const preset = savedPresets.find((item) => item.id === selectedPresetId);
    if (!preset) {
      setPresetNotice(t("reports.selectPresetFirst"));
      return;
    }
    applyPreset(preset);
  }

  function handleDeleteSelectedPreset(): void {
    if (!selectedPresetId) {
      setPresetNotice(t("reports.selectPresetFirst"));
      return;
    }
    const next = savedPresets.filter((item) => item.id !== selectedPresetId);
    writeReportsPresets(next);
    setSavedPresets(next);
    setSelectedPresetId("");
    setPresetNotice(t("reports.presetDeleted"));
  }

  const scrollToReport = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };
  const reportsLastRefresh =
    operationsCenter?.generated_at ||
    issuesAnalytics?.generated_at ||
    issuesAddonsImpact?.generated_at ||
    riskConcentration?.generated_at ||
    null;
  const marginLeakageValue =
    toReportNumber(issuesAddonsImpact?.summary?.open_issue_profit_at_risk) +
    toReportNumber(issuesAddonsImpact?.summary?.delayed_profit_total);
  const installerDoorTotal = installersKpiItems.reduce(
    (sum, item) => sum + item.installed_doors,
    0,
  );
  const installerMissingRates = installersKpiItems.reduce(
    (sum, item) => sum + item.missing_rates_installed_doors,
    0,
  );
  const topInstaller = installersKpiItems[0]?.installer_name || "n/a";
  const reportsInsights: ReportsInsight[] = [
    {
      eyebrow: "Margin leakage watch",
      title: "Add-ons and delayed work need commercial review",
      value: canExportFinancialReports
        ? `${formatAmount(marginLeakageValue)} NIS`
        : "Restricted",
      delta: canExportFinancialReports
        ? `${formatCount(issuesAddonsImpact?.summary?.missing_addon_plans_facts)} missing plan links`
        : "finance access required",
      detail:
        canExportFinancialReports && issuesAddonsImpact?.top_reasons?.[0]
          ? `Top reason: ${issuesAddonsImpact.top_reasons[0].reason_name}.`
          : "Uses existing add-on impact and issue exposure reports.",
      cta: "Review commercial reports",
      onClick: () => scrollToReport("reports-issues-addons-impact"),
      tone: marginLeakageValue > 0 ? "red" : "green",
      variant: marginLeakageValue > 0 ? "line-down" : "line-up",
    },
    {
      eyebrow: "Risk concentration watch",
      title: "Backlog and profit risk by project",
      value: canExportFinancialReports
        ? `${formatCount(riskConcentration?.summary?.risky_projects)} projects`
        : "Restricted",
      delta: canExportFinancialReports
        ? `${formatAmount(
            toReportNumber(riskConcentration?.summary?.open_issue_profit_at_risk),
          )} NIS at risk`
        : "finance access required",
      detail:
        canExportFinancialReports && riskConcentration?.projects?.[0]
          ? `Worst project: ${riskConcentration.projects[0].project_name}.`
          : "Concentrates project, order and installer risk in one view.",
      cta: "Open risk block",
      onClick: () => scrollToReport("reports-project-risk-drilldown"),
      tone:
        (riskConcentration?.summary?.risky_projects ?? 0) > 0
          ? "orange"
          : "green",
      variant: "bars",
    },
    {
      eyebrow: "Installer KPI trend",
      title: "Team delivery and rate coverage",
      value: formatCount(installerDoorTotal),
      delta: `${formatCount(installerMissingRates)} installed doors missing rates`,
      detail: `Top installer in current sort: ${topInstaller}.`,
      cta: "Open installer KPI",
      onClick: () => scrollToReport("reports-installers-kpi"),
      tone: installerMissingRates > 0 ? "orange" : "green",
      variant: "line-up",
    },
  ];
  const reportsLibraryGroups: ReportsLibraryGroup[] = [
    {
      title: "Financial control",
      subtitle: "revenue, payroll, margin",
      count: 6,
      icon: ReceiptText,
      tone: "green",
      rows: [
        {
          icon: "PF",
          title: "Project commercial plan/fact",
          subtitle: "planned vs actual revenue and payroll",
          badge: "live",
          meta: "5m",
          onClick: () => scrollToReport("reports-project-plan-fact"),
        },
        {
          icon: "PL",
          title: "Payroll and earnings ledger",
          subtitle: "installer payouts and project filters",
          badge: "pinned",
          meta: "5m",
          onClick: () => router.push("/earnings-ledger"),
        },
        {
          icon: "ML",
          title: "Leakage and add-on impact",
          subtitle: "missing plans, urgency uplift, delayed profit",
          badge: "new",
          meta: "30m",
          onClick: () => scrollToReport("reports-issues-addons-impact"),
        },
      ],
    },
    {
      title: "Operational control",
      subtitle: "imports, outbox, SLA, issues",
      count: 7,
      icon: Wrench,
      tone: "orange",
      rows: [
        {
          icon: "OC",
          title: "Operations command snapshot",
          subtitle: "failed imports, delivery risk, unread alerts",
          badge: "live",
          meta: "live",
          onClick: () => scrollToReport("reports-operations-center"),
        },
        {
          icon: "SLA",
          title: "SLA and playbook health",
          subtitle: "recovery metrics and action playbooks",
          meta: "30m",
          onClick: () => scrollToReport("reports-operations-sla"),
        },
        {
          icon: "DL",
          title: "Delivery and outbox failures",
          subtitle: "failed communication, retry trail, webhook scope",
          meta: "live",
          onClick: () => scrollToReport("reports-delivery-risk"),
        },
      ],
    },
    {
      title: "Installers",
      subtitle: "performance, workload, cross-view",
      count: 6,
      icon: Users,
      tone: "blue",
      rows: [
        {
          icon: "KPI",
          title: "Installer scorecard",
          subtitle: "doors, earnings, missing rates, issues",
          badge: "live",
          meta: "5m",
          onClick: () => scrollToReport("reports-installers-kpi"),
        },
        {
          icon: "XP",
          title: "Installer/project profitability",
          subtitle: "who worked where and margin by combination",
          meta: "1h",
          onClick: () => scrollToReport("reports-installer-cross-view"),
        },
        {
          icon: "ON",
          title: "Order number progress",
          subtitle: "door completion and profit by order number",
          meta: "30m",
          onClick: () => scrollToReport("reports-order-numbers-kpi"),
        },
      ],
    },
    {
      title: "System and audit",
      subtitle: "audit, integrations, sync",
      count: 4,
      icon: ShieldAlert,
      tone: "neutral",
      rows: [
        {
          icon: "AU",
          title: "Catalog audit export",
          subtitle: "catalog, sync-state and admin changes",
          meta: "5m",
          onClick: () => scrollToReport("reports-audit-catalogs"),
        },
        {
          icon: "IS",
          title: "Issue audit timeline",
          subtitle: "problem lifecycle and operator activity",
          meta: "5m",
          onClick: () => scrollToReport("reports-issue-audit"),
        },
        {
          icon: "WH",
          title: "Webhook and delivery trail",
          subtitle: "provider events and retry audit",
          badge: "live",
          meta: "live",
          onClick: () => scrollToReport("reports-delivery-scope"),
        },
      ],
    },
  ];
  const reportsLibraryCount = reportsLibraryGroups.reduce(
    (sum, group) => sum + group.count,
    0,
  );
  const pinnedSavedViews = savedPresets.slice(0, 4);

  return (
    <DashboardLayout>
      <div className="page-shell page-stack-tight motion-stagger">
        <section
          data-testid="reports-dashboard-v3"
          className="overflow-hidden rounded-[14px] border border-border bg-surface-subtle shadow-sm"
        >
          <div className="flex items-center gap-3 border-b border-border px-3 py-2">
            <div className="rounded-full bg-text px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
              DIMAX
            </div>
            <div className="min-w-0 flex-1 truncate text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
              {copy("DIMAX GROUP · REPORTS", "DIMAX GROUP · ОТЧЕТЫ", "קבוצת דימקס · דוחות")}
            </div>
            <div className="rounded-full border border-status-warning-border bg-status-warning-bg px-2.5 py-1 text-[10.5px] font-medium text-status-warning-fg">
              {copy("Unread", "Непрочитано", "לא נקראו")} {unreadBadge}
            </div>
          </div>

          <div className="space-y-5 p-4 md:p-5">
            <div className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-link">
              {copy("Dashboard", "Главная", "ראשי")} <span className="mx-1 text-text-tertiary">#</span>
              <span className="text-text">{copy("Reports cockpit", "Панель отчётов", "לוח דוחות")}</span>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <h1 className="text-[26px] font-semibold leading-tight text-text">
                  {copy("Reports cockpit", "Панель отчётов", "לוח דוחות")}
                </h1>
                <p className="mt-1 max-w-4xl text-[12.5px] leading-5 text-text-secondary">
                  <b className="font-medium text-text">
                    {reportsLibraryCount}
                  </b>{" "}
                  {copy("report signals ·", "сигналы отчета ·", "אותות דיווח ·")}{" "}
                  <b className="font-medium text-text">
                    {savedPresets.length}
                  </b>{" "}
                  {copy("saved views · scheduled exports are manual in this build · last refresh", "сохраненные просмотры · запланированный экспорт в этой сборке выполняется вручную · последнее обновление", "תצוגות שמורות · יצוא מתוכנן הוא ידני בגירסה זו · רענון אחרון")}{" "}
                  <b className="font-medium text-text">
                    {reportsLastRefresh
                      ? formatDateTime(reportsLastRefresh)
                      : copy("not loaded", "не загружено", "לא נטען")}
                  </b>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={refetchAllReports}
                  className="dmx-secondary-action"
                >
                  <RefreshCw className="h-4 w-4" strokeWidth={1.8} />
                  {t("common.refresh")}
                </button>
                <button
                  type="button"
                  onClick={() => exportExecutiveMutation.mutate()}
                  disabled={
                    !canExportFinancialReports ||
                    exportExecutiveMutation.isPending
                  }
                  title={privilegedActionHint}
                  className="dmx-secondary-action disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FileText className="h-4 w-4" strokeWidth={1.8} />
                  {copy("Export snapshot", "Экспортировать снимок", "ייצא תמונת מצב")}
                </button>
                {canOpenOperations ? (
                  <button
                    type="button"
                    onClick={() => router.push("/operations")}
                    className="dmx-primary-action"
                  >
                    <Wrench className="h-4 w-4" strokeWidth={1.8} />
                    {copy("Open operations", "Открытие операций", "פעולות פתוחות")}
                  </button>
                ) : null}
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <LineChart className="h-4 w-4 text-text-secondary" />
                  <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
                    {copy("Attention this week", "Внимание на этой неделе", "שימו לב השבוע")}
                  </div>
                  <div className="rounded-full bg-surface px-2 py-0.5 text-[10.5px] text-text-secondary">
                    {copy("live reports", "прямые репортажи", "דיווחים חיים")}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/operations?actionable=1")}
                  className="text-[11.5px] font-medium text-link"
                >
                  {copy("Open action queue", "Открыть очередь действий", "פתיחת תור פעולות")}
                </button>
              </div>
              <div className="grid gap-3 xl:grid-cols-3">
                {reportsInsights.map((insight) => (
                  <ReportsInsightCard key={insight.eyebrow} insight={insight} />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <FolderKanban className="h-4 w-4 text-text-secondary" />
                  <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
                    {copy("Report library", "Библиотека отчетов", "ספריית דוחות")}
                  </div>
                  <div className="rounded-full bg-surface px-2 py-0.5 text-[10.5px] text-text-secondary">
                    {reportsLibraryCount} {copy("mapped", "сопоставлено", "ממופה")}
                  </div>
                </div>
                <div className="text-[11.5px] font-medium text-text-secondary">
                  {copy("API-first, no fake reports", "API-прежде всего, никаких поддельных отчетов", "תחילה API, ללא דוחות מזויפים")}
                </div>
              </div>
              <div className="grid gap-3 xl:grid-cols-2">
                {reportsLibraryGroups.map((group) => (
                  <ReportsLibraryCard key={group.title} group={group} locale={locale} />
                ))}
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)]">
              <div className="rounded-[12px] border border-border bg-surface p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
                      {copy("Saved views", "Сохраненные просмотры", "תצוגות שמורות")}
                    </div>
                    <div className="mt-1 text-[12px] text-text-secondary">
                      {copy("Operator filters stored locally for this browser.", "Фильтры операторов, хранящиеся локально для этого браузера.", "מסנני מפעיל המאוחסנים באופן מקומי עבור דפדפן זה.")}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setPresetNotice(
                        copy(
                          "Name the current filter in the controls below, then save it.",
                          "Назови текущий фильтр в панели ниже и сохрани его.",
                          "תן שם למסנן הנוכחי באזור הבקרה למטה ושמור אותו.",
                        ),
                      )
                    }
                    className="dmx-secondary-action"
                  >
                    <Plus className="h-4 w-4" strokeWidth={1.8} />
                    {copy("Save current filter", "Сохранить текущий фильтр", "שמור את המסנן הנוכחי")}
                  </button>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {pinnedSavedViews.length === 0 ? (
                    <div className="rounded-[10px] border border-dashed border-border bg-surface-subtle px-4 py-5 text-[12px] leading-5 text-text-secondary md:col-span-2">
                      {copy("No saved report views yet. Save the current filters below to pin an operator view.", "Пока нет сохраненных просмотров отчетов. Сохраните текущие фильтры ниже, чтобы закрепить представление оператора.", "אין עדיין תצוגות דוח שמורות. שמור את המסננים הנוכחיים למטה כדי להצמיד תצוגת מפעיל.")}
                    </div>
                  ) : (
                    pinnedSavedViews.map((preset) => (
                      <SavedReportViewCard
                        key={preset.id}
                        eyebrow={copy("saved view", "сохранённый вид", "תצוגה שמורה")}
                        title={preset.name}
                        value={formatDateTime(preset.created_at)}
                        tone="blue"
                      />
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-[12px] border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
                      {copy("Scheduled exports", "Экспорт по расписанию", "ייצוא מתוכנן")}
                    </div>
                    <div className="mt-1 text-[12px] leading-5 text-text-secondary">
                      {copy("Scheduler backend is not configured here. Use manual CSV exports until a real schedule service is added.", "Серверная часть планировщика здесь не настроена. Используйте экспорт CSV вручную, пока не будет добавлена ​​реальная служба расписания.", "הקצה האחורי של המתזמן אינו מוגדר כאן. השתמש בייצוא CSV ידני עד להוספת שירות לוח זמנים אמיתי.")}
                    </div>
                  </div>
                  <CalendarClock className="h-5 w-5 shrink-0 text-text-tertiary" />
                </div>
                <div className="mt-4 grid gap-2">
                  <button
                    type="button"
                    onClick={() => exportExecutiveMutation.mutate()}
                    disabled={
                      !canExportFinancialReports ||
                      exportExecutiveMutation.isPending
                    }
                    title={privilegedActionHint}
                    className="dmx-secondary-action justify-center disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {copy("Executive CSV now", "Исполнительный CSV сейчас", "מנהל CSV עכשיו")}
                  </button>
                  <button
                    type="button"
                    onClick={() => exportInstallersKpiMutation.mutate()}
                    disabled={
                      !canExportFinancialReports ||
                      exportInstallersKpiMutation.isPending
                    }
                    title={ratesScopeHint}
                    className="dmx-secondary-action justify-center disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {copy("Installers CSV now", "CSV-файл для установки прямо сейчас", "מתקינים CSV עכשיו")}
                  </button>
                  <button
                    type="button"
                    onClick={() => exportOrderNumbersKpiMutation.mutate()}
                    disabled={
                      !canExportFinancialReports ||
                      exportOrderNumbersKpiMutation.isPending
                    }
                    title={ratesScopeHint}
                    className="dmx-secondary-action justify-center disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {copy("Orders CSV now", "Заказывает CSV сейчас", "הזמנות CSV עכשיו")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="toolbar-panel grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-[12px] text-text-secondary">
            <BellRing className="h-4 w-4 text-text-secondary" />
            <span>{t("reports.helper")}</span>
            <span>{copy("Unread:", "Непрочитано:", "לא נקראו:")}</span>
            <span className="rounded-full border border-status-warning-border bg-status-warning-bg px-2.5 py-1 text-[11px] font-medium text-status-warning-fg">
              {copy("Alert queue", "Очередь алертов", "תור ההתראות")}{" "}
              {unreadBadge}
            </span>
            <button
              type="button"
              onClick={() => markReadMutation.mutate()}
              disabled={
                !canRunPrivilegedActions ||
                markReadMutation.isPending ||
                unreadCount === 0
              }
              title={ratesScopeHint}
              className="dmx-secondary-action disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CheckCheck className="h-4 w-4" strokeWidth={1.8} />
              {t("reports.markAllRead")}
            </button>
          </div>
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_auto_auto]">
            <input
              aria-label={t("reports.presetName")}
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder={t("reports.savePreset")}
              className="control-input h-8 text-[12px]"
            />
            <button
              type="button"
              onClick={handleSavePreset}
              className="dmx-secondary-action"
            >
              {t("reports.savePreset")}
            </button>
            <select
              aria-label={copy("Saved Presets", "Сохранённые наборы", "ערכות שמורות")}
              value={selectedPresetId}
              onChange={(e) => setSelectedPresetId(e.target.value)}
              className="control-input h-8 text-[12px]"
            >
              <option value="">{t("reports.savedPresets")}</option>
              {savedPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleApplySelectedPreset}
              className="dmx-secondary-action"
            >
              {t("reports.applyPreset")}
            </button>
            <button
              type="button"
              onClick={handleDeleteSelectedPreset}
              className="dmx-secondary-action"
            >
              {t("reports.deletePreset")}
            </button>
            <button
              type="button"
              onClick={() => exportExecutiveMutation.mutate()}
              disabled={
                !canExportFinancialReports || exportExecutiveMutation.isPending
              }
              title={privilegedActionHint}
              aria-label={t("reports.exportExecutiveCsv")}
              className="dmx-secondary-action disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("reports.exportExecutiveCsv")}
            </button>
          </div>
        </section>

        {alertsQuery.isError && (
          <div
            className={cn(
              reportsNoticeClass("error"),
              "flex items-start gap-2",
            )}
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              {readError(alertsQuery.error, t("reports.failedAlerts"))}
            </span>
          </div>
        )}
        {exportErrorMessage && (
          <div
            className={cn(
              reportsNoticeClass("error"),
              "flex items-start gap-2",
            )}
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{exportErrorMessage}</span>
          </div>
        )}
        {actionNotice && (
          <div
            className={cn(
              reportsNoticeClass("success"),
              "flex items-start gap-2",
            )}
          >
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}
        {presetNotice && (
          <div className={reportsNoticeClass("muted")}>{presetNotice}</div>
        )}
        {scopedProjectMissing && (
          <div
            className={cn(
              reportsNoticeClass("warning"),
              "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
            )}
          >
            <div className="flex min-w-0 items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {copy(
                  `Requested project ${scopedProjectId} is not available in the current reports scope. Project-specific reports were not switched to another project.`,
                  `Объект ${scopedProjectId} недоступен в текущем контексте отчётов. Объектные отчёты не были переключены на другой проект.`,
                  `הפרויקט ${scopedProjectId} אינו זמין בהקשר הדוחות הנוכחי. הדוחות לפי פרויקט לא הועברו לפרויקט אחר.`,
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={() => router.push("/reports")}
              className="dmx-secondary-action shrink-0"
            >
              {copy("Show full report", "Показать полный отчёт", "הצג דוח מלא")}
            </button>
          </div>
        )}
        {scopedInstallerMissing && (
          <div
            className={cn(
              reportsNoticeClass("warning"),
              "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
            )}
          >
            <div className="flex min-w-0 items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {copy(
                  `Requested installer ${scopedInstallerId} is not available in the current reports scope. Installer-specific reports were not switched to another installer.`,
                  `Монтажник ${scopedInstallerId} недоступен в текущем контексте отчётов. Отчёты по монтажнику не были переключены на другого монтажника.`,
                  `המתקין ${scopedInstallerId} אינו זמין בהקשר הדוחות הנוכחי. הדוחות לפי מתקין לא הועברו למתקין אחר.`,
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={() => router.push("/reports")}
              className="dmx-secondary-action shrink-0"
            >
              {copy("Show full report", "Показать полный отчёт", "הצג דוח מלא")}
            </button>
          </div>
        )}
        {hasScopedContextOnly && (
          <div className={reportsNoticeClass("accent")}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-medium text-text">
                  {scopedContextLabel} {scopedContextValue}
                </div>
                <div className="mt-1 text-text-secondary">
                  {copy(
                    "This report is narrowed to one linked context. You can return to the full report at any time.",
                    "Этот отчёт открыт в контексте одной связанной сущности. В любой момент можно вернуться к полному обзору.",
                    "הדוח פתוח בהקשר ממוקד של ישות אחת. אפשר לחזור בכל רגע לתצוגה המלאה.",
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => router.push("/reports")}
                className="dmx-secondary-action"
              >
                {copy(
                  "Show full report",
                  "Показать полный отчёт",
                  "הצג דוח מלא",
                )}
              </button>
            </div>
          </div>
        )}
        {activeFocus && (
          <div className={reportsNoticeClass("accent")}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-medium text-text">
                  {reportsFocusCopy[activeFocus].title}
                </div>
                <div className="mt-1 text-text-secondary">
                  {reportsFocusCopy[activeFocus].description}
                </div>
                {activeOpsPreset && (
                  <div className="mt-2 text-[12px] text-text-secondary">
                    {reportsOpsPresetCopy[activeOpsPreset].title}.{" "}
                    {reportsOpsPresetCopy[activeOpsPreset].description}
                  </div>
                )}
                {scopeSummary && (
                  <div className="mt-2 text-[12px] text-text-secondary">
                    {scopeSummary}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {focusFollowupActions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => router.push(action.href)}
                    className="dmx-secondary-action"
                  >
                    {action.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => router.push("/reports")}
                  className="dmx-secondary-action"
                >
                  {t("reports.clearFocus")}
                </button>
              </div>
            </div>
          </div>
        )}
        {!canRunPrivilegedActions && (
          <div
            className={cn(
              reportsNoticeClass("warning"),
              "flex items-start gap-2",
            )}
          >
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{t("reports.readOnlyNotice")}</span>
          </div>
        )}
        {!canExportFinancialReports && (
          <div className="rounded-lg border border-border bg-surface-subtle px-4 py-3 text-[13px] text-text-secondary flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-status-warning-fg" />
            <span>
              <span className="font-medium text-text">
                {financialReportsRestrictedTitle}
              </span>{" "}
              {financialReportsRestrictedDetail}
            </span>
          </div>
        )}

        <div
          id="reports-operations-center"
          className={reportsPanelClass("relative overflow-hidden p-4")}
        >
          <div className="relative z-10 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase text-text-secondary">
                  {t("reports.operationsCommandCenter")}
                </div>
                <h2 className="mt-1 text-lg font-semibold tracking-tight text-text">
                  {t("reports.realTimePressureMap")}
                </h2>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="text-end">
                  <div className="text-[11px] uppercase text-text-secondary">
                    {t("reports.generated")}
                  </div>
                  <div className="text-[12px] text-text">
                    {operationsCenter?.generated_at
                      ? formatDateTime(operationsCenter.generated_at)
                      : t("reports.notAvailable")}
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => router.push("/operations")}
                    className="dmx-secondary-action"
                  >
                    {tt("reports.openOperationsCenter")}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/operations?actionable=1")}
                    className="dmx-secondary-action"
                  >
                    {tt("reports.openActionableOps")}
                  </button>
                </div>
              </div>
            </div>

            {operationsCenterQuery.isLoading ? (
              <div className="text-[13px] text-text-secondary">
                {tt("reports.loadingCommandCenter")}
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-4">
                <div className={reportsMetricCardClass("soft")}>
                  <div className="text-[11px] uppercase text-text-secondary">
                    {t("reports.imports24h")}
                  </div>
                  <div className="mt-1 text-xl font-semibold text-text">
                    {operationsCenter?.imports?.total_runs ?? 0}
                  </div>
                  <div className="mt-1 text-[12px] text-text-secondary">
                    {copy("Success", "Успех", "הצלחה")} {operationsCenter?.imports?.success_runs ?? 0} {copy("| Partial", "| Частичный", "| חלקי")} {operationsCenter?.imports?.partial_runs ?? 0} {copy("| Failed", "| Не удалось", "| נכשל")} {operationsCenter?.imports?.failed_runs ?? 0}
                  </div>
                </div>

                <div className={reportsMetricCardClass("soft")}>
                  <div className="text-[11px] uppercase text-text-secondary">
                    {tt("reports.importModes")}
                  </div>
                  <div className="mt-1 text-xl font-semibold text-text">
                    {operationsCenter?.imports?.import_runs ?? 0}
                  </div>
                  <div className="mt-1 text-[12px] text-text-secondary">
                    {tt("reports.analyzeRetry")
                      .replace(
                        "{analyze}",
                        String(operationsCenter?.imports?.analyze_runs ?? 0),
                      )
                      .replace(
                        "{retry}",
                        String(operationsCenter?.imports?.retry_runs ?? 0),
                      )}
                  </div>
                </div>

                <div className={reportsMetricCardClass("danger")}>
                  <div className="text-[11px] uppercase text-text-secondary">
                    {tt("reports.outboxRisk")}
                  </div>
                  <div className="mt-1 text-xl font-semibold text-text">
                    {operationsCenter?.outbox?.failed_total ?? 0}
                  </div>
                  <div className="mt-1 text-[12px] text-text-secondary">
                    {copy("Failed | Overdue", "Ошибка | Просрочено", "נכשל | באיחור")}{" "}
                    {operationsCenter?.outbox?.pending_overdue_15m ?? 0}
                  </div>
                </div>

                <div className={reportsMetricCardClass("warning")}>
                  <div className="text-[11px] uppercase text-text-secondary">
                    {tt("reports.limitAlerts")}
                  </div>
                  <div className="mt-1 text-xl font-semibold text-text">
                    {operationsCenter?.alerts?.unread_count ?? unreadCount}
                  </div>
                  <div className="mt-1 text-[12px] text-text-secondary">
                    {tt("reports.warnDanger24h")
                      .replace(
                        "{warn}",
                        String(operationsCenter?.alerts?.warn_last_24h ?? 0),
                      )
                      .replace(
                        "{danger}",
                        String(operationsCenter?.alerts?.danger_last_24h ?? 0),
                      )}
                  </div>
                </div>
              </div>
            )}

            <div className="surface-subtle p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="text-[11px] uppercase text-text-secondary">
                  {tt("reports.topFailingProjectsTitle")}
                </div>
                <button
                  onClick={() => {
                    if (topFailingProjects.length === 0) {
                      return;
                    }
                    const ids = topFailingProjects
                      .map((item) => item.project_id)
                      .join(",");
                    router.push(
                      `/projects?failed_project_ids=${encodeURIComponent(
                        ids,
                      )}&only_failed_runs=1`,
                    );
                  }}
                  disabled={topFailingProjects.length === 0}
                  className="dmx-secondary-action disabled:opacity-50"
                >
                  {tt("reports.openInProjects")}
                </button>
              </div>
              {topFailingProjects.length === 0 ? (
                <div className="text-[12px] text-text-secondary">
                  {tt("reports.noFailingProjectsCurrentWindow")}
                </div>
              ) : (
                <div className="grid gap-2">
                  {topFailingProjects.slice(0, 3).map((item) => (
                    <div
                      key={`${item.project_id}-${item.last_run_at}`}
                      className="grid grid-cols-[1fr_80px_170px_74px] items-center gap-2 rounded-lg border border-border bg-surface-subtle px-3 py-2 text-[12px]"
                    >
                      <div className="font-medium text-text truncate">
                        {item.project_name}
                      </div>
                      <div className="text-text-secondary text-end">
                        {tt("reports.failureRuns").replace(
                          "{count}",
                          String(item.failure_runs),
                        )}
                      </div>
                      <div className="text-text-secondary text-end">
                        {formatDateTime(item.last_run_at)}
                      </div>
                      <button
                        onClick={() =>
                          router.push(
                            `/projects?project_id=${encodeURIComponent(
                              item.project_id,
                            )}&failed_project_ids=${encodeURIComponent(
                              item.project_id,
                            )}&only_failed_runs=1`,
                          )
                        }
                        className="h-7 rounded-lg border border-border bg-surface-subtle px-2 text-[11px] font-medium"
                      >
                        {tt("reports.openShort")}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          id="reports-operations-sla"
          className={reportsPanelClass("space-y-4 p-4")}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase text-text-secondary">
                {tt("reports.operationsSlaTitle")}
              </div>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-text">
                {tt("reports.healthMetricsPlaybooks")}
              </h2>
            </div>
            <span
              className={cn(
                "inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-semibold",
                SLA_STATUS_CLASS[operationsSla?.overall_status || ""] ||
                  "text-text-secondary bg-surface-subtle border-border",
              )}
            >
              {operationsSla?.overall_status || tt("reports.notAvailableShort")}
            </span>
          </div>

          {operationsSlaQuery.isLoading ? (
            <div className="text-[13px] text-text-secondary">
              {tt("reports.loadingSlaMetrics")}
            </div>
          ) : operationsSlaQuery.isError ? (
            <div className="text-[13px] text-status-problem-fg">
              {readError(
                operationsSlaQuery.error,
                "Failed to load SLA metrics",
              )}
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-5">
                {slaMetrics.map((metric) => (
                  <div
                    key={metric.code}
                    className={reportsMetricCardClass(
                      metric.status === "DANGER"
                        ? "danger"
                        : metric.status === "WARN"
                          ? "warning"
                          : "success",
                    )}
                  >
                    <div className="text-[11px] uppercase text-text-secondary">
                      {metric.title}
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <div className="text-lg font-semibold text-text">
                        {metric.current}
                        <span className="ms-1 text-[11px] font-normal text-text-secondary">
                          {metric.unit}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold",
                          SLA_STATUS_CLASS[metric.status] ||
                            "text-text-secondary bg-surface-subtle border-border",
                        )}
                      >
                        {metric.status}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-text-secondary">
                      {copy("target", "цель", "יעד")} {metric.target} |{" "}
                      {copy("warn", "предупр.", "אזהרה")}{" "}
                      {metric.warn_threshold} |{" "}
                      {copy("danger", "риск", "סיכון")}{" "}
                      {metric.danger_threshold}
                    </div>
                  </div>
                ))}
              </div>

              <div className="surface-subtle space-y-3 p-4">
                <div className="text-[11px] uppercase text-text-secondary">
                  {copy(
                    "Action Playbooks",
                    "Сценарии действий",
                    "תרחישי פעולה",
                  )}
                </div>
                {slaPlaybooks.map((playbook) => (
                  <div
                    key={playbook.code}
                    className="grid grid-cols-[1fr_120px] items-center gap-2 rounded-lg border border-border bg-surface-subtle px-3 py-2.5 text-[12px]"
                  >
                    <div>
                      <div className="font-medium text-text">
                        {playbook.title}
                        <span
                          className={cn(
                            "ml-2 inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
                            SLA_STATUS_CLASS[playbook.severity] ||
                              "text-text-secondary bg-surface-subtle border-border",
                          )}
                        >
                          {playbook.severity}
                        </span>
                      </div>
                      <div className="text-text-secondary">
                        {playbook.description}
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(playbook.action_url)}
                      className="h-8 rounded-lg border border-border bg-surface-subtle px-3 text-[12px] font-medium"
                    >
                      {copy("Open Playbook", "Открыть план действий", "פתח תוכנית פעולה")}
                    </button>
                  </div>
                ))}
              </div>

              <div className="surface-subtle space-y-3 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] uppercase text-text-secondary">
                    {copy("SLA Trend (last", "Тренд SLA (последний", "מגמת SLA (אחרון")} {slaHistoryDays} {copy("days)", "дней)", "ימים)")}
                  </div>
                  <div className="inline-flex items-center rounded-lg border border-border bg-surface-subtle p-0.5">
                    {SLA_HISTORY_DAYS_OPTIONS.map((option) => (
                      <button
                        key={option}
                        onClick={() => setSlaHistoryDays(option)}
                        className={cn(
                          "h-7 px-2 rounded text-[11px]",
                          option === slaHistoryDays
                            ? "bg-accent text-accent-foreground"
                            : "text-text-secondary",
                        )}
                      >
                        {option}d
                      </button>
                    ))}
                  </div>
                </div>
                {operationsSlaHistoryQuery.isLoading ? (
                  <div className="text-[12px] text-text-secondary">
                    {copy("Loading trend…", "Загружаем тренд…", "טוען מגמה…")}
                  </div>
                ) : operationsSlaHistoryQuery.isError ? (
                  <div className="text-[12px] text-status-problem-fg">
                    {readError(
                      operationsSlaHistoryQuery.error,
                      copy(
                        "Failed to load SLA trend",
                        "Не удалось загрузить тренд SLA",
                        "טעינת מגמת SLA נכשלה",
                      ),
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid gap-2 md:grid-cols-4 text-[12px]">
                      <div className="rounded-lg border border-border bg-surface-subtle px-3 py-2">
                        <div className="text-text-secondary">
                          {copy("Current", "Текущее", "נוכחי")}
                        </div>
                        <div className="font-semibold">
                          {slaHistorySummary?.current_status ||
                            tt("reports.notAvailableShort")}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle px-3 py-2">
                        <div className="text-text-secondary">
                          {copy("Status Days", "Дней в статусе", "ימים בסטטוס")}
                        </div>
                        <div className="font-semibold">
                          OK {slaHistorySummary?.ok_days || 0} {copy("| WARN", "| ПРЕДУПРЕЖДАТЬ", "| הזהר")}{" "}
                          {slaHistorySummary?.warn_days || 0} {copy("| DANGER", "| ОПАСНОСТЬ", "| סכנה")}{" "}
                          {slaHistorySummary?.danger_days || 0}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle px-3 py-2">
                        <div className="text-text-secondary">
                          {copy("Delta Import % (d-1)", "Дельта импорта, % (d-1)", "% ייבוא דלתא (ד-1)")}
                        </div>
                        <div className="font-semibold">
                          {slaHistorySummary?.delta_import_failure_rate_pct ??
                            0}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle px-3 py-2">
                        <div className="text-text-secondary">
                          {copy("Delta Outbox % (d-1)", "Дельта исходящих % (d-1)", "דלתא דואר יוצא % (d-1)")}
                        </div>
                        <div className="font-semibold">
                          {slaHistorySummary?.delta_outbox_failed_rate_pct ?? 0}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      {slaHistoryRecent.map((point) => (
                        <div
                          key={point.day}
                          className="grid grid-cols-[92px_62px_1fr_1fr_64px] gap-2 items-center text-[11px]"
                        >
                          <div className="text-text-secondary">{point.day}</div>
                          <span
                            className={cn(
                              "inline-flex justify-center rounded border px-1.5 py-0.5 font-semibold",
                              SLA_STATUS_CLASS[point.overall_status] ||
                                "text-text-secondary bg-surface-subtle border-border",
                            )}
                          >
                            {point.overall_status}
                          </span>
                          <div className="h-2 rounded bg-surface-sunken overflow-hidden">
                            <div
                              className="h-full bg-status-warning-fg"
                              style={{
                                width: `${Math.min(100, point.import_failure_rate_pct)}%`,
                              }}
                            />
                          </div>
                          <div className="h-2 rounded bg-surface-sunken overflow-hidden">
                            <div
                              className="h-full bg-status-problem-fg"
                              style={{
                                width: `${Math.min(100, point.outbox_failed_rate_pct)}%`,
                              }}
                            />
                          </div>
                          <div className="text-end text-text-secondary">
                            A:{point.danger_alerts_count}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <div
          id="reports-issues-analytics"
          className={reportsPanelClass("space-y-4 p-4")}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase text-text-secondary">
                {tt("reports.issuesAnalyticsTitle")}
              </div>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-text">
                {tt("reports.issuesAnalyticsSubtitle")}
              </h2>
            </div>
            <div className="text-end text-[11px] text-text-secondary">
              {issuesAnalytics?.generated_at
                ? formatDateTime(issuesAnalytics.generated_at)
                : tt("reports.notAvailableShort")}
            </div>
          </div>

          {issuesAnalyticsQuery.isLoading ? (
            <div className="text-[13px] text-text-secondary">
              {tt("reports.loadingIssuesAnalytics")}
            </div>
          ) : issuesAnalyticsQuery.isError ? (
            <div className="text-[13px] text-status-problem-fg">
              {readError(
                issuesAnalyticsQuery.error,
                tt("reports.failedIssuesAnalytics"),
              )}
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-5">
                <div className="rounded-lg border border-border bg-surface-subtle px-3 py-3">
                  <div className="text-[11px] uppercase text-text-secondary">
                    {tt("reports.openTotal")}
                  </div>
                  <div className="mt-1 text-lg font-semibold tabular-nums text-text">
                    {formatCount(issuesAnalytics?.summary.open_issues)} /{" "}
                    {formatCount(issuesAnalytics?.summary.total_issues)}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-surface-subtle px-3 py-3">
                  <div className="text-[11px] uppercase text-text-secondary">
                    {tt("reports.overdueRate")}
                  </div>
                  <div className="mt-1 text-lg font-semibold text-status-problem-fg">
                    {formatPercent(
                      issuesAnalytics?.summary.overdue_open_rate_pct,
                    )}
                  </div>
                  <div className="mt-1 text-[11px] text-text-secondary">
                    {tt("reports.overdueOpen").replace(
                      "{count}",
                      formatCount(issuesAnalytics?.summary.overdue_open_issues),
                    )}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-surface-subtle px-3 py-3">
                  <div className="text-[11px] uppercase text-text-secondary">
                    {copy("MTTR (h)", "Среднее время восстановления (ч)", "MTTR (ח)")}
                  </div>
                  <div className="mt-1 text-lg font-semibold tabular-nums text-text">
                    {issuesAnalytics?.summary.mttr_hours ?? 0}
                  </div>
                  <div className="mt-1 text-[11px] text-text-secondary">
                    P50: {issuesAnalytics?.summary.mttr_p50_hours ?? 0} | n=
                    {issuesAnalytics?.summary.mttr_sample_size ?? 0}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-surface-subtle px-3 py-3">
                  <div className="text-[11px] uppercase text-text-secondary">
                    {tt("reports.blockedOpen")}
                  </div>
                  <div className="mt-1 text-lg font-semibold text-status-warning-fg">
                    {issuesAnalytics?.summary.blocked_open_issues ?? 0}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-surface-subtle px-3 py-3">
                  <div className="text-[11px] uppercase text-text-secondary">
                    {copy("P1 Open", "P1 Открыть", "P1 פתוח")}
                  </div>
                  <div className="mt-1 text-lg font-semibold text-status-problem-fg">
                    {issuesAnalytics?.summary.p1_open_issues ?? 0}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border bg-surface-subtle px-3 py-3">
                  <div className="text-[11px] uppercase text-text-secondary mb-2">
                    {tt("reports.backlogByWorkflow")}
                  </div>
                  <div className="space-y-1 text-[12px]">
                    {Object.entries(
                      issuesAnalytics?.summary.backlog_by_workflow || {},
                    ).map(([workflow, count]) => (
                      <div
                        key={workflow}
                        className="flex items-center justify-between"
                      >
                        <span className="text-text-secondary">{workflow}</span>
                        <span className="font-medium text-text">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-surface-subtle px-3 py-3">
                  <div className="text-[11px] uppercase text-text-secondary mb-2">
                    {tt("reports.backlogByPriority")}
                  </div>
                  <div className="space-y-1 text-[12px]">
                    {Object.entries(
                      issuesAnalytics?.summary.backlog_by_priority || {},
                    ).map(([priority, count]) => (
                      <div
                        key={priority}
                        className="flex items-center justify-between"
                      >
                        <span className="text-text-secondary">{priority}</span>
                        <span className="font-medium text-text">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2 rounded-lg border border-border bg-surface-subtle px-3 py-3">
                <div className="text-[11px] uppercase text-text-secondary">
                  {tt("reports.trendLastDays").replace(
                    "{days}",
                    String(issuesAnalytics?.days ?? ISSUES_ANALYTICS_DAYS),
                  )}
                </div>
                {(issuesAnalytics?.trend || []).slice(-10).map((point) => (
                  <div
                    key={point.day}
                    className="grid grid-cols-[90px_70px_70px_1fr] gap-2 items-center text-[11px]"
                  >
                    <span className="text-text-secondary">{point.day}</span>
                    <span className="text-status-ok-fg">+{point.opened}</span>
                    <span className="text-status-problem-fg">
                      -{point.closed}
                    </span>
                    <div className="h-2 rounded bg-surface-sunken overflow-hidden">
                      <div
                        className="h-full bg-accent"
                        style={{
                          width: `${Math.min(100, point.backlog_open_end)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div
          id="reports-issues-addons-impact"
          className={reportsPanelClass("space-y-4 p-4")}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase text-text-secondary">
                {tt("reports.marginLeakageTitle")}
              </div>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-text">
                {tt("reports.marginLeakageSubtitle")}
              </h2>
            </div>
            <div className="text-end text-[11px] text-text-secondary">
              {issuesAddonsImpact?.generated_at
                ? formatDateTime(issuesAddonsImpact.generated_at)
                : tt("reports.notAvailableShort")}
            </div>
          </div>

          {issuesAddonsImpactQuery.isLoading ? (
            <div className="text-[13px] text-text-secondary">
              {tt("reports.loadingMarginLeakage")}
            </div>
          ) : issuesAddonsImpactQuery.isError ? (
            <div className="text-[13px] text-status-problem-fg">
              {readError(
                issuesAddonsImpactQuery.error,
                tt("reports.failedMarginLeakage"),
              )}
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-lg border border-border bg-surface-subtle px-3 py-3">
                  <div className="text-[11px] uppercase text-text-secondary">
                    {tt("reports.openIssuesAtRisk")}
                  </div>
                  <div className="mt-1 text-lg font-semibold tabular-nums text-text">
                    {formatCount(issuesAddonsImpact?.summary?.open_issues)}
                  </div>
                  <div className="mt-1 text-[11px] text-text-secondary">
                    {tt("reports.profitAtRisk").replace(
                      "{amount}",
                      formatAmount(
                        issuesAddonsImpact?.summary?.open_issue_profit_at_risk,
                      ),
                    )}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-surface-subtle px-3 py-3">
                  <div className="text-[11px] uppercase text-text-secondary">
                    {tt("reports.blockedMarginRisk")}
                  </div>
                  <div className="mt-1 text-lg font-semibold text-status-problem-fg">
                    {formatCount(
                      issuesAddonsImpact?.summary?.blocked_open_issues,
                    )}
                  </div>
                  <div className="mt-1 text-[11px] text-text-secondary">
                    {tt("reports.blockedProfit").replace(
                      "{amount}",
                      formatAmount(
                        issuesAddonsImpact?.summary
                          ?.blocked_issue_profit_at_risk,
                      ),
                    )}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-surface-subtle px-3 py-3">
                  <div className="text-[11px] uppercase text-text-secondary">
                    {tt("reports.delayedDoors")}
                  </div>
                  <div className="mt-1 text-lg font-semibold tabular-nums text-text">
                    {issuesAddonsImpact?.summary?.not_installed_doors ?? 0}
                  </div>
                  <div className="mt-1 text-[11px] text-text-secondary">
                    {tt("reports.delayedProfit").replace(
                      "{amount}",
                      formatAmount(
                        issuesAddonsImpact?.summary?.delayed_profit_total,
                      ),
                    )}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-surface-subtle px-3 py-3">
                  <div className="text-[11px] uppercase text-text-secondary">
                    {tt("reports.addonUplift")}
                  </div>
                  <div className="mt-1 text-lg font-semibold text-status-ok-fg">
                    {formatAmount(
                      issuesAddonsImpact?.summary?.addon_profit_total,
                    )}
                  </div>
                  <div className="mt-1 text-[11px] text-text-secondary">
                    {t("reports.missingPlans")}{" "}
                    {issuesAddonsImpact?.summary?.missing_addon_plans_facts ??
                      0}
                  </div>
                </div>
              </div>

              <div className="divide-y divide-border-subtle overflow-hidden rounded-lg border border-border bg-surface-subtle md:hidden">
                {issuesImpactSummaryRows.map((row) => (
                  <article key={row.label} className="px-3.5 py-3.5">
                    <div className="text-[13px] font-semibold leading-5 text-text">
                      {row.label}
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <div className="rounded-lg border border-border bg-surface px-2.5 py-2">
                        <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                          {copy("Revenue", "Выручка", "הכנסה")}
                        </div>
                        <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                          {row.revenue}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface px-2.5 py-2">
                        <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                          {copy("Payroll", "ФОТ", "שכר")}
                        </div>
                        <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                          {row.payroll}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface px-2.5 py-2">
                        <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                          {copy("Profit", "Прибыль", "רווח")}
                        </div>
                        <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                          {row.profit}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-auto rounded-lg border border-border bg-surface-subtle md:block">
                <table className="w-full text-[12px]">
                  <thead className="bg-surface-subtle text-text-secondary">
                    <tr>
                      <th className="text-start px-3 py-2 font-medium">
                        {tt("reports.summary")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Revenue", "Выручка", "הכנסה")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Payroll", "ФОТ", "שכר")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Profit", "Прибыль", "רווח")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {issuesImpactSummaryRows.map((row) => (
                      <tr key={row.label} className="border-t border-border">
                        <td className="px-3 py-2.5 font-medium text-text">
                          {row.label}
                        </td>
                        <td className="px-3 py-2 text-end">{row.revenue}</td>
                        <td className="px-3 py-2 text-end">{row.payroll}</td>
                        <td className="px-3 py-2 text-end">{row.profit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="overflow-hidden rounded-lg border border-border bg-surface-subtle">
                  <div className="border-b border-border px-3 py-2 text-[11px] uppercase text-text-secondary">
                    {tt("reports.delayedByReason")}
                  </div>
                  <div className="divide-y divide-border-subtle md:hidden">
                    {(issuesAddonsImpact?.top_reasons || []).length === 0 ? (
                      <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                        {tt("reports.noDelayedReasons")}
                      </div>
                    ) : (
                      (issuesAddonsImpact?.top_reasons || []).map((item) => (
                        <article
                          key={`${item.reason_id || item.reason_name}-mobile`}
                          className="px-3.5 py-3.5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 text-[13px] font-semibold leading-5 text-text">
                              {item.reason_name}
                            </div>
                            <div className="shrink-0 rounded-full bg-surface px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                              {copy("Doors", "Двери", "דלתות")}: {item.doors}
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <div className="rounded-lg border border-border bg-surface px-2.5 py-2">
                              <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                                {copy("Revenue", "Выручка", "הכנסה")}
                              </div>
                              <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                                {formatAmount(item.revenue_delayed_total)}
                              </div>
                            </div>
                            <div className="rounded-lg border border-border bg-surface px-2.5 py-2">
                              <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                                {copy("Profit", "Прибыль", "רווח")}
                              </div>
                              <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                                {formatAmount(item.profit_delayed_total)}
                              </div>
                            </div>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                  <table className="hidden w-full text-[12px] md:table">
                    <thead className="bg-surface-subtle text-text-secondary">
                      <tr>
                        <th className="text-start px-3 py-2 font-medium">
                          {copy("Reason", "Причина", "סיבה")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {copy("Doors", "Двери", "דלתות")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {copy("Revenue", "Выручка", "הכנסה")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {copy("Profit", "Прибыль", "רווח")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(issuesAddonsImpact?.top_reasons || []).length === 0 ? (
                        <tr>
                          <td
                            className="px-3 py-3 text-text-secondary"
                            colSpan={4}
                          >
                            {tt("reports.noDelayedReasons")}
                          </td>
                        </tr>
                      ) : (
                        (issuesAddonsImpact?.top_reasons || []).map((item) => (
                          <tr
                            key={item.reason_id || item.reason_name}
                            className="border-t border-border"
                          >
                            <td className="px-3 py-2.5 font-medium text-text">
                              {item.reason_name}
                            </td>
                            <td className="px-3 py-2 text-end">{item.doors}</td>
                            <td className="px-3 py-2 text-end">
                              {formatAmount(item.revenue_delayed_total)}
                            </td>
                            <td className="px-3 py-2 text-end">
                              {formatAmount(item.profit_delayed_total)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="overflow-hidden rounded-lg border border-border bg-surface-subtle">
                  <div className="border-b border-border px-3 py-2 text-[11px] uppercase text-text-secondary">
                    {tt("reports.addonProfitImpact")}
                  </div>
                  <div className="divide-y divide-border-subtle md:hidden">
                    {(issuesAddonsImpact?.addon_impact || []).length === 0 ? (
                      <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                        {tt("reports.noAddonImpactRows")}
                      </div>
                    ) : (
                      (issuesAddonsImpact?.addon_impact || []).map((item) => (
                        <article
                          key={`${item.addon_type_id || item.addon_name}-mobile`}
                          className="px-3.5 py-3.5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 text-[13px] font-semibold leading-5 text-text">
                              {item.addon_name}
                            </div>
                            <div className="shrink-0 rounded-full bg-surface px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                              {copy("Qty", "Кол-во", "כמות")}:{" "}
                              {formatAmount(item.qty_done)}
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <div className="rounded-lg border border-border bg-surface px-2.5 py-2">
                              <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                                {copy("Profit", "Прибыль", "רווח")}
                              </div>
                              <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                                {formatAmount(item.profit_total)}
                              </div>
                            </div>
                            <div className="rounded-lg border border-border bg-surface px-2.5 py-2">
                              <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                                {tt("reports.missingPlans")}
                              </div>
                              <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                                {item.missing_plan_facts}
                              </div>
                            </div>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                  <table className="hidden w-full text-[12px] md:table">
                    <thead className="bg-surface-subtle text-text-secondary">
                      <tr>
                        <th className="text-start px-3 py-2 font-medium">
                          {tt("reports.addon")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {copy("Qty", "Кол-во", "כמות")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {copy("Profit", "Прибыль", "רווח")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {tt("reports.missingPlans")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(issuesAddonsImpact?.addon_impact || []).length === 0 ? (
                        <tr>
                          <td
                            className="px-3 py-3 text-text-secondary"
                            colSpan={4}
                          >
                            {tt("reports.noAddonImpactRows")}
                          </td>
                        </tr>
                      ) : (
                        (issuesAddonsImpact?.addon_impact || []).map((item) => (
                          <tr
                            key={item.addon_type_id || item.addon_name}
                            className="border-t border-border"
                          >
                            <td className="px-3 py-2.5 font-medium text-text">
                              {item.addon_name}
                            </td>
                            <td className="px-3 py-2 text-end">
                              {formatAmount(item.qty_done)}
                            </td>
                            <td className="px-3 py-2 text-end">
                              {formatAmount(item.profit_total)}
                            </td>
                            <td className="px-3 py-2 text-end">
                              {item.missing_plan_facts}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        <div
          id="reports-project-plan-fact"
          className={reportsPanelClass("overflow-hidden")}
        >
          <div className="px-4 py-3 border-b border-border bg-surface-subtle flex flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[11px] uppercase text-text-secondary">
                {tt("reports.projectPlanVsFactTitle")}
              </div>
              <div className="text-[13px] text-text-secondary">
                {tt("reports.projectPlanVsFactSubtitle")}
              </div>
            </div>
            <select
              aria-label={copy("Project Plan Fact Filter", "Фильтр план/факт по объекту", "מסנן תכנון מול ביצוע לפי פרויקט")}
              value={projectPlanFactProjectId}
              onChange={(e) => setProjectPlanFactProjectId(e.target.value)}
              className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px] md:w-auto md:max-w-[280px]"
            >
              <option value="">
                {projectsQuery.isLoading
                  ? t("reports.loadingProjects")
                  : t("reports.selectProject")}
              </option>
              {projectOptions.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {projectsQuery.isLoading && !projectPlanFactProjectId && (
            <div className="px-4 py-6">
              <SectionMessage
                title={tt("reports.loadingProjectsForPlanFact")}
                detail={tt("reports.preparingPlanFactFilters")}
              />
            </div>
          )}
          {!projectsQuery.isLoading && projectOptions.length === 0 && (
            <div className="px-4 py-6">
              <SectionMessage
                title={t("reports.noProjectsForPlanFact")}
                detail={t("reports.importFactoryFileFirst")}
              />
            </div>
          )}
          {!projectsQuery.isLoading &&
            projectOptions.length > 0 &&
            !projectPlanFactProjectId && (
              <div className="px-4 py-6">
                <SectionMessage
                  title={t("reports.selectProject")}
                  detail={t("reports.selectProjectPlanFact")}
                />
              </div>
            )}
          {projectPlanFactQuery.isLoading && projectPlanFactProjectId && (
            <div className="px-4 py-6 text-[13px] text-text-secondary">
              {tt("reports.loadingProjectPlanFact")}
            </div>
          )}
          {projectPlanFactQuery.isError && projectPlanFactProjectId && (
            <div className="px-4 py-6 text-[13px] text-status-problem-fg">
              {readError(
                projectPlanFactQuery.error,
                tt("reports.failedProjectPlanFact"),
              )}
            </div>
          )}
          {!projectPlanFactQuery.isLoading &&
            !projectPlanFactQuery.isError &&
            projectPlanFact && (
              <div className="p-4 space-y-4">
                <div className="rounded-lg border border-border bg-surface-subtle p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="max-w-3xl">
                      <div className="text-[11px] uppercase text-text-secondary">
                        {copy(
                          "Commercial Adjustments",
                          "Коммерческие корректировки",
                          "התאמות מסחריות",
                        )}
                      </div>
                      <div className="mt-1 text-[13px] text-text-secondary">
                        {copy(
                          `Cross-check add-on plans and urgency uplift for ${selectedProjectPlanFact?.name || "the selected project"} before drilling deeper into margin risk.`,
                          `Сверьте план доп. работ и срочную надбавку для ${selectedProjectPlanFact?.name || "выбранного проекта"} до детального разбора маржи и рисков.`,
                          `בדוק את תוכנית העבודות הנוספות ותוספת הדחיפות עבור ${selectedProjectPlanFact?.name || "הפרויקט הנבחר"} לפני ירידה עמוקה יותר לסיכון המרווח.`,
                        )}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-[12px] text-text-secondary">
                      {copy("Plan rows", "Строк плана", "שורות תוכנית")}:{" "}
                      {formatCount(projectCommercialAdjustments.rows)}
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border border-border bg-surface p-3">
                      <div className="text-[11px] uppercase text-text-secondary">
                        {copy(
                          "Client uplift",
                          "Надбавка клиента",
                          "תוספת לקוח",
                        )}
                      </div>
                      <div className="mt-1 text-lg font-semibold tabular-nums text-text">
                        {formatAmount(projectCommercialAdjustments.client)}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-surface p-3">
                      <div className="text-[11px] uppercase text-text-secondary">
                        {copy(
                          "Installer uplift",
                          "Надбавка монтажника",
                          "תוספת מתקין",
                        )}
                      </div>
                      <div className="mt-1 text-lg font-semibold tabular-nums text-text">
                        {formatAmount(projectCommercialAdjustments.installer)}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-surface p-3">
                      <div className="text-[11px] uppercase text-text-secondary">
                        {copy(
                          "Unreconciled add-on facts",
                          "Несогласованные дополнительные факты",
                          "עובדות תוספות לא מתואמות",
                        )}
                      </div>
                      <div className="mt-1 text-lg font-semibold tabular-nums text-text">
                        {formatCount(projectPlanFact.missing_addon_plans_facts)}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-surface p-3">
                      <div className="text-[11px] uppercase text-text-secondary">
                        {copy(
                          "Order-level urgency",
                          "Срочность по заказам",
                          "דחיפות ברמת הזמנה",
                        )}
                      </div>
                      <div className="mt-1 text-lg font-semibold tabular-nums text-text">
                        {formatCount(projectUrgencyContractTotals.orderScoped)}
                      </div>
                    </div>
                  </div>
                  {selectedProjectPlanFact && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9"
                        onClick={() =>
                          router.push(
                            `/projects?project_id=${selectedProjectPlanFact.id}&focus_section=addons`,
                          )
                        }
                      >
                        {copy(
                          "Open pricing flow",
                          "Открыть блок цен",
                          "פתח את בלוק התמחור",
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9"
                        onClick={() =>
                          router.push(
                            `/projects?project_id=${selectedProjectPlanFact.id}&focus_section=urgency`,
                          )
                        }
                      >
                        {copy(
                          "Open urgency rows",
                          "Открыть срочные надбавки",
                          "פתח שורות דחיפות",
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9"
                        onClick={() =>
                          router.push(
                            `/earnings-ledger?project_id=${selectedProjectPlanFact.id}`,
                          )
                        }
                      >
                        <ReceiptText className="h-3.5 w-3.5" />
                        {copy(
                          "Open payroll ledger",
                          "Открыть начисления",
                          "פתח יומן תשלומים",
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="rounded-lg border border-border bg-surface p-3">
                    <div className="text-[11px] uppercase text-text-secondary">
                      {t("projects.completion")}
                    </div>
                    <div className="mt-2 text-[22px] font-semibold text-text">
                      {formatPercent(projectPlanFact.completion_pct)}
                    </div>
                    <div className="mt-1 text-[12px] text-text-secondary">
                      {projectPlanFact.installed_doors} /{" "}
                      {projectPlanFact.total_doors}{" "}
                      {t("reports.doors").toLowerCase()} {copy("installed", "установлен", "מותקן")}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface p-3">
                    <div className="text-[11px] uppercase text-text-secondary">
                      {t("reports.openIssuesExposure")}
                    </div>
                    <div className="mt-2 text-[22px] font-semibold text-text">
                      {projectPlanFact.open_issues}
                    </div>
                    <div className="mt-1 text-[12px] text-text-secondary">
                      {projectPlanFact.not_installed_doors}{" "}
                      {t("reports.doors").toLowerCase()} {copy("still pending", "все еще находится на рассмотрении", "עדיין בהמתנה")}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface p-3">
                    <div className="text-[11px] uppercase text-text-secondary">
                      {t("projects.missingRates")}
                    </div>
                    <div className="mt-2 text-[22px] font-semibold text-text">
                      {projectPlanFact.missing_planned_rates_doors}
                    </div>
                    <div className="mt-1 text-[12px] text-text-secondary">
                      {tt("reports.actualMissing")}:{" "}
                      {projectPlanFact.missing_actual_rates_doors}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface p-3">
                    <div className="text-[11px] uppercase text-text-secondary">
                      {t("projects.addons")}
                    </div>
                    <div className="mt-2 text-[22px] font-semibold text-text">
                      {formatAmount(projectPlanFact.actual_addons_qty)} /{" "}
                      {formatAmount(projectPlanFact.planned_addons_qty)}
                    </div>
                    <div className="mt-1 text-[12px] text-text-secondary">
                      {t("reports.missingPlans")}:{" "}
                      {projectPlanFact.missing_addon_plans_facts}
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-border-subtle overflow-hidden rounded-lg border border-border bg-surface md:hidden">
                  {projectPlanFactRows.map((row) => (
                    <article
                      key={`${row.label}-mobile`}
                      className="px-3.5 py-3.5"
                    >
                      <div className="text-[13px] font-semibold leading-5 text-text">
                        {row.label}
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                          <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                            {t("reports.plan")}
                          </div>
                          <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                            {row.plan}
                          </div>
                        </div>
                        <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                          <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                            {t("reports.fact")}
                          </div>
                          <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                            {row.fact}
                          </div>
                        </div>
                        <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                          <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                            {t("reports.gap")}
                          </div>
                          <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                            {row.gap}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="hidden overflow-auto rounded-lg border border-border md:block">
                  <table className="w-full text-[13px]">
                    <thead className="bg-surface-subtle text-text-secondary">
                      <tr>
                        <th className="text-start px-3 py-2 font-medium">
                          {t("reports.metric")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {t("reports.plan")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {t("reports.fact")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {t("reports.gap")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectPlanFactRows.map((row) => (
                        <tr key={row.label} className="border-t border-border">
                          <td className="px-3 py-2.5 font-medium text-text">
                            {row.label}
                          </td>
                          <td className="px-3 py-2 text-end">{row.plan}</td>
                          <td className="px-3 py-2 text-end">{row.fact}</td>
                          <td className="px-3 py-2 text-end">{row.gap}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <div className="rounded-lg border border-border bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="max-w-[32rem]">
                        <div className="text-[11px] uppercase text-text-secondary">
                          {copy(
                            "Additional Works Plan",
                            "План доп. работ",
                            "תוכנית עבודות נוספות",
                          )}
                        </div>
                        <div className="mt-1 text-[12px] text-text-secondary">
                          {copy(
                            "Planned add-on rows that should later reconcile with installer facts.",
                            "Плановые строки доп. работ, которые позже должны сойтись с фактами монтажника.",
                            "שורות תוספות מתוכננות שאמורות להתאים מאוחר יותר עם עובדות המתקין.",
                          )}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle px-3 py-2 text-end text-[12px] text-text-secondary">
                        {copy("Rows", "Строки", "שורות")}:{" "}
                        {projectAddonPlanTotals.rows}
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-border bg-surface-subtle p-3">
                        <div className="text-[11px] uppercase text-text-secondary">
                          {copy("Qty planned", "План", "כמות")}
                        </div>
                        <div className="mt-1 text-lg font-semibold tabular-nums text-text">
                          {formatAmount(projectAddonPlanTotals.qty)}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle p-3">
                        <div className="text-[11px] uppercase text-text-secondary">
                          {copy("Client total", "Сумма клиента", 'סה"כ לקוח')}
                        </div>
                        <div className="mt-1 text-lg font-semibold tabular-nums text-text">
                          {formatAmount(projectAddonPlanTotals.client)}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle p-3">
                        <div className="text-[11px] uppercase text-text-secondary">
                          {copy(
                            "Installer total",
                            "Сумма монтажника",
                            'סה"כ מתקין',
                          )}
                        </div>
                        <div className="mt-1 text-lg font-semibold tabular-nums text-text">
                          {formatAmount(projectAddonPlanTotals.installer)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 divide-y divide-border-subtle overflow-hidden rounded-lg border border-border md:hidden">
                      {projectAddonPlanQuery.isLoading ? (
                        <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                          {copy(
                            "Loading additional works plan...",
                            "Загружаем план доп. работ...",
                            "טוען תוכנית עבודות נוספות...",
                          )}
                        </div>
                      ) : projectAddonPlan.length === 0 ? (
                        <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                          {copy(
                            "No planned additional works for this project.",
                            "Для этого проекта нет запланированных доп. работ.",
                            "אין עבודות נוספות מתוכננות לפרויקט זה.",
                          )}
                        </div>
                      ) : (
                        projectAddonPlan.slice(0, 4).map((item, index) => (
                          <article
                            key={`${item.id || `${item.addon_type_id}-${index}`}-mobile`}
                            className="px-3.5 py-3.5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 text-[13px] font-semibold leading-5 text-text">
                                {item.addon_name || item.addon_type_id}
                              </div>
                              <div className="shrink-0 rounded-full bg-surface-subtle px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                                {copy("Qty", "Кол-во", "כמות")}:{" "}
                                {formatAmount(Number(item.qty_planned) || 0)}
                              </div>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                                  {copy("Client", "Клиент", "לקוח")}
                                </div>
                                <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                                  {formatAmount(Number(item.client_price) || 0)}
                                </div>
                              </div>
                              <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                                  {copy("Installer", "Монтажник", "מתקין")}
                                </div>
                                <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                                  {formatAmount(
                                    Number(item.installer_price) || 0,
                                  )}
                                </div>
                              </div>
                            </div>
                          </article>
                        ))
                      )}
                    </div>
                    <div className="mt-3 hidden overflow-auto rounded-lg border border-border md:block">
                      <table className="min-w-[520px] w-full text-[12px] leading-5">
                        <thead className="bg-surface-subtle text-text-secondary">
                          <tr>
                            <th className="px-3 py-2.5 text-start font-medium">
                              {tt("reports.addon")}
                            </th>
                            <th className="px-3 py-2.5 text-end font-medium">
                              {copy("Qty", "Кол-во", "כמות")}
                            </th>
                            <th className="px-3 py-2.5 text-end font-medium">
                              {copy("Client", "Клиент", "לקוח")}
                            </th>
                            <th className="px-3 py-2.5 text-end font-medium">
                              {copy("Installer", "Монтажник", "מתקין")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {projectAddonPlanQuery.isLoading ? (
                            <tr>
                              <td
                                className="px-3 py-3 text-text-secondary"
                                colSpan={4}
                              >
                                {copy(
                                  "Loading additional works plan...",
                                  "Загружаем план доп. работ...",
                                  "טוען תוכנית עבודות נוספות...",
                                )}
                              </td>
                            </tr>
                          ) : projectAddonPlan.length === 0 ? (
                            <tr>
                              <td
                                className="px-3 py-3 text-text-secondary"
                                colSpan={4}
                              >
                                {copy(
                                  "No planned additional works for this project.",
                                  "Для этого проекта нет запланированных доп. работ.",
                                  "אין עבודות נוספות מתוכננות לפרויקט זה.",
                                )}
                              </td>
                            </tr>
                          ) : (
                            projectAddonPlan.slice(0, 4).map((item, index) => (
                              <tr
                                key={
                                  item.id || `${item.addon_type_id}-${index}`
                                }
                                className="border-t border-border"
                              >
                                <td className="px-3 py-2.5 font-medium text-text">
                                  {item.addon_name || item.addon_type_id}
                                </td>
                                <td className="px-3 py-2.5 text-end tabular-nums">
                                  {formatAmount(Number(item.qty_planned) || 0)}
                                </td>
                                <td className="px-3 py-2.5 text-end tabular-nums">
                                  {formatAmount(Number(item.client_price) || 0)}
                                </td>
                                <td className="px-3 py-2.5 text-end tabular-nums">
                                  {formatAmount(
                                    Number(item.installer_price) || 0,
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="max-w-[32rem]">
                        <div className="text-[11px] uppercase text-text-secondary">
                          {copy(
                            "Urgency Surcharge",
                            "Срочная надбавка",
                            "תוספת דחיפות",
                          )}
                        </div>
                        <div className="mt-1 text-[12px] text-text-secondary">
                          {copy(
                            "Separate urgency uplift rows that should stay visible in project commercial review.",
                            "Отдельные строки срочной надбавки, которые должны быть видимы в коммерческом разборе проекта.",
                            "שורות תוספת דחיפות נפרדות שצריכות להישאר גלויות בבדיקה המסחרית של הפרויקט.",
                          )}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle px-3 py-2 text-end text-[12px] text-text-secondary">
                        {copy("Rows", "Строки", "שורות")}:{" "}
                        {projectUrgencyContractTotals.rows}
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-border bg-surface-subtle p-3">
                        <div className="text-[11px] uppercase text-text-secondary">
                          {copy("Order-scoped", "По заказу", "לפי הזמנה")}
                        </div>
                        <div className="mt-1 text-lg font-semibold tabular-nums text-text">
                          {projectUrgencyContractTotals.orderScoped}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle p-3">
                        <div className="text-[11px] uppercase text-text-secondary">
                          {copy(
                            "Client uplift",
                            "Надбавка клиента",
                            "תוספת לקוח",
                          )}
                        </div>
                        <div className="mt-1 text-lg font-semibold tabular-nums text-text">
                          {formatAmount(projectUrgencyContractTotals.client)}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle p-3">
                        <div className="text-[11px] uppercase text-text-secondary">
                          {copy(
                            "Installer uplift",
                            "Надбавка монтажника",
                            "תוספת מתקין",
                          )}
                        </div>
                        <div className="mt-1 text-lg font-semibold tabular-nums text-text">
                          {formatAmount(projectUrgencyContractTotals.installer)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 divide-y divide-border-subtle overflow-hidden rounded-lg border border-border md:hidden">
                      {projectUrgencySurchargesQuery.isLoading ? (
                        <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                          {copy(
                            "Loading urgency surcharge rows...",
                            "Загружаем строки срочной надбавки...",
                            "טוען שורות תוספת דחיפות...",
                          )}
                        </div>
                      ) : projectUrgencySurcharges.length === 0 ? (
                        <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                          {copy(
                            "No urgency surcharge rows for this project.",
                            "Для этого проекта нет строк срочной надбавки.",
                            "אין שורות תוספת דחיפות לפרויקט זה.",
                          )}
                        </div>
                      ) : (
                        projectUrgencySurcharges
                          .slice(0, 4)
                          .map((item, index) => (
                            <article
                              key={`${item.id || `${item.scope}-${index}`}-mobile`}
                              className="px-3.5 py-3.5"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-[13px] font-semibold leading-5 text-text">
                                    {item.reason}
                                  </div>
                                  <div className="mt-1 text-[11px] text-text-secondary">
                                    {item.scope === "ORDER_NUMBER"
                                      ? `${copy("Order", "Заказ", "הזמנה")}${item.order_number ? ` • ${item.order_number}` : ""}`
                                      : copy("Project", "Проект", "פרויקט")}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-3 grid grid-cols-2 gap-2">
                                <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                  <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                                    {copy("Client", "Клиент", "לקוח")}
                                  </div>
                                  <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                                    {formatAmount(
                                      Number(item.client_amount) || 0,
                                    )}
                                  </div>
                                </div>
                                <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                  <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                                    {copy("Installer", "Монтажник", "מתקין")}
                                  </div>
                                  <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                                    {formatAmount(
                                      Number(item.installer_amount) || 0,
                                    )}
                                  </div>
                                </div>
                              </div>
                            </article>
                          ))
                      )}
                    </div>
                    <div className="mt-3 hidden overflow-auto rounded-lg border border-border md:block">
                      <table className="min-w-[520px] w-full text-[12px] leading-5">
                        <thead className="bg-surface-subtle text-text-secondary">
                          <tr>
                            <th className="px-3 py-2.5 text-start font-medium">
                              {copy("Scope", "Раздел", "תחום")}
                            </th>
                            <th className="px-3 py-2.5 text-start font-medium">
                              {copy("Reason", "Причина", "סיבה")}
                            </th>
                            <th className="px-3 py-2.5 text-end font-medium">
                              {copy("Client", "Клиент", "לקוח")}
                            </th>
                            <th className="px-3 py-2.5 text-end font-medium">
                              {copy("Installer", "Монтажник", "מתקין")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {projectUrgencySurchargesQuery.isLoading ? (
                            <tr>
                              <td
                                className="px-3 py-3 text-text-secondary"
                                colSpan={4}
                              >
                                {copy(
                                  "Loading urgency surcharge rows...",
                                  "Загружаем строки срочной надбавки...",
                                  "טוען שורות תוספת דחיפות...",
                                )}
                              </td>
                            </tr>
                          ) : projectUrgencySurcharges.length === 0 ? (
                            <tr>
                              <td
                                className="px-3 py-3 text-text-secondary"
                                colSpan={4}
                              >
                                {copy(
                                  "No urgency surcharge rows for this project.",
                                  "Для этого проекта нет строк срочной надбавки.",
                                  "אין שורות תוספת דחיפות לפרויקט זה.",
                                )}
                              </td>
                            </tr>
                          ) : (
                            projectUrgencySurcharges
                              .slice(0, 4)
                              .map((item, index) => (
                                <tr
                                  key={item.id || `${item.scope}-${index}`}
                                  className="border-t border-border"
                                >
                                  <td className="px-3 py-2.5">
                                    {item.scope === "ORDER_NUMBER"
                                      ? `${copy("Order", "Заказ", "הזמנה")}${item.order_number ? ` • ${item.order_number}` : ""}`
                                      : copy("Project", "Проект", "פרויקט")}
                                  </td>
                                  <td className="px-3 py-2.5 font-medium text-text">
                                    {item.reason}
                                  </td>
                                  <td className="px-3 py-2.5 text-end tabular-nums">
                                    {formatAmount(
                                      Number(item.client_amount) || 0,
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5 text-end tabular-nums">
                                    {formatAmount(
                                      Number(item.installer_amount) || 0,
                                    )}
                                  </td>
                                </tr>
                              ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
        </div>

        <div
          id="reports-project-risk-drilldown"
          className={reportsPanelClass("overflow-hidden")}
        >
          <div className="px-4 py-3 border-b border-border bg-surface-subtle flex flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[11px] uppercase text-text-secondary">
                {tt("reports.projectRiskTitle")}
              </div>
              <div className="text-[13px] text-text-secondary">
                {tt("reports.projectRiskSubtitle")}
              </div>
            </div>
            <select
              aria-label={copy("Project Risk Drilldown Filter", "Фильтр детализации рисков по объекту", "מסנן פירוט סיכונים לפי פרויקט")}
              value={projectRiskProjectId}
              onChange={(e) => setProjectRiskProjectId(e.target.value)}
              className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px] md:w-auto md:max-w-[280px]"
            >
              <option value="">
                {projectsQuery.isLoading
                  ? tt("reports.loadingProjects")
                  : t("reports.selectProject")}
              </option>
              {projectOptions.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {projectRiskDrilldownQuery.isLoading && projectRiskProjectId && (
            <div className="px-4 py-6 text-[13px] text-text-secondary">
              {tt("reports.loadingProjectRisk")}
            </div>
          )}
          {projectRiskDrilldownQuery.isError && projectRiskProjectId && (
            <div className="px-4 py-6 text-[13px] text-status-problem-fg">
              {readError(
                projectRiskDrilldownQuery.error,
                tt("reports.failedProjectRisk"),
              )}
            </div>
          )}
          {!projectsQuery.isLoading &&
            projectOptions.length > 0 &&
            !projectRiskProjectId && (
              <div className="px-4 py-6">
                <SectionMessage
                  title={copy("Select a project", "Выберите объект", "בחרו פרויקט")}
                  detail={copy(
                    "Choose a project to inspect the exact drivers behind low margin, stalled reasons and risky orders.",
                    "Выберите объект, чтобы увидеть причины низкой маржи, задержек и заказов с риском.",
                    "בחרו פרויקט כדי לראות את הגורמים לרווחיות נמוכה, לעיכובים ולהזמנות בסיכון.",
                  )}
                />
              </div>
            )}
          {!projectRiskDrilldownQuery.isLoading &&
            !projectRiskDrilldownQuery.isError &&
            projectRiskDrilldown && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="rounded-lg border border-border bg-surface p-3">
                    <div className="text-[11px] uppercase text-text-secondary">
                      {copy(
                        "Actual Margin",
                        "Фактическая маржа",
                        "מרווח בפועל",
                      )}
                    </div>
                    <div className="mt-2 text-[22px] font-semibold text-text">
                      {formatPercent(
                        projectRiskDrilldown.summary?.actual_margin_pct,
                      )}
                    </div>
                    <div className="mt-1 text-[12px] text-text-secondary">
                      {copy("Profit gap", "Разрыв по прибыли", "פער רווח")}{" "}
                      {formatAmount(
                        projectRiskDrilldown.summary?.profit_gap_total,
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface p-3">
                    <div className="text-[11px] uppercase text-text-secondary">
                      {copy(
                        "Completion / Delayed",
                        "Завершение / задержка",
                        "השלמה / עיכוב",
                      )}
                    </div>
                    <div className="mt-2 text-[22px] font-semibold text-text">
                      {formatPercent(
                        projectRiskDrilldown.summary?.completion_pct,
                      )}
                    </div>
                    <div className="mt-1 text-[12px] text-text-secondary">
                      {projectRiskDrilldown.summary?.not_installed_doors ?? 0}{" "}
                      {copy(
                        "delayed doors",
                        "дверей в задержке",
                        "דלתות בעיכוב",
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface p-3">
                    <div className="text-[11px] uppercase text-text-secondary">
                      {copy("Issue Pressure", "Давление проблем", "לחץ תקלות")}
                    </div>
                    <div className="mt-2 text-[22px] font-semibold text-text">
                      {projectRiskDrilldown.summary?.open_issues ?? 0} /{" "}
                      {projectRiskDrilldown.summary?.blocked_open_issues ?? 0}
                    </div>
                    <div className="mt-1 text-[12px] text-text-secondary">
                      {copy(
                        "Open / blocked issues",
                        "Открытые / заблокированные проблемы",
                        "תקלות פתוחות / חסומות",
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface p-3">
                    <div className="text-[11px] uppercase text-text-secondary">
                      {copy("Data Risk", "Риск данных", "סיכון נתונים")}
                    </div>
                    <div className="mt-2 text-[22px] font-semibold text-text">
                      {(projectRiskDrilldown.summary
                        ?.missing_planned_rates_doors ?? 0) +
                        (projectRiskDrilldown.summary
                          ?.missing_actual_rates_doors ?? 0) +
                        (projectRiskDrilldown.summary
                          ?.missing_addon_plans_facts ?? 0)}
                    </div>
                    <div className="mt-1 text-[12px] text-text-secondary">
                      {copy(
                        "rates + addon plan gaps",
                        "тарифы + пробелы в дополнительных планах",
                        "תעריפים + פערי תוכנית תוספות",
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-3">
                  <div className="rounded-lg border border-border bg-surface p-3 xl:col-span-1">
                    <div className="text-[11px] uppercase text-text-secondary">
                      {copy("Drivers", "Драйверы", "דרייברים")}
                    </div>
                    <div className="mt-3 space-y-2">
                      {(projectRiskDrilldown.drivers || []).map((driver) => (
                        <div
                          key={driver.code}
                          className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                        >
                          <div>
                            <div className="text-[12px] font-medium text-text">
                              {driver.label}
                            </div>
                            <div className="text-[11px] text-text-secondary">
                              {driver.severity}
                            </div>
                          </div>
                          <div className="text-[12px] font-semibold text-text">
                            {formatAmount(driver.value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-surface overflow-hidden xl:col-span-1">
                    <div className="border-b border-border px-3 py-2 text-[11px] uppercase text-text-secondary">
                      {copy(
                        "Stalled Reasons",
                        "Причины задержки",
                        "סיבות לעיכוב",
                      )}
                    </div>
                    <div className="divide-y divide-border-subtle md:hidden">
                      {(projectRiskDrilldown.top_reasons || []).length === 0 ? (
                        <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                          {copy("No stalled reasons.", "Нет причин задержки.", "אין סיבות לעיכוב.")}
                        </div>
                      ) : (
                        (projectRiskDrilldown.top_reasons || []).map((item) => (
                          <article
                            key={`mobile-${item.reason_id || item.reason_name}`}
                            className="px-3.5 py-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 text-[13px] font-semibold leading-5 text-text">
                                {item.reason_name}
                              </div>
                              <div className="shrink-0 rounded-full bg-surface-subtle px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                                {copy("Doors", "Двери", "דלתות")}: {item.doors}
                              </div>
                            </div>
                            <div className="mt-3 rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                              <div className="text-[10px] uppercase text-text-secondary">
                                {copy(
                                  "Profit Leak",
                                  "Потеря прибыли",
                                  "דליפת רווח",
                                )}
                              </div>
                              <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                {formatAmount(item.profit_delayed_total)}
                              </div>
                            </div>
                          </article>
                        ))
                      )}
                    </div>
                    <table className="hidden w-full text-[12px] md:table">
                      <thead className="bg-surface-subtle text-text-secondary">
                        <tr>
                          <th className="text-start px-3 py-2 font-medium">
                            {copy("Reason", "Причина", "סיבה")}
                          </th>
                          <th className="text-end px-3 py-2 font-medium">
                            {copy("Doors", "Двери", "דלתות")}
                          </th>
                          <th className="text-end px-3 py-2 font-medium">
                            {copy(
                              "Profit Leak",
                              "Потеря прибыли",
                              "דליפת רווח",
                            )}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(projectRiskDrilldown.top_reasons || []).length ===
                        0 ? (
                          <tr>
                            <td
                              className="px-3 py-3 text-text-secondary"
                              colSpan={3}
                            >
                              {copy("No stalled reasons.", "Нет причин задержки.", "אין סיבות לעיכוב.")}
                            </td>
                          </tr>
                        ) : (
                          (projectRiskDrilldown.top_reasons || []).map(
                            (item) => (
                              <tr
                                key={item.reason_id || item.reason_name}
                                className="border-t border-border"
                              >
                                <td className="px-3 py-2.5 font-medium text-text">
                                  {item.reason_name}
                                </td>
                                <td className="px-3 py-2 text-end">
                                  {item.doors}
                                </td>
                                <td className="px-3 py-2 text-end">
                                  {formatAmount(item.profit_delayed_total)}
                                </td>
                              </tr>
                            ),
                          )
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="rounded-lg border border-border bg-surface overflow-hidden xl:col-span-1">
                    <div className="border-b border-border px-3 py-2 text-[11px] uppercase text-text-secondary">
                      {copy("Risky Orders", "Заказы с риском", "הזמנות בסיכון")}
                    </div>
                    <div className="divide-y divide-border-subtle md:hidden">
                      {(projectRiskDrilldown.risky_orders || []).length ===
                      0 ? (
                        <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                          {copy(
                            "No risky orders.",
                            "Рискованных заказов нет.",
                            "אין הזמנות מסוכנות.",
                          )}
                        </div>
                      ) : (
                        (projectRiskDrilldown.risky_orders || []).map(
                          (item) => (
                            <article
                              key={`mobile-${item.order_number}`}
                              className="px-3.5 py-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 text-[13px] font-semibold leading-5 text-text">
                                  {item.order_number}
                                </div>
                                <div className="shrink-0 rounded-full bg-surface-subtle px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                                  {formatPercent(item.completion_pct)}
                                </div>
                              </div>
                              <div className="mt-3 grid grid-cols-2 gap-2">
                                <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                  <div className="text-[10px] uppercase text-text-secondary">
                                    {copy("Gap", "Разрыв", "פער")}
                                  </div>
                                  <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                    {formatAmount(item.revenue_gap_total)}
                                  </div>
                                </div>
                                <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                  <div className="text-[10px] uppercase text-text-secondary">
                                    {copy("Issues", "Проблемы", "תקלות")}
                                  </div>
                                  <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                    {item.open_issues}
                                  </div>
                                </div>
                              </div>
                            </article>
                          ),
                        )
                      )}
                    </div>
                    <table className="hidden w-full text-[12px] md:table">
                      <thead className="bg-surface-subtle text-text-secondary">
                        <tr>
                          <th className="text-start px-3 py-2 font-medium">
                            {copy("Order", "Заказ", "הזמנה")}
                          </th>
                          <th className="text-end px-3 py-2 font-medium">
                            {copy("Gap", "Разрыв", "פער")}
                          </th>
                          <th className="text-end px-3 py-2 font-medium">
                            {copy("Issues", "Проблемы", "תקלות")}
                          </th>
                          <th className="text-end px-3 py-2 font-medium">
                            {copy("Completion", "Завершение", "השלמה")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(projectRiskDrilldown.risky_orders || []).length ===
                        0 ? (
                          <tr>
                            <td
                              className="px-3 py-3 text-text-secondary"
                              colSpan={4}
                            >
                              {copy(
                                "No risky orders.",
                                "Рискованных заказов нет.",
                                "אין הזמנות מסוכנות.",
                              )}
                            </td>
                          </tr>
                        ) : (
                          (projectRiskDrilldown.risky_orders || []).map(
                            (item) => (
                              <tr
                                key={item.order_number}
                                className="border-t border-border"
                              >
                                <td className="px-3 py-2.5 font-medium text-text">
                                  {item.order_number}
                                </td>
                                <td className="px-3 py-2 text-end">
                                  {formatAmount(item.revenue_gap_total)}
                                </td>
                                <td className="px-3 py-2 text-end">
                                  {item.open_issues}
                                </td>
                                <td className="px-3 py-2 text-end">
                                  {formatPercent(item.completion_pct)}
                                </td>
                              </tr>
                            ),
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
        </div>

        <div
          id="reports-project-margin-executive"
          className={reportsPanelClass("overflow-hidden")}
        >
          <div className="px-4 py-3 border-b border-border bg-surface-subtle">
            <div className="text-[11px] uppercase text-text-secondary">
              {tt("reports.projectMarginExecutiveTitle")}
            </div>
            <div className="text-[13px] text-text-secondary">
              {tt("reports.projectMarginExecutiveSubtitle")}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 p-4">
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="px-3 py-2 border-b border-border bg-surface-subtle text-[12px] font-medium">
                {tt("reports.topMarginProjects")}
              </div>
              {topProjectsMarginQuery.isLoading ? (
                <div className="px-3 py-4 text-[13px] text-text-secondary">
                  {tt("reports.loadingTopMarginProjects")}
                </div>
              ) : topProjectsMarginQuery.isError ? (
                <div className="px-3 py-4 text-[13px] text-status-problem-fg">
                  {readError(
                    topProjectsMarginQuery.error,
                    tt("reports.failedTopMarginProjects"),
                  )}
                </div>
              ) : (
                <>
                  <div className="divide-y divide-border-subtle md:hidden">
                    {topProjectsMargin.length === 0 ? (
                      <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                        {tt("reports.noProfitableProjects")}
                      </div>
                    ) : (
                      topProjectsMargin.map((item) => (
                        <article
                          key={`mobile-top-${item.project_id}`}
                          className="px-3.5 py-3"
                        >
                          <div className="min-w-0 text-[13px] font-semibold leading-5 text-text">
                            {item.project_name}
                          </div>
                          <div className="mt-1 text-[11px] leading-4 text-text-secondary">
                            {tt("reports.statusIssues")
                              .replace("{status}", item.project_status)
                              .replace("{issues}", String(item.open_issues))}
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                              <div className="text-[10px] uppercase text-text-secondary">
                                {copy("Profit", "Прибыль", "רווח")}
                              </div>
                              <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                {formatAmount(item.profit_total)}
                              </div>
                            </div>
                            <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                              <div className="text-[10px] uppercase text-text-secondary">
                                {copy("Margin", "Маржа", "מרווח")}
                              </div>
                              <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                {formatPercent(item.margin_pct)}
                              </div>
                            </div>
                            <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                              <div className="text-[10px] uppercase text-text-secondary">
                                {copy("Completion", "Завершение", "השלמה")}
                              </div>
                              <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                {formatPercent(item.completion_pct)}
                              </div>
                            </div>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                  <table className="hidden w-full text-[12px] md:table">
                    <thead className="bg-surface-subtle text-text-secondary">
                      <tr>
                        <th className="text-start px-3 py-2 font-medium">
                          {copy("Project", "Проект", "פרויקט")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {copy("Profit", "Прибыль", "רווח")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {copy("Margin", "Маржа", "מרווח")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {copy("Completion", "Завершение", "השלמה")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProjectsMargin.length === 0 ? (
                        <tr>
                          <td
                            className="px-3 py-3 text-text-secondary"
                            colSpan={4}
                          >
                            {tt("reports.noProfitableProjects")}
                          </td>
                        </tr>
                      ) : (
                        topProjectsMargin.map((item) => (
                          <tr
                            key={`top-${item.project_id}`}
                            className="border-t border-border"
                          >
                            <td className="px-3 py-2.5">
                              <div className="font-medium text-text">
                                {item.project_name}
                              </div>
                              <div className="text-[11px] text-text-secondary">
                                {tt("reports.statusIssues")
                                  .replace("{status}", item.project_status)
                                  .replace(
                                    "{issues}",
                                    String(item.open_issues),
                                  )}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-end">
                              {formatAmount(item.profit_total)}
                            </td>
                            <td className="px-3 py-2 text-end">
                              {formatPercent(item.margin_pct)}
                            </td>
                            <td className="px-3 py-2 text-end">
                              {formatPercent(item.completion_pct)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </>
              )}
            </div>

            <div className="overflow-hidden rounded-lg border border-border">
              <div className="px-3 py-2 border-b border-border bg-surface-subtle text-[12px] font-medium">
                {tt("reports.lowMarginRiskProjects")}
              </div>
              {riskProjectsMarginQuery.isLoading ? (
                <div className="px-3 py-4 text-[13px] text-text-secondary">
                  {tt("reports.loadingLowMarginProjects")}
                </div>
              ) : riskProjectsMarginQuery.isError ? (
                <div className="px-3 py-4 text-[13px] text-status-problem-fg">
                  {readError(
                    riskProjectsMarginQuery.error,
                    tt("reports.failedLowMarginProjects"),
                  )}
                </div>
              ) : (
                <>
                  <div className="divide-y divide-border-subtle md:hidden">
                    {riskProjectsMargin.length === 0 ? (
                      <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                        {tt("reports.noLowMarginProjects")}
                      </div>
                    ) : (
                      riskProjectsMargin.map((item) => (
                        <article
                          key={`mobile-risk-${item.project_id}`}
                          className="px-3.5 py-3"
                        >
                          <div className="min-w-0 text-[13px] font-semibold leading-5 text-text">
                            {item.project_name}
                          </div>
                          <div className="mt-1 text-[11px] leading-4 text-text-secondary">
                            {tt("reports.completionIssues")
                              .replace(
                                "{completion}",
                                formatPercent(item.completion_pct),
                              )
                              .replace("{issues}", String(item.open_issues))}
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                              <div className="text-[10px] uppercase text-text-secondary">
                                {copy("Profit", "Прибыль", "רווח")}
                              </div>
                              <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                {formatAmount(item.profit_total)}
                              </div>
                            </div>
                            <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                              <div className="text-[10px] uppercase text-text-secondary">
                                {copy("Margin", "Маржа", "מרווח")}
                              </div>
                              <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                {formatPercent(item.margin_pct)}
                              </div>
                            </div>
                            <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                              <div className="text-[10px] uppercase text-text-secondary">
                                {copy(
                                  "Data Risk",
                                  "Риск данных",
                                  "סיכון נתונים",
                                )}
                              </div>
                              <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                {item.missing_rates_installed_doors +
                                  item.missing_addon_plans_facts}
                              </div>
                            </div>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                  <table className="hidden w-full text-[12px] md:table">
                    <thead className="bg-surface-subtle text-text-secondary">
                      <tr>
                        <th className="text-start px-3 py-2 font-medium">
                          {copy("Project", "Проект", "פרויקט")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {copy("Profit", "Прибыль", "רווח")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {copy("Margin", "Маржа", "מרווח")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {copy("Data Risk", "Риск данных", "סיכון נתונים")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {riskProjectsMargin.length === 0 ? (
                        <tr>
                          <td
                            className="px-3 py-3 text-text-secondary"
                            colSpan={4}
                          >
                            {tt("reports.noLowMarginProjects")}
                          </td>
                        </tr>
                      ) : (
                        riskProjectsMargin.map((item) => (
                          <tr
                            key={`risk-${item.project_id}`}
                            className="border-t border-border"
                          >
                            <td className="px-3 py-2.5">
                              <div className="font-medium text-text">
                                {item.project_name}
                              </div>
                              <div className="text-[11px] text-text-secondary">
                                {tt("reports.completionIssues")
                                  .replace(
                                    "{completion}",
                                    formatPercent(item.completion_pct),
                                  )
                                  .replace(
                                    "{issues}",
                                    String(item.open_issues),
                                  )}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-end">
                              {formatAmount(item.profit_total)}
                            </td>
                            <td className="px-3 py-2 text-end">
                              {formatPercent(item.margin_pct)}
                            </td>
                            <td className="px-3 py-2 text-end">
                              {item.missing_rates_installed_doors +
                                item.missing_addon_plans_facts}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>
        </div>

        <div
          id="reports-installer-profitability-matrix"
          className={reportsPanelClass("overflow-hidden")}
        >
          <div className="px-4 py-3 border-b border-border bg-surface-subtle flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase text-text-secondary">
                {tt("reports.riskConcentrationTitle")}
              </div>
              <div className="text-[13px] text-text-secondary">
                {tt("reports.riskConcentrationSubtitle")}
              </div>
            </div>
            <div className="text-end text-[11px] text-text-secondary">
              {riskConcentration?.generated_at
                ? formatDateTime(riskConcentration.generated_at)
                : tt("reports.notAvailableShort")}
            </div>
          </div>

          {riskConcentrationQuery.isLoading ? (
            <div className="px-4 py-6 text-[13px] text-text-secondary">
              {tt("reports.loadingRiskConcentration")}
            </div>
          ) : riskConcentrationQuery.isError ? (
            <div className="px-4 py-6 text-[13px] text-status-problem-fg">
              {readError(
                riskConcentrationQuery.error,
                tt("reports.failedRiskConcentration"),
              )}
            </div>
          ) : (
            <div className="p-4 space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-lg border border-border bg-surface p-3">
                  <div className="text-[11px] uppercase text-text-secondary">
                    {tt("reports.delayedProfitLabel")}
                  </div>
                  <div className="mt-2 text-[22px] font-semibold text-status-problem-fg">
                    {formatAmount(
                      riskConcentration?.summary?.delayed_profit_total,
                    )}
                  </div>
                  <div className="mt-1 text-[12px] text-text-secondary">
                    {tt("reports.openIssueRisk").replace(
                      "{amount}",
                      formatAmount(
                        riskConcentration?.summary?.open_issue_profit_at_risk,
                      ),
                    )}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-surface p-3">
                  <div className="text-[11px] uppercase text-text-secondary">
                    {tt("reports.blockedIssueRisk")}
                  </div>
                  <div className="mt-2 text-[22px] font-semibold text-status-warning-fg">
                    {formatAmount(
                      riskConcentration?.summary?.blocked_issue_profit_at_risk,
                    )}
                  </div>
                  <div className="mt-1 text-[12px] text-text-secondary">
                    {tt("reports.worstInstaller").replace(
                      "{amount}",
                      formatAmount(
                        riskConcentration?.summary
                          ?.worst_installer_profit_total,
                      ),
                    )}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-surface p-3">
                  <div className="text-[11px] uppercase text-text-secondary">
                    {tt("reports.riskyProjectsOrders")}
                  </div>
                  <div className="mt-2 text-[22px] font-semibold text-text">
                    {riskConcentration?.summary?.risky_projects ?? 0} /{" "}
                    {riskConcentration?.summary?.risky_orders ?? 0}
                  </div>
                  <div className="mt-1 text-[12px] text-text-secondary">
                    {tt("reports.worstProject").replace(
                      "{amount}",
                      formatAmount(
                        riskConcentration?.summary?.worst_project_profit_total,
                      ),
                    )}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-surface p-3">
                  <div className="text-[11px] uppercase text-text-secondary">
                    {copy("Risky Installers", "Рискованные монтажники", "מתקינים מסוכנים")}
                  </div>
                  <div className="mt-2 text-[22px] font-semibold text-text">
                    {riskConcentration?.summary?.risky_installers ?? 0}
                  </div>
                  <div className="mt-1 text-[12px] text-text-secondary">
                    {copy("Highest-risk order", "Заказ с наибольшим риском", "הזמנה בסיכון הגבוה ביותר")}{" "}
                    {formatAmount(
                      riskConcentration?.summary?.worst_order_profit_total,
                    )}
                  </div>
                </div>
              </div>

              {(riskConcentration?.projects || []).length === 0 &&
                (riskConcentration?.orders || []).length === 0 &&
                (riskConcentration?.installers || []).length === 0 && (
                  <SectionMessage
                    title={copy("No concentrated risk yet", "Скопления рисков пока нет", "אין עדיין ריכוז סיכונים")}
                    detail={copy(
                      "This tenant does not currently have enough delayed doors, open issues or low-margin rows to populate the cross-cutting executive risk view.",
                      "Сейчас недостаточно просроченных дверей, открытых проблем или низкомаржинальных строк для сводного анализа рисков.",
                      "כרגע אין מספיק דלתות באיחור, תקלות פתוחות או שורות ברווחיות נמוכה להצגת סיכונים משולבת.",
                    )}
                  />
                )}

              <div className="grid gap-4 xl:grid-cols-3">
                <div className="rounded-lg border border-border bg-surface overflow-hidden">
                  <div className="border-b border-border px-3 py-2 text-[11px] uppercase text-text-secondary">
                    {copy("Projects at Risk", "Проекты под угрозой", "פרויקטים בסיכון")}
                  </div>
                  <div className="divide-y divide-border-subtle md:hidden">
                    {(riskConcentration?.projects || []).length === 0 ? (
                      <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                        {copy("No risky projects.", "Никаких рискованных проектов.", "אין פרויקטים מסוכנים.")}
                      </div>
                    ) : (
                      (riskConcentration?.projects || []).map((item) => (
                        <article
                          key={`mobile-${item.project_id}`}
                          className="px-3.5 py-3"
                        >
                          <div className="min-w-0 text-[13px] font-semibold leading-5 text-text">
                            {item.project_name}
                          </div>
                          <div className="mt-1 text-[11px] text-text-secondary">
                            {copy("Completion", "Завершение", "השלמה")} {formatPercent(item.completion_pct)}
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                              <div className="text-[10px] uppercase text-text-secondary">
                                {copy("Profit", "Прибыль", "רווח")}
                              </div>
                              <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                {formatAmount(item.profit_total)}
                              </div>
                            </div>
                            <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                              <div className="text-[10px] uppercase text-text-secondary">
                                {copy("Margin", "Маржа", "מרווח")}
                              </div>
                              <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                {formatPercent(item.margin_pct)}
                              </div>
                            </div>
                            <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                              <div className="text-[10px] uppercase text-text-secondary">
                                {copy("Issues", "Проблемы", "תקלות")}
                              </div>
                              <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                {item.open_issues}
                              </div>
                            </div>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                  <table className="hidden w-full text-[12px] md:table">
                    <thead className="bg-surface-subtle text-text-secondary">
                      <tr>
                        <th className="text-start px-3 py-2 font-medium">
                          {copy("Project", "Проект", "פרויקט")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {copy("Profit", "Прибыль", "רווח")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {copy("Margin", "Маржа", "מרווח")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {copy("Issues", "Проблемы", "תקלות")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(riskConcentration?.projects || []).length === 0 ? (
                        <tr>
                          <td
                            className="px-3 py-3 text-text-secondary"
                            colSpan={4}
                          >
                            {copy("No risky projects.", "Никаких рискованных проектов.", "אין פרויקטים מסוכנים.")}
                          </td>
                        </tr>
                      ) : (
                        (riskConcentration?.projects || []).map((item) => (
                          <tr
                            key={item.project_id}
                            className="border-t border-border"
                          >
                            <td className="px-3 py-2.5">
                              <div className="font-medium text-text">
                                {item.project_name}
                              </div>
                              <div className="text-[11px] text-text-secondary">
                                {copy("Completion", "Завершение", "השלמה")} {formatPercent(item.completion_pct)}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-end">
                              {formatAmount(item.profit_total)}
                            </td>
                            <td className="px-3 py-2 text-end">
                              {formatPercent(item.margin_pct)}
                            </td>
                            <td className="px-3 py-2 text-end">
                              {item.open_issues}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-lg border border-border bg-surface overflow-hidden">
                  <div className="border-b border-border px-3 py-2 text-[11px] uppercase text-text-secondary">
                    {copy("Orders at Risk", "Заказы под угрозой", "הזמנות בסיכון")}
                  </div>
                  <div className="divide-y divide-border-subtle md:hidden">
                    {(riskConcentration?.orders || []).length === 0 ? (
                      <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                        {copy("No risky orders.", "Нет заказов с риском.", "אין הזמנות בסיכון.")}
                      </div>
                    ) : (
                      (riskConcentration?.orders || []).map((item) => (
                        <article
                          key={`mobile-${item.order_number}`}
                          className="px-3.5 py-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 text-[13px] font-semibold leading-5 text-text">
                              {item.order_number}
                            </div>
                            <div className="shrink-0 rounded-full bg-surface-subtle px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                              {formatPercent(item.completion_pct)}
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                              <div className="text-[10px] uppercase text-text-secondary">
                                {copy("Profit", "Прибыль", "רווח")}
                              </div>
                              <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                {formatAmount(item.profit_total)}
                              </div>
                            </div>
                            <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                              <div className="text-[10px] uppercase text-text-secondary">
                                {copy("Delayed", "Задержка", "עיכוב")}
                              </div>
                              <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                {item.not_installed_doors}
                              </div>
                            </div>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                  <table className="hidden w-full text-[12px] md:table">
                    <thead className="bg-surface-subtle text-text-secondary">
                      <tr>
                        <th className="text-start px-3 py-2 font-medium">
                          {copy("Order", "Заказ", "הזמנה")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {copy("Profit", "Прибыль", "רווח")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {copy("Delayed", "Задержка", "עיכוב")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {copy("Completion", "Завершение", "השלמה")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(riskConcentration?.orders || []).length === 0 ? (
                        <tr>
                          <td
                            className="px-3 py-3 text-text-secondary"
                            colSpan={4}
                          >
                            {copy("No risky orders.", "Нет заказов с риском.", "אין הזמנות בסיכון.")}
                          </td>
                        </tr>
                      ) : (
                        (riskConcentration?.orders || []).map((item) => (
                          <tr
                            key={item.order_number}
                            className="border-t border-border"
                          >
                            <td className="px-3 py-2.5 font-medium text-text">
                              {item.order_number}
                            </td>
                            <td className="px-3 py-2 text-end">
                              {formatAmount(item.profit_total)}
                            </td>
                            <td className="px-3 py-2 text-end">
                              {item.not_installed_doors}
                            </td>
                            <td className="px-3 py-2 text-end">
                              {formatPercent(item.completion_pct)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-lg border border-border bg-surface overflow-hidden">
                  <div className="border-b border-border px-3 py-2 text-[11px] uppercase text-text-secondary">
                    {copy("Installers at Risk", "монтажники в опасности", "מתקינים בסיכון")}
                  </div>
                  <div className="divide-y divide-border-subtle md:hidden">
                    {(riskConcentration?.installers || []).length === 0 ? (
                      <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                        {copy("No risky installers.", "Никаких рискованных монтажников.", "אין מתקינים מסוכנים.")}
                      </div>
                    ) : (
                      (riskConcentration?.installers || []).map((item) => (
                        <article
                          key={`mobile-${item.installer_id}`}
                          className="px-3.5 py-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-[13px] font-semibold leading-5 text-text">
                                {item.installer_name}
                              </div>
                              <div className="mt-1 text-[11px] text-text-secondary">
                                {copy("Issues", "Проблемы", "תקלות")} {item.open_issues}
                              </div>
                            </div>
                            <span
                              className={cn(
                                "shrink-0 rounded border px-2 py-0.5 text-[11px] font-semibold",
                                installerPerformanceBandClass(
                                  item.performance_band,
                                ),
                              )}
                            >
                              {item.performance_band}
                            </span>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                              <div className="text-[10px] uppercase text-text-secondary">
                                {copy("Profit", "Прибыль", "רווח")}
                              </div>
                              <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                {formatAmount(item.profit_total)}
                              </div>
                            </div>
                            <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                              <div className="text-[10px] uppercase text-text-secondary">
                                {copy("Margin", "Маржа", "מרווח")}
                              </div>
                              <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                {formatPercent(item.margin_pct)}
                              </div>
                            </div>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                  <table className="hidden w-full text-[12px] md:table">
                    <thead className="bg-surface-subtle text-text-secondary">
                      <tr>
                        <th className="text-start px-3 py-2 font-medium">
                          {copy("Installer", "Монтажник", "מתקין")}
                        </th>
                        <th className="text-start px-3 py-2 font-medium">
                          {copy("Band", "Сегмент", "קטגוריה")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {copy("Profit", "Прибыль", "רווח")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {copy("Margin", "Маржа", "מרווח")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(riskConcentration?.installers || []).length === 0 ? (
                        <tr>
                          <td
                            className="px-3 py-3 text-text-secondary"
                            colSpan={4}
                          >
                            {copy("No risky installers.", "Никаких рискованных монтажников.", "אין מתקינים מסוכנים.")}
                          </td>
                        </tr>
                      ) : (
                        (riskConcentration?.installers || []).map((item) => {
                          const bandClass = installerPerformanceBandClass(
                            item.performance_band,
                          );
                          return (
                            <tr
                              key={item.installer_id}
                              className="border-t border-border"
                            >
                              <td className="px-3 py-2.5">
                                <div className="font-medium text-text">
                                  {item.installer_name}
                                </div>
                                <div className="text-[11px] text-text-secondary">
                                  {copy("Issues", "Проблемы", "תקלות")} {item.open_issues}
                                </div>
                              </td>
                              <td className="px-3 py-2.5">
                                <span
                                  className={cn(
                                    "inline-flex rounded border px-2 py-0.5 text-[11px] font-semibold",
                                    bandClass,
                                  )}
                                >
                                  {item.performance_band}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-end">
                                {formatAmount(item.profit_total)}
                              </td>
                              <td className="px-3 py-2 text-end">
                                {formatPercent(item.margin_pct)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div
          id="reports-installer-cross-view"
          className={reportsPanelClass("overflow-hidden")}
        >
          <div className="px-4 py-3 border-b border-border bg-surface-subtle flex flex-col items-stretch gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-[11px] uppercase text-text-secondary">
                {tt("reports.installerProfitabilityMatrix")}
              </div>
              <div className="text-[13px] text-text-secondary">
                {tt("reports.installerProfitabilitySubtitle")}
              </div>
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:flex xl:flex-wrap xl:items-center xl:justify-end">
              <select
                aria-label={copy("Installer Matrix Sort", "Сортировка матрицы монтажников", "מיון מטריצת מתקינים")}
                value={installerMatrixSortBy}
                onChange={(e) =>
                  setInstallerMatrixSortBy(
                    e.target.value as InstallerMatrixSortBy,
                  )
                }
                className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px] xl:w-auto xl:max-w-[220px]"
              >
                {INSTALLER_MATRIX_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {optionLabel(option.label)}
                  </option>
                ))}
              </select>
              <select
                aria-label={copy("Installer Matrix Direction", "Направление сортировки матрицы монтажников", "כיוון מיון מטריצת מתקינים")}
                value={installerMatrixSortDir}
                onChange={(e) =>
                  setInstallerMatrixSortDir(e.target.value as SortDir)
                }
                className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px] xl:w-auto xl:max-w-[220px]"
              >
                {SORT_DIR_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {installerProfitabilityMatrixQuery.isLoading ? (
            <div className="px-4 py-6 text-[13px] text-text-secondary">
              {tt("reports.loadingInstallerProfitability")}
            </div>
          ) : installerProfitabilityMatrixQuery.isError ? (
            <div className="px-4 py-6 text-[13px] text-status-problem-fg">
              {readError(
                installerProfitabilityMatrixQuery.error,
                copy(
                  "Failed to load installer profitability matrix",
                  "Не удалось загрузить матрицу прибыльности монтажников",
                  "טעינת מטריצת רווחיות המתקינים נכשלה",
                ),
              )}
            </div>
          ) : installerProfitabilityMatrix.length === 0 ? (
            <div className="px-4 py-6 text-[13px] text-text-secondary">
              {copy(
                "No installer profitability rows.",
                "Нет строк прибыльности по монтажникам.",
                "אין שורות רווחיות למתקינים.",
              )}
            </div>
          ) : (
            <>
              <div className="divide-y divide-border-subtle md:hidden">
                {installerProfitabilityMatrix.map((item) => (
                  <article
                    key={`mobile-${item.installer_id}`}
                    className="px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold leading-5 text-text">
                          {item.installer_name}
                        </div>
                        <div className="mt-1 text-[11px] leading-4 text-text-secondary">
                          {tt("reports.projectsAddons")
                            .replace("{projects}", String(item.active_projects))
                            .replace(
                              "{addons}",
                              formatAmount(item.addons_done_qty),
                            )}
                        </div>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded border px-2 py-0.5 text-[11px] font-semibold",
                          installerPerformanceBandClass(item.performance_band),
                        )}
                      >
                        {item.performance_band}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                        <div className="text-[10px] uppercase text-text-secondary">
                          {copy("Installed", "Смонтировано", "הותקן")}
                        </div>
                        <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                          {item.installed_doors}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                        <div className="text-[10px] uppercase text-text-secondary">
                          {copy("Revenue", "Выручка", "הכנסה")}
                        </div>
                        <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                          {formatAmount(item.revenue_total)}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                        <div className="text-[10px] uppercase text-text-secondary">
                          {copy("Profit", "Прибыль", "רווח")}
                        </div>
                        <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                          {formatAmount(item.profit_total)}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                        <div className="text-[10px] uppercase text-text-secondary">
                          {copy("Margin", "Маржа", "מרווח")}
                        </div>
                        <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                          {formatPercent(item.margin_pct)}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                        <div className="text-[10px] uppercase text-text-secondary">
                          {copy("Issues", "Проблемы", "תקלות")}
                        </div>
                        <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                          {item.open_issues}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                        <div className="text-[10px] uppercase text-text-secondary">
                          {copy("Data Risk", "Риск данных", "סיכון נתונים")}
                        </div>
                        <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                          {item.missing_rates_installed_doors +
                            item.missing_addon_plans_facts}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              <div className="hidden overflow-auto md:block">
                <table className="w-full text-[12px]">
                  <thead className="bg-surface-subtle text-text-secondary">
                    <tr>
                      <th className="text-start px-3 py-2 font-medium">
                        {copy("Installer", "Монтажник", "מתקין")}
                      </th>
                      <th className="text-start px-3 py-2 font-medium">
                        {copy("Band", "Сегмент", "קטגוריה")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Installed", "Смонтировано", "הותקן")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Revenue", "Выручка", "הכנסה")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Profit", "Прибыль", "רווח")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Margin", "Маржа", "מרווח")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Profit / Door", "Прибыль / дверь", "רווח / דלת")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Issues", "Проблемы", "תקלות")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Data Risk", "Риск данных", "סיכון נתונים")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {installerProfitabilityMatrix.map((item) => {
                      const bandClass = installerPerformanceBandClass(
                        item.performance_band,
                      );
                      return (
                        <tr
                          key={item.installer_id}
                          className="border-t border-border"
                        >
                          <td className="px-3 py-2.5">
                            <div className="font-medium text-text">
                              {item.installer_name}
                            </div>
                            <div className="text-[11px] text-text-secondary">
                              {tt("reports.projectsAddons")
                                .replace(
                                  "{projects}",
                                  String(item.active_projects),
                                )
                                .replace(
                                  "{addons}",
                                  formatAmount(item.addons_done_qty),
                                )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={cn(
                                "inline-flex rounded border px-2 py-0.5 text-[11px] font-semibold",
                                bandClass,
                              )}
                            >
                              {item.performance_band}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-end">
                            {item.installed_doors}
                          </td>
                          <td className="px-3 py-2 text-end">
                            {formatAmount(item.revenue_total)}
                          </td>
                          <td className="px-3 py-2 text-end">
                            {formatAmount(item.profit_total)}
                          </td>
                          <td className="px-3 py-2 text-end">
                            {formatPercent(item.margin_pct)}
                          </td>
                          <td className="px-3 py-2 text-end">
                            {formatAmount(item.avg_profit_per_door)}
                          </td>
                          <td className="px-3 py-2 text-end">
                            {item.open_issues}
                          </td>
                          <td className="px-3 py-2 text-end">
                            {item.missing_rates_installed_doors +
                              item.missing_addon_plans_facts}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div
          id="reports-installers-kpi"
          className={reportsPanelClass("overflow-hidden")}
        >
          <div className="px-4 py-3 border-b border-border bg-surface-subtle flex flex-col items-stretch gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-[11px] uppercase text-text-secondary">
                {tt("reports.installerCrossViewTitle")}
              </div>
              <div className="text-[13px] text-text-secondary">
                {tt("reports.installerCrossViewSubtitle")}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <select
                aria-label={copy("Installer Project Sort", "Сортировка объектов монтажника", "מיון פרויקטים של מתקין")}
                value={installerProjectSortBy}
                onChange={(e) =>
                  setInstallerProjectSortBy(
                    e.target.value as InstallerProjectSortBy,
                  )
                }
                className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px] xl:w-auto xl:max-w-[180px]"
              >
                {INSTALLER_PROJECT_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {optionLabel(option.label)}
                  </option>
                ))}
              </select>
              <select
                aria-label={copy("Installer Project Direction", "Направление сортировки объектов монтажника", "כיוון מיון פרויקטים של מתקין")}
                value={installerProjectSortDir}
                onChange={(e) =>
                  setInstallerProjectSortDir(e.target.value as SortDir)
                }
                className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px] xl:w-auto xl:max-w-[120px]"
              >
                {SORT_DIR_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {installerProjectProfitabilityQuery.isLoading ? (
            <div className="px-4 py-6 text-[13px] text-text-secondary">
              {tt("reports.loadingInstallerCrossView")}
            </div>
          ) : installerProjectProfitabilityQuery.isError ? (
            <div className="px-4 py-6 text-[13px] text-status-problem-fg">
              {readError(
                installerProjectProfitabilityQuery.error,
                copy(
                  "Failed to load installer-project cross-view",
                  "Не удалось загрузить перекрестное представление проекта монтажника.",
                  "טעינת הצגה צולבת של מתקין-פרויקט נכשלה",
                ),
              )}
            </div>
          ) : installerProjectProfitability.length === 0 ? (
            <div className="px-4 py-6">
              <SectionMessage
                title={copy(
                  "No installer-project cross-view rows",
                  "Нет строк перекрестного просмотра монтажника и проекта.",
                  "אין שורות צולבות של פרויקט מתקין",
                )}
                detail={copy(
                  "This view appears after installed doors or add-on facts create measurable profitability per installer and project.",
                  "Это представление появляется после того, как установленные двери или дополнительные элементы создают измеримую прибыльность для каждого монтажника и проекта.",
                  "תצוגה זו מופיעה לאחר שדלתות מותקנות או עובדות תוספות יוצרות רווחיות מדידה לכל מתקין ופרויקט.",
                )}
              />
            </div>
          ) : (
            <>
              <div className="divide-y divide-border-subtle md:hidden">
                {installerProjectProfitability.map((item) => (
                  <article
                    key={`mobile-${item.installer_id}-${item.project_id}`}
                    className="px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold leading-5 text-text">
                          {item.installer_name}
                        </div>
                        <div className="mt-1 text-[11px] leading-4 text-text-secondary">
                          {item.project_name}
                        </div>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded border px-2 py-0.5 text-[11px] font-semibold",
                          installerPerformanceBandClass(item.performance_band),
                        )}
                      >
                        {item.performance_band}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                        <div className="text-[10px] uppercase text-text-secondary">
                          {copy("Installed", "Смонтировано", "הותקן")}
                        </div>
                        <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                          {item.installed_doors}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                        <div className="text-[10px] uppercase text-text-secondary">
                          {copy("Revenue", "Выручка", "הכנסה")}
                        </div>
                        <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                          {formatAmount(item.revenue_total)}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                        <div className="text-[10px] uppercase text-text-secondary">
                          {copy("Profit", "Прибыль", "רווח")}
                        </div>
                        <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                          {formatAmount(item.profit_total)}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                        <div className="text-[10px] uppercase text-text-secondary">
                          {copy("Margin", "Маржа", "מרווח")}
                        </div>
                        <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                          {formatPercent(item.margin_pct)}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                        <div className="text-[10px] uppercase text-text-secondary">
                          {copy("Issues", "Проблемы", "תקלות")}
                        </div>
                        <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                          {item.open_issues}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                        <div className="text-[10px] uppercase text-text-secondary">
                          {copy("Data Risk", "Риск данных", "סיכון נתונים")}
                        </div>
                        <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                          {item.missing_rates_installed_doors +
                            item.missing_addon_plans_facts}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              <div className="hidden overflow-auto md:block">
                <table className="w-full text-[12px]">
                  <thead className="bg-surface-subtle text-text-secondary">
                    <tr>
                      <th className="text-start px-3 py-2 font-medium">
                        {copy(
                          "Installer / Project",
                          "Монтажник / проект",
                          "מתקין / פרויקט",
                        )}
                      </th>
                      <th className="text-start px-3 py-2 font-medium">
                        {copy("Band", "Сегмент", "קטגוריה")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Installed", "Смонтировано", "הותקן")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Revenue", "Выручка", "הכנסה")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Profit", "Прибыль", "רווח")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Margin", "Маржа", "מרווח")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Profit / Door", "Прибыль / дверь", "רווח / דלת")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Issues", "Проблемы", "תקלות")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Data Risk", "Риск данных", "סיכון נתונים")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {installerProjectProfitability.map((item) => {
                      const bandClass = installerPerformanceBandClass(
                        item.performance_band,
                      );
                      return (
                        <tr
                          key={`${item.installer_id}-${item.project_id}`}
                          className="border-t border-border"
                        >
                          <td className="px-3 py-2.5">
                            <div className="font-medium text-text">
                              {item.installer_name}
                            </div>
                            <div className="text-[11px] text-text-secondary">
                              {item.project_name}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={cn(
                                "inline-flex rounded border px-2 py-0.5 text-[11px] font-semibold",
                                bandClass,
                              )}
                            >
                              {item.performance_band}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-end">
                            {item.installed_doors}
                          </td>
                          <td className="px-3 py-2 text-end">
                            {formatAmount(item.revenue_total)}
                          </td>
                          <td className="px-3 py-2 text-end">
                            {formatAmount(item.profit_total)}
                          </td>
                          <td className="px-3 py-2 text-end">
                            {formatPercent(item.margin_pct)}
                          </td>
                          <td className="px-3 py-2 text-end">
                            {formatAmount(item.avg_profit_per_door)}
                          </td>
                          <td className="px-3 py-2 text-end">
                            {item.open_issues}
                          </td>
                          <td className="px-3 py-2 text-end">
                            {item.missing_rates_installed_doors +
                              item.missing_addon_plans_facts}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div
          id="reports-order-numbers-kpi"
          className={reportsPanelClass("overflow-hidden")}
        >
          <div className="px-4 py-3 border-b border-border bg-surface-subtle flex flex-col items-stretch gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-[11px] uppercase text-text-secondary">
                {tt("reports.installersKpiTitle")}
              </div>
              <div className="text-[13px] text-text-secondary">
                {tt("reports.installersKpiSubtitle")}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <select
                value={installersSortBy}
                onChange={(e) => {
                  setInstallersSortBy(e.target.value as InstallersSortBy);
                  setInstallersKpiOffset(0);
                }}
                className="h-9 rounded-md border border-border bg-surface px-2 text-[13px]"
              >
                {INSTALLERS_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={installersSortDir}
                onChange={(e) => {
                  setInstallersSortDir(e.target.value as SortDir);
                  setInstallersKpiOffset(0);
                }}
                className="h-9 rounded-md border border-border bg-surface px-2 text-[13px]"
              >
                {SORT_DIR_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => exportInstallersKpiMutation.mutate()}
                disabled={
                  !canExportFinancialReports ||
                  exportInstallersKpiMutation.isPending
                }
                title={ratesScopeHint}
                className="h-9 w-full rounded-md border border-border bg-surface px-3 text-[12px] disabled:opacity-50 xl:w-auto"
              >
                {tt("reports.exportInstallersCsv")}
              </button>
            </div>
          </div>

          <div className="hidden md:grid grid-cols-[1fr_120px_120px_120px_120px_110px] gap-3 px-4 py-3 border-b border-border text-[11px] uppercase text-text-secondary">
            <span>{copy("Installer", "Монтажник", "מתקין")}</span>
            <span className="text-end">
              {copy("Installed", "Смонтировано", "הותקן")}
            </span>
            <span className="text-end">{copy("Payroll", "ФОТ", "שכר")}</span>
            <span className="text-end">
              {copy("Revenue", "Выручка", "הכנסה")}
            </span>
            <span className="text-end">
              {copy("Profit", "Прибыль", "רווח")}
            </span>
            <span className="text-end">
              {copy("Missing Rates", "Нет ставок", "חסרים תעריפים")}
            </span>
          </div>

          {installersKpiQuery.isLoading && (
            <div className="px-4 py-6 text-[13px] text-text-secondary">
              {tt("reports.loadingInstallersKpi")}
            </div>
          )}
          {installersKpiQuery.isError && (
            <div className="px-4 py-6 text-[13px] text-status-problem-fg">
              {readError(
                installersKpiQuery.error,
                copy(
                  "Failed to load installers KPI",
                  "Не удалось загрузить KPI монтажников",
                  "טעינת KPI המתקינים נכשלה",
                ),
              )}
            </div>
          )}
          {!installersKpiQuery.isLoading &&
            !installersKpiQuery.isError &&
            installersKpiItems.length === 0 && (
              <div className="px-4 py-6 text-[13px] text-text-secondary">
                {copy(
                  "No installers KPI rows.",
                  "Нет строк KPI по монтажникам.",
                  "אין שורות KPI למתקינים.",
                )}
              </div>
            )}
          {!installersKpiQuery.isLoading &&
            !installersKpiQuery.isError &&
            installersKpiItems.map((item) => (
              <div key={item.installer_id} className="border-t border-border">
                <article className="px-4 py-3 md:hidden">
                  <div className="text-[13px] font-semibold leading-5 text-text">
                    {item.installer_name}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                      <div className="text-[10px] uppercase text-text-secondary">
                        {copy("Installed", "Смонтировано", "הותקן")}
                      </div>
                      <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                        {formatCount(item.installed_doors)}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                      <div className="text-[10px] uppercase text-text-secondary">
                        {copy("Payroll", "ФОТ", "שכר")}
                      </div>
                      <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                        {formatAmount(item.payroll_total)}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                      <div className="text-[10px] uppercase text-text-secondary">
                        {copy("Revenue", "Выручка", "הכנסה")}
                      </div>
                      <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                        {formatAmount(item.revenue_total)}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                      <div className="text-[10px] uppercase text-text-secondary">
                        {copy("Profit", "Прибыль", "רווח")}
                      </div>
                      <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                        {formatAmount(item.profit_total)}
                      </div>
                    </div>
                    <div className="col-span-2 rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                      <div className="text-[10px] uppercase text-text-secondary">
                        {copy("Missing Rates", "Нет ставок", "חסרים תעריפים")}
                      </div>
                      <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                        {formatCount(item.missing_rates_installed_doors)}
                      </div>
                    </div>
                  </div>
                </article>
                <div className="hidden md:grid grid-cols-[1fr_120px_120px_120px_120px_110px] gap-3 px-4 py-3 text-[13px] items-center">
                  <div className="font-medium text-text">
                    {item.installer_name}
                  </div>
                  <div className="text-end">
                    {formatCount(item.installed_doors)}
                  </div>
                  <div className="text-end">
                    {formatAmount(item.payroll_total)}
                  </div>
                  <div className="text-end">
                    {formatAmount(item.revenue_total)}
                  </div>
                  <div className="text-end">
                    {formatAmount(item.profit_total)}
                  </div>
                  <div className="text-end">
                    {formatCount(item.missing_rates_installed_doors)}
                  </div>
                </div>
              </div>
            ))}
          <div className="px-4 py-3 border-t border-border flex items-center justify-between text-[12px]">
            <div className="text-text-secondary">
              {tt("reports.rowsCount").replace(
                "{count}",
                String(installersKpiItems.length),
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={!installersKpiCanPrev}
                onClick={() =>
                  setInstallersKpiOffset((x) => Math.max(0, x - KPI_PAGE_SIZE))
                }
                className="h-8 px-3 rounded-md border border-border bg-surface disabled:opacity-50"
              >
                {tt("reports.prev")}
              </button>
              <button
                disabled={!installersKpiCanNext}
                onClick={() => setInstallersKpiOffset((x) => x + KPI_PAGE_SIZE)}
                className="h-8 px-3 rounded-md border border-border bg-surface disabled:opacity-50"
              >
                {tt("reports.next")}
              </button>
            </div>
          </div>
        </div>

        <div className={reportsPanelClass("overflow-hidden")}>
          <div className="px-4 py-3 border-b border-border bg-surface-subtle flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase text-text-secondary">
                {tt("reports.installerDrilldownTitle")}
              </div>
              <div className="text-[13px] text-text-secondary">
                {copy(
                  "Profitability, projects, orders and addon impact for the selected installer",
                  "Доходность, проекты, заказы и влияние доп. работ по выбранному монтажнику",
                  "רווחיות, פרויקטים, הזמנות והשפעת תוספות עבור המתקין שנבחר",
                )}
              </div>
            </div>
            <select
              aria-label={copy(
                "Installer KPI Details Filter",
                "Фильтр деталей KPI монтажника",
                "מסנן פרטי KPI למתקין",
              )}
              value={installerDetailsId}
              onChange={(e) => setInstallerDetailsId(e.target.value)}
              className="h-9 rounded-md border border-border bg-surface px-2 text-[13px]"
            >
              <option value="">
                {installersKpiQuery.isLoading
                  ? copy(
                      "Loading installers…",
                      "Загружаем монтажников…",
                      "טוען מתקינים…",
                    )
                  : copy(
                      "Select installer",
                      "Выберите монтажника",
                      "בחר מתקין",
                    )}
              </option>
              {installersKpiItems.map((item) => (
                <option key={item.installer_id} value={item.installer_id}>
                  {item.installer_name}
                </option>
              ))}
            </select>
          </div>

          {installersKpiQuery.isLoading && installersKpiItems.length === 0 && (
            <div className="px-4 py-6 text-[13px] text-text-secondary">
              {copy(
                "Loading installer drill-down…",
                "Загрузка детализации по монтажнику…",
                "טוען פירוט לפי מתקין…",
              )}
            </div>
          )}
          {!installersKpiQuery.isLoading && installersKpiItems.length === 0 && (
            <div className="px-4 py-6 text-[13px] text-text-secondary">
              {copy(
                "No installers available for drill-down.",
                "Нет монтажников для детализации.",
                "אין מתקינים זמינים לפירוט.",
              )}
            </div>
          )}
          {installerDetailsQuery.isLoading && installerDetailsId && (
            <div className="px-4 py-6 text-[13px] text-text-secondary">
              {copy(
                "Loading installer details…",
                "Загружаем детали монтажника…",
                "טוען פרטי מתקין…",
              )}
            </div>
          )}
          {installerDetailsQuery.isError && installerDetailsId && (
            <div className="px-4 py-6 text-[13px] text-status-problem-fg">
              {readError(
                installerDetailsQuery.error,
                tt("reports.failedInstallerDetails"),
              )}
            </div>
          )}
          {!installerDetailsQuery.isLoading &&
            !installerDetailsQuery.isError &&
            installerDetails && (
              <div className="p-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9"
                    onClick={() =>
                      router.push(
                        `/installers?installer_id=${installerDetails.installer_id}`,
                      )
                    }
                  >
                    {copy(
                      "Open installer card",
                      "Открыть карточку монтажника",
                      "פתח כרטיס מתקין",
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9"
                    onClick={() =>
                      router.push(
                        `/earnings-ledger?installer_id=${installerDetails.installer_id}`,
                      )
                    }
                  >
                    <ReceiptText className="h-3.5 w-3.5" />
                    {copy(
                      "Open payroll ledger",
                      "Открыть начисления",
                      "פתח יומן תשלומים",
                    )}
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="rounded-lg border border-border bg-surface p-3">
                    <div className="text-[11px] uppercase text-text-secondary">
                      {tt("reports.revenuePayrollProfit")}
                    </div>
                    <div className="mt-2 text-[18px] font-semibold text-text">
                      {formatAmount(installerDetails.revenue_total)}
                    </div>
                    <div className="mt-1 text-[12px] text-text-secondary">
                      {copy("Payroll", "Начисления", "שכר")}{" "}
                      {formatAmount(installerDetails.payroll_total)} |{" "}
                      {copy("Profit", "Прибыль", "רווח")}{" "}
                      {formatAmount(installerDetails.profit_total)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface p-3">
                    <div className="text-[11px] uppercase text-text-secondary">
                      {tt("reports.projectsOrders")}
                    </div>
                    <div className="mt-2 text-[18px] font-semibold text-text">
                      {formatCount(installerDetails.active_projects)} /{" "}
                      {formatCount(installerDetails.order_numbers)}
                    </div>
                    <div className="mt-1 text-[12px] text-text-secondary">
                      {tt("reports.installedDoors").replace(
                        "{count}",
                        String(installerDetails.installed_doors),
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface p-3">
                    <div className="text-[11px] uppercase text-text-secondary">
                      {tt("reports.openIssuesMissingRates")}
                    </div>
                    <div className="mt-2 text-[18px] font-semibold text-text">
                      {installerDetails.open_issues} /{" "}
                      {installerDetails.missing_rates_installed_doors}
                    </div>
                    <div className="mt-1 text-[12px] text-text-secondary">
                      {tt("reports.lastInstall")}{" "}
                      {installerDetails.last_installed_at
                        ? formatDateTime(installerDetails.last_installed_at)
                        : tt("reports.notAvailableShort")}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface p-3">
                    <div className="text-[11px] uppercase text-text-secondary">
                      {tt("reports.addonsImpact")}
                    </div>
                    <div className="mt-2 text-[18px] font-semibold text-text">
                      {copy("Qty", "Кол-во", "כמות")} {formatAmount(installerDetails.addons_done_qty)}
                    </div>
                    <div className="mt-1 text-[12px] text-text-secondary">
                      {tt("reports.addonsProfitMissingPlans")
                        .replace(
                          "{profit}",
                          formatAmount(installerDetails.addon_profit_total),
                        )
                        .replace(
                          "{count}",
                          String(installerDetails.missing_addon_plans_facts),
                        )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div className="overflow-hidden rounded-lg border border-border">
                    <div className="divide-y divide-border-subtle md:hidden">
                      {installerDetails.top_projects.length === 0 ? (
                        <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                          {copy(
                            "No project drill-down rows.",
                            "Нет строк детализации по проекту.",
                            "אין שורות פירוט לפרויקט.",
                          )}
                        </div>
                      ) : (
                        installerDetails.top_projects.map((item) => (
                          <article
                            key={`mobile-${item.project_id}`}
                            className="px-3.5 py-3"
                          >
                            <div className="text-[13px] font-semibold leading-5 text-text">
                              {item.project_name}
                            </div>
                            <div className="mt-1 text-[11px] leading-4 text-text-secondary">
                              {item.last_installed_at
                                ? formatDateTime(item.last_installed_at)
                                : copy(
                                    "No install date",
                                    "Нет даты установки",
                                    "אין תאריך התקנה",
                                  )}
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-2">
                              <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                <div className="text-[10px] uppercase text-text-secondary">
                                  {copy("Installed", "Установлено", "הותקן")}
                                </div>
                                <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                  {item.installed_doors}
                                </div>
                              </div>
                              <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                <div className="text-[10px] uppercase text-text-secondary">
                                  {copy("Issues", "Проблемы", "תקלות")}
                                </div>
                                <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                  {item.open_issues}
                                </div>
                              </div>
                              <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                <div className="text-[10px] uppercase text-text-secondary">
                                  {copy("Profit", "Прибыль", "רווח")}
                                </div>
                                <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                  {formatAmount(item.profit_total)}
                                </div>
                              </div>
                            </div>
                          </article>
                        ))
                      )}
                    </div>
                    <table className="hidden w-full text-[12px] md:table">
                      <thead className="bg-surface-subtle text-text-secondary">
                        <tr>
                          <th className="text-start px-3 py-2 font-medium">
                            {copy("Project", "Проект", "פרויקט")}
                          </th>
                          <th className="text-end px-3 py-2 font-medium">
                            {copy("Installed", "Установлено", "הותקן")}
                          </th>
                          <th className="text-end px-3 py-2 font-medium">
                            {copy("Issues", "Проблемы", "תקלות")}
                          </th>
                          <th className="text-end px-3 py-2 font-medium">
                            {copy("Profit", "Прибыль", "רווח")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {installerDetails.top_projects.length === 0 ? (
                          <tr>
                            <td
                              className="px-3 py-3 text-text-secondary"
                              colSpan={4}
                            >
                              {copy(
                                "No project drill-down rows.",
                                "Нет строк детализации по проекту.",
                                "אין שורות פירוט לפרויקט.",
                              )}
                            </td>
                          </tr>
                        ) : (
                          installerDetails.top_projects.map((item) => (
                            <tr
                              key={item.project_id}
                              className="border-t border-border"
                            >
                              <td className="px-3 py-2.5">
                                <div className="font-medium text-text">
                                  {item.project_name}
                                </div>
                                <div className="text-[11px] text-text-secondary">
                                  {item.last_installed_at
                                    ? formatDateTime(item.last_installed_at)
                                    : copy(
                                        "No install date",
                                        "Нет даты установки",
                                        "אין תאריך התקנה",
                                      )}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-end">
                                {item.installed_doors}
                              </td>
                              <td className="px-3 py-2 text-end">
                                {item.open_issues}
                              </td>
                              <td className="px-3 py-2 text-end">
                                {formatAmount(item.profit_total)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="overflow-hidden rounded-lg border border-border">
                    <div className="divide-y divide-border-subtle md:hidden">
                      {installerDetails.order_breakdown.length === 0 ? (
                        <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                          {copy(
                            "No order breakdown rows.",
                            "Нет строк по разбивке заказов.",
                            "אין שורות פירוט להזמנות.",
                          )}
                        </div>
                      ) : (
                        installerDetails.order_breakdown.map((item) => (
                          <article
                            key={`mobile-${item.order_number}`}
                            className="px-3.5 py-3"
                          >
                            <div className="text-[13px] font-semibold leading-5 text-text">
                              {item.order_number}
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-2">
                              <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                <div className="text-[10px] uppercase text-text-secondary">
                                  {copy("Installed", "Установлено", "הותקן")}
                                </div>
                                <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                  {item.installed_doors}
                                </div>
                              </div>
                              <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                <div className="text-[10px] uppercase text-text-secondary">
                                  {copy("Revenue", "Выручка", "הכנסה")}
                                </div>
                                <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                  {formatAmount(item.revenue_total)}
                                </div>
                              </div>
                              <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                <div className="text-[10px] uppercase text-text-secondary">
                                  {copy("Profit", "Прибыль", "רווח")}
                                </div>
                                <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                  {formatAmount(item.profit_total)}
                                </div>
                              </div>
                            </div>
                          </article>
                        ))
                      )}
                    </div>
                    <table className="hidden w-full text-[12px] md:table">
                      <thead className="bg-surface-subtle text-text-secondary">
                        <tr>
                          <th className="text-start px-3 py-2 font-medium">
                            {copy("Order", "Заказ", "הזמנה")}
                          </th>
                          <th className="text-end px-3 py-2 font-medium">
                            {copy("Installed", "Установлено", "הותקן")}
                          </th>
                          <th className="text-end px-3 py-2 font-medium">
                            {copy("Revenue", "Выручка", "הכנסה")}
                          </th>
                          <th className="text-end px-3 py-2 font-medium">
                            {copy("Profit", "Прибыль", "רווח")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {installerDetails.order_breakdown.length === 0 ? (
                          <tr>
                            <td
                              className="px-3 py-3 text-text-secondary"
                              colSpan={4}
                            >
                              {copy(
                                "No order breakdown rows.",
                                "Нет строк по разбивке заказов.",
                                "אין שורות פירוט להזמנות.",
                              )}
                            </td>
                          </tr>
                        ) : (
                          installerDetails.order_breakdown.map((item) => (
                            <tr
                              key={item.order_number}
                              className="border-t border-border"
                            >
                              <td className="px-3 py-2.5 font-medium text-text">
                                {item.order_number}
                              </td>
                              <td className="px-3 py-2 text-end">
                                {item.installed_doors}
                              </td>
                              <td className="px-3 py-2 text-end">
                                {formatAmount(item.revenue_total)}
                              </td>
                              <td className="px-3 py-2 text-end">
                                {formatAmount(item.profit_total)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
        </div>

        <div className={reportsPanelClass("overflow-hidden")}>
          <div className="px-4 py-3 border-b border-border bg-surface-subtle flex flex-col items-stretch gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-[11px] uppercase text-text-secondary">
                {copy(
                  "Order Numbers KPI",
                  "KPI по номерам заказов",
                  "KPI לפי מספרי הזמנה",
                )}
              </div>
              <div className="text-[13px] text-text-secondary">
                {copy(
                  "Money and operational control by order number",
                  "Деньги и операционный контроль по номеру заказа",
                  "כסף ובקרה תפעולית לפי מספר הזמנה",
                )}
              </div>
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:flex xl:flex-wrap xl:items-center xl:justify-end">
              <select
                aria-label={copy("Order Project Filter", "Фильтр заказов по объекту", "סינון הזמנות לפי פרויקט")}
                value={orderNumbersProjectId}
                onChange={(e) => {
                  setOrderNumbersProjectId(e.target.value);
                  setOrderNumbersKpiOffset(0);
                }}
                className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px] xl:w-auto xl:max-w-[220px]"
              >
                <option value="">
                  {projectsQuery.isLoading
                    ? tt("reports.loadingProjects")
                    : t("common.all")}
                </option>
                {projectOptions.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <input
                value={orderNumbersQuery}
                onChange={(e) => {
                  setOrderNumbersQuery(e.target.value);
                  setOrderNumbersKpiOffset(0);
                }}
                placeholder={copy(
                  "Search order…",
                  "Поиск заказа…",
                  "חפש הזמנה…",
                )}
                className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px] xl:w-auto xl:max-w-[220px]"
              />
              <select
                value={orderNumbersSortBy}
                onChange={(e) => {
                  setOrderNumbersSortBy(e.target.value as OrderNumbersSortBy);
                  setOrderNumbersKpiOffset(0);
                }}
                className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px] xl:w-auto xl:max-w-[180px]"
              >
                {ORDER_NUMBERS_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {optionLabel(option.label)}
                  </option>
                ))}
              </select>
              <select
                value={orderNumbersSortDir}
                onChange={(e) => {
                  setOrderNumbersSortDir(e.target.value as SortDir);
                  setOrderNumbersKpiOffset(0);
                }}
                className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px] xl:w-auto xl:max-w-[120px]"
              >
                {SORT_DIR_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => exportOrderNumbersKpiMutation.mutate()}
                disabled={
                  !canExportFinancialReports ||
                  exportOrderNumbersKpiMutation.isPending
                }
                title={ratesScopeHint}
                className="h-9 w-full rounded-md border border-border bg-surface px-3 text-[12px] disabled:opacity-50 xl:w-auto"
              >
                {tt("reports.exportOrdersCsv")}
              </button>
            </div>
          </div>

          <div className="hidden xl:grid grid-cols-[1fr_80px_90px_90px_80px_120px_120px_120px_110px] gap-3 px-4 py-3 border-b border-border text-[11px] uppercase text-text-secondary">
            <span>{copy("Order", "Заказ", "הזמנה")}</span>
            <span className="text-end">{copy("Total", "Всего", 'סה"כ')}</span>
            <span className="text-end">
              {copy("Installed", "Установлено", "הותקן")}
            </span>
            <span className="text-end">
              {copy("Not Installed", "Не установлено", "לא הותקן")}
            </span>
            <span className="text-end">
              {copy("Issues", "Проблемы", "תקלות")}
            </span>
            <span className="text-end">
              {copy("Planned", "План", "מתוכנן")}
            </span>
            <span className="text-end">
              {copy("Payroll", "Начисления", "שכר")}
            </span>
            <span className="text-end">
              {copy("Profit", "Прибыль", "רווח")}
            </span>
            <span className="text-end">
              {copy("Completion", "Готовность", "השלמה")}
            </span>
          </div>

          {orderNumbersKpiQuery.isLoading && (
            <div className="px-4 py-6 text-[13px] text-text-secondary">
              {copy(
                "Loading order numbers KPI…",
                "Загружаем KPI по номерам заказов…",
                "טוען KPI למספרי הזמנות…",
              )}
            </div>
          )}
          {orderNumbersKpiQuery.isError && (
            <div className="px-4 py-6 text-[13px] text-status-problem-fg">
              {readError(
                orderNumbersKpiQuery.error,
                copy(
                  "Failed to load order numbers KPI",
                  "Не удалось загрузить KPI по номерам заказов",
                  "טעינת KPI למספרי הזמנות נכשלה",
                ),
              )}
            </div>
          )}
          {!orderNumbersKpiQuery.isLoading &&
            !orderNumbersKpiQuery.isError &&
            orderNumbersKpiItems.length === 0 && (
              <div className="px-4 py-6 text-[13px] text-text-secondary">
                {copy(
                  "No order KPI rows.",
                  "Нет строк KPI по заказам.",
                  "אין שורות KPI להזמנות.",
                )}
              </div>
            )}
          {!orderNumbersKpiQuery.isLoading &&
            !orderNumbersKpiQuery.isError &&
            orderNumbersKpiItems.map((item) => (
              <div key={item.order_number} className="border-t border-border">
                <article className="px-4 py-3 xl:hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 text-[13px] font-semibold leading-5 text-text">
                      {item.order_number}
                    </div>
                    <div className="shrink-0 rounded-full bg-surface-subtle px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                      {item.completion_pct}%
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                      <div className="text-[10px] uppercase text-text-secondary">
                        {copy("Total", "Всего", 'סה"כ')}
                      </div>
                      <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                        {item.total_doors}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                      <div className="text-[10px] uppercase text-text-secondary">
                        {copy("Installed", "Установлено", "הותקן")}
                      </div>
                      <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                        {item.installed_doors}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                      <div className="text-[10px] uppercase text-text-secondary">
                        {copy("Not Installed", "Не установлено", "לא הותקן")}
                      </div>
                      <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                        {item.not_installed_doors}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                      <div className="text-[10px] uppercase text-text-secondary">
                        {copy("Issues", "Проблемы", "תקלות")}
                      </div>
                      <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                        {item.open_issues}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                      <div className="text-[10px] uppercase text-text-secondary">
                        {copy("Payroll", "Начисления", "שכר")}
                      </div>
                      <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                        {formatAmount(item.payroll_total)}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                      <div className="text-[10px] uppercase text-text-secondary">
                        {copy("Profit", "Прибыль", "רווח")}
                      </div>
                      <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                        {formatAmount(item.profit_total)}
                      </div>
                    </div>
                    <div className="col-span-3 rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                      <div className="text-[10px] uppercase text-text-secondary">
                        {copy("Planned", "План", "מתוכנן")}
                      </div>
                      <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                        {formatAmount(item.planned_revenue_total)}
                      </div>
                    </div>
                  </div>
                </article>
                <div className="hidden xl:grid grid-cols-[1fr_80px_90px_90px_80px_120px_120px_120px_110px] gap-3 px-4 py-3 text-[13px] items-center">
                  <div className="font-medium text-text">
                    {item.order_number}
                  </div>
                  <div className="text-end">{item.total_doors}</div>
                  <div className="text-end">{item.installed_doors}</div>
                  <div className="text-end">{item.not_installed_doors}</div>
                  <div className="text-end">{item.open_issues}</div>
                  <div className="text-end">
                    {formatAmount(item.planned_revenue_total)}
                  </div>
                  <div className="text-end">
                    {formatAmount(item.payroll_total)}
                  </div>
                  <div className="text-end">
                    {formatAmount(item.profit_total)}
                  </div>
                  <div className="text-end">{item.completion_pct}%</div>
                </div>
              </div>
            ))}
          <div className="px-4 py-3 border-t border-border flex items-center justify-between text-[12px]">
            <div className="text-text-secondary">
              {copy("Total matched", "Всего совпадений", 'סה"כ התאמות')}:{" "}
              {orderNumbersKpiQuery.data?.total || 0}
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={!orderNumbersKpiCanPrev}
                onClick={() =>
                  setOrderNumbersKpiOffset((x) =>
                    Math.max(0, x - KPI_PAGE_SIZE),
                  )
                }
                className="h-8 px-3 rounded-md border border-border bg-surface disabled:opacity-50"
              >
                {tt("reports.prev")}
              </button>
              <button
                disabled={!orderNumbersKpiCanNext}
                onClick={() =>
                  setOrderNumbersKpiOffset((x) => x + KPI_PAGE_SIZE)
                }
                className="h-8 px-3 rounded-md border border-border bg-surface disabled:opacity-50"
              >
                {tt("reports.next")}
              </button>
            </div>
          </div>
        </div>

        <div id="reports-delivery-risk" className="grid gap-3 md:grid-cols-4">
          <div className={reportsPanelClass("p-4")}>
            <div className="text-[11px] uppercase text-text-secondary mb-2">
              {copy("Delivery", "Доставка", "משלוח")}
            </div>
            {deliveryQuery.isLoading ? (
              <div className="text-[13px] text-text-secondary">
                {copy("Loading…", "Загрузка…", "טוען…")}
              </div>
            ) : (
              <div className="space-y-1 text-[13px]">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-link" />
                  <span>{copy("WA pending:", "WhatsApp, ожидают:", "WhatsApp, ממתינות:")} {delivery?.whatsapp_pending ?? 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-500" />
                  <span>{copy("WA delivered:", "WhatsApp, доставлено:", "WhatsApp, נמסרו:")} {delivery?.whatsapp_delivered ?? 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-status-problem-fg" />
                  <span>{copy("WA failed:", "WhatsApp, ошибки:", "WhatsApp, נכשלו:")} {delivery?.whatsapp_failed ?? 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-500" />
                  <span>{copy("Email sent:", "Письмо отправлено:", "אימייל נשלח:")} {delivery?.email_sent ?? 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-status-problem-fg" />
                  <span>{copy("Email failed:", "Ошибки эл. почты:", "שגיאות דוא״ל:")} {delivery?.email_failed ?? 0}</span>
                </div>
              </div>
            )}
          </div>

          <div className={reportsPanelClass("p-4")}>
            <div className="text-[11px] uppercase text-text-secondary mb-2">
              {copy("Outbox Queue", "Очередь исходящих сообщений", "תור תיבת דואר יוצא")}
            </div>
            {outboxSummaryQuery.isLoading ? (
              <div className="text-[13px] text-text-secondary">
                {copy("Loading…", "Загрузка…", "טוען…")}
              </div>
            ) : (
              <div className="space-y-1 text-[13px]">
                <div>{copy("Total:", "Итого:", "סך הכל:")} {outboxSummary?.total ?? 0}</div>
                <div>{copy("Failed total:", "Всего неудачно:", "סך הכל נכשל:")} {outboxSummary?.failed_total ?? 0}</div>
                <div>
                  {copy("Pending overdue &gt;15m:", "Ожидается просрочка >15 мин:", "בהמתנה באיחור >15 מ':")}{" "}
                  {outboxSummary?.pending_overdue_15m ?? 0}
                </div>
                <div className="text-text-secondary">
                  {copy("Channels:", "Каналы:", "ערוצים:")} {compactMap(outboxSummary?.by_channel)}
                </div>
                <div className="text-text-secondary">
                  {copy("Status:", "Статус:", "סטטוס:")} {compactMap(outboxSummary?.by_status)}
                </div>
              </div>
            )}
          </div>

          <div
            id="reports-delivery-scope"
            className={reportsPanelClass("p-4 md:col-span-2")}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase text-text-secondary mb-2">
                  {copy("Delivery Scope", "Фильтр отправки", "מסנן שליחה")}
                </div>
                <div className="space-y-1 text-[13px]">
                  <div>
                    {copy("Channel:", "Канал:", "ערוץ:")}{" "}
                    <span className="font-medium text-text">
                      {scopedDeliveryChannel || "all channels"}
                    </span>
                  </div>
                  <div>
                    {copy("Webhook provider:", "Провайдер вебхука:", "ספק Webhook:")}{" "}
                    <span className="font-medium text-text">
                      {scopedWebhookProvider || "all providers"}
                    </span>
                  </div>
                  {scopedOutboxId ? (
                    <div>
                      {copy("Outbox:", "Исходящие:", "תיבת דואר יוצא:")}{" "}
                      <span className="font-medium text-text">
                        {scopedOutboxId}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
              {(scopedDeliveryChannel || scopedWebhookProvider) && (
                <button
                  onClick={() => {
                    const params = new URLSearchParams();
                    params.set("focus", "delivery");
                    params.set(
                      "ops_preset",
                      activeOpsPreset || "delivery-risk",
                    );
                    if (scopedOutboxId) {
                      params.set("outbox_id", scopedOutboxId);
                    }
                    router.push(`/reports?${params.toString()}`);
                  }}
                  className="h-8 px-3 rounded-md border border-border bg-surface text-[12px]"
                >
                  {copy("Clear delivery scope", "Сбросить фильтр отправки", "נקה מסנן שליחה")}
                </button>
              )}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-surface-subtle p-3">
                <div className="text-[11px] uppercase text-text-secondary">
                  {t("reports.failedOutboxLane")}
                </div>
                <div className="mt-2 text-[13px] text-text">
                  {t("reports.failedMessagesInCurrentScope").replace(
                    "{count}",
                    String(failedItems.length),
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      router.push(
                        buildOperationsHref({
                          actionable: true,
                          deliveryChannel: scopedDeliveryChannel || undefined,
                          webhookProvider: scopedWebhookProvider || undefined,
                        }),
                      )
                    }
                    className="h-8 px-3 rounded-md border border-border bg-surface text-[12px]"
                  >
                    {t("reports.openScopedOps")}
                  </button>
                  {scopedOutboxId ? (
                    <button
                      onClick={() =>
                        router.push(
                          buildOperationsHref({
                            actionable: true,
                            deliveryChannel: scopedDeliveryChannel || undefined,
                            webhookProvider: scopedWebhookProvider || undefined,
                          }),
                        )
                      }
                      className="h-8 px-3 rounded-md border border-border bg-surface text-[12px]"
                    >
                      {t("reports.continueRecovery")}
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-surface-subtle p-3">
                <div className="text-[11px] uppercase text-text-secondary">
                  {t("reports.webhookLane")}
                </div>
                {webhookSignalsQuery.isLoading ? (
                  <div className="mt-2 text-[13px] text-text-secondary">
                    {t("reports.loadingWebhookScope")}
                  </div>
                ) : scopedWebhookSignals.length === 0 ? (
                  <div className="mt-2 text-[13px] text-text-secondary">
                    {t("reports.noWebhookSignalsCurrentScope")}
                  </div>
                ) : (
                  <div className="mt-2 space-y-2">
                    {scopedWebhookSignals.slice(0, 3).map((item) => (
                      <div key={item.id} className="text-[13px]">
                        <div className="font-medium text-text">
                          {item.provider} | {item.result}
                        </div>
                        <div className="text-text-secondary">
                          {item.event_type}
                          {item.status ? ` | status ${item.status}` : ""}
                          {item.error ? ` | ${item.error}` : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-border bg-surface-subtle p-3 md:col-span-2">
                <div className="text-[11px] uppercase text-text-secondary">
                  {t("reports.recoveryTrail")}
                </div>
                {retryAuditsQuery.isLoading ? (
                  <div className="mt-2 text-[13px] text-text-secondary">
                    {t("reports.loadingRetryAuditTrail")}
                  </div>
                ) : scopedRetryAuditItems.length === 0 ? (
                  <div className="mt-2 text-[13px] text-text-secondary">
                    {scopedOutboxId
                      ? t("reports.noRecoveryActionsForOutbox")
                      : t("reports.noDeliveryRecoveryActionsYet")}
                  </div>
                ) : (
                  <div className="mt-2 space-y-2">
                    {scopedRetryAuditItems.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-[13px]"
                      >
                        <div className="font-medium text-text">
                          {copy("Outbox", "Исходящие", "תיבת דואר יוצא")} {item.outbox_id}
                        </div>
                        <div className="text-text-secondary">
                          {formatDateTime(item.created_at)} {copy("| actor", "| пользователь", "| משתמש")}{" "}
                          {item.actor_user_id}
                        </div>
                        <div className="text-text-secondary">
                          {item.before_status || "unknown"} {"->"}{" "}
                          {item.after_status || "unknown"}
                          {item.before_delivery_status ||
                          item.after_delivery_status
                            ? ` | delivery ${item.before_delivery_status || "unknown"} -> ${item.after_delivery_status || "unknown"}`
                            : ""}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              router.push(
                                buildOperationsHref({
                                  actionable: true,
                                  deliveryChannel:
                                    scopedDeliveryChannel || undefined,
                                  webhookProvider:
                                    scopedWebhookProvider || undefined,
                                }),
                              )
                            }
                            className="h-8 px-3 rounded-md border border-border bg-surface text-[12px]"
                          >
                            {t("reports.openRecoveryLane")}
                          </button>
                          <button
                            onClick={() =>
                              router.push(
                                buildOperationsHref({
                                  actionable: true,
                                  deliveryChannel:
                                    scopedDeliveryChannel || undefined,
                                  webhookProvider:
                                    scopedWebhookProvider || undefined,
                                }),
                              )
                            }
                            className="h-8 px-3 rounded-md border border-border bg-surface text-[12px]"
                          >
                            {t("reports.continueInOps")}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={reportsPanelClass("p-4")}>
            <div className="text-[11px] uppercase text-text-secondary mb-2">
              {t("reports.catalogAudit")}
            </div>
            {auditCatalogsQuery.isLoading ? (
              <div className="text-[13px] text-text-secondary">
                {t("reports.loading")}
              </div>
            ) : (
              <div className="space-y-1 text-[13px]">
                <div>
                  {t("reports.totalChanges")}: {auditSummary?.total ?? 0}
                </div>
                <div className="text-text-secondary">
                  {t("reports.entities")}: {compactMap(auditSummary?.by_entity)}
                </div>
                <div className="text-text-secondary">
                  {t("reports.actions")}: {compactMap(auditSummary?.by_action)}
                </div>
              </div>
            )}
          </div>

          <div className={reportsPanelClass("p-4")}>
            <div className="text-[11px] uppercase text-text-secondary mb-2">
              {t("reports.issueAudit")}
            </div>
            {issueAuditQuery.isLoading ? (
              <div className="text-[13px] text-text-secondary">
                {t("reports.loading")}
              </div>
            ) : (
              <div className="space-y-1 text-[13px]">
                <div>
                  {t("reports.totalChanges")}: {issueAuditSummary?.total ?? 0}
                </div>
                <div className="text-text-secondary">
                  {t("reports.entities")}:{" "}
                  {compactMap(issueAuditSummary?.by_entity)}
                </div>
                <div className="text-text-secondary">
                  {t("reports.actions")}:{" "}
                  {compactMap(issueAuditSummary?.by_action)}
                </div>
              </div>
            )}
          </div>
        </div>

        <div
          id="reports-failed-outbox"
          className={reportsPanelClass("overflow-hidden")}
        >
          <div className="px-4 py-3 border-b border-border bg-surface-subtle text-[11px] uppercase text-text-secondary">
            {t("reports.failedOutboxQueue")}
          </div>
          {failedOutboxQuery.isLoading && (
            <div className="px-4 py-6 text-[13px] text-text-secondary">
              {t("reports.loadingFailedMessages")}
            </div>
          )}
          {!failedOutboxQuery.isLoading && failedItems.length === 0 && (
            <div className="px-4 py-6 text-[13px] text-text-secondary">
              {scopedDeliveryChannel
                ? t("reports.noFailedOutboxMessagesFor").replace(
                    "{scope}",
                    scopedDeliveryChannel,
                  )
                : t("reports.noFailedOutboxMessages")}
            </div>
          )}
          {!failedOutboxQuery.isLoading &&
            failedItems.map((item) => (
              <div key={item.id} className="border-t border-border">
                <article className="px-4 py-3 md:hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold leading-5 text-text">
                        {item.channel}
                      </div>
                      <div className="mt-1 text-[11px] leading-4 text-text-secondary">
                        {item.status} | {item.delivery_status}
                      </div>
                    </div>
                    <div className="shrink-0 rounded-full bg-surface-subtle px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                      {item.attempts}/{item.max_attempts}
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg border border-border bg-surface-subtle px-2.5 py-2 text-[12px] leading-5 text-text-secondary">
                    {item.last_error ||
                      copy(
                        "No error payload",
                        "Нет данных об ошибке",
                        "אין נתוני שגיאה",
                      )}
                  </div>
                  <button
                    onClick={() => retryMutation.mutate(item.id)}
                    disabled={
                      !canRunPrivilegedActions || retryMutation.isPending
                    }
                    title={privilegedActionHint}
                    className="mt-3 h-8 px-3 rounded-md border border-border bg-surface text-[12px] inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {copy("Retry", "Повторить", "נסה שוב")}
                  </button>
                </article>
                <div className="hidden md:grid grid-cols-[120px_120px_120px_160px_1fr_120px] gap-3 px-4 py-3 text-[13px] items-center">
                  <div className="font-medium">{item.channel}</div>
                  <div>{item.status}</div>
                  <div>{item.delivery_status}</div>
                  <div className="text-text-secondary">
                    {item.attempts}/{item.max_attempts}
                  </div>
                  <div className="text-text-secondary truncate">
                    {item.last_error ||
                      copy(
                        "No error payload",
                        "Нет данных об ошибке",
                        "אין נתוני שגיאה",
                      )}
                  </div>
                  <button
                    onClick={() => retryMutation.mutate(item.id)}
                    disabled={
                      !canRunPrivilegedActions || retryMutation.isPending
                    }
                    title={privilegedActionHint}
                    className="h-8 px-3 rounded-md border border-border bg-surface text-[12px] inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {copy("Retry", "Повторить", "נסה שוב")}
                  </button>
                </div>
              </div>
            ))}
        </div>

        <div className={reportsPanelClass("overflow-hidden")}>
          <div className="hidden md:grid grid-cols-[180px_130px_130px_130px_1fr] gap-3 px-4 py-3 border-b border-border bg-surface-subtle text-[11px] uppercase text-text-secondary">
            <span>{copy("Time", "Время", "זמן")}</span>
            <span>{copy("Level", "Уровень", "רמה")}</span>
            <span>{copy("Metric", "Метрика", "מדד")}</span>
            <span>{copy("Usage", "Использование", "שימוש")}</span>
            <span>{copy("Action", "Действие", "פעולה")}</span>
          </div>

          {alertsQuery.isLoading && (
            <div className="px-4 py-6 text-[13px] text-text-secondary">
              {copy("Loading alerts…", "Загружаем алерты…", "טוען התראות…")}
            </div>
          )}

          {!alertsQuery.isLoading && items.length === 0 && (
            <div className="px-4 py-6 text-[13px] text-text-secondary">
              {copy(
                "No limit alerts yet.",
                "Алертов по лимитам пока нет.",
                "אין עדיין התראות מגבלה.",
              )}
            </div>
          )}

          {!alertsQuery.isLoading &&
            items.map((item) => {
              const isDanger = item.level === "DANGER";
              const levelClass = isDanger
                ? "text-status-problem-fg bg-status-problem-bg border-status-problem-border"
                : "text-status-warning-fg bg-status-warning-bg border-status-warning-border";
              return (
                <div key={item.id} className="border-t border-border">
                  <article
                    className={cn(
                      "px-4 py-3 md:hidden",
                      item.is_unread && "bg-[var(--dmx-accent-tint)]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold leading-5 text-text capitalize">
                          {metricLabel(item.metric)}
                        </div>
                        <div className="mt-1 text-[11px] leading-4 text-text-secondary">
                          {formatDateTime(item.created_at)}
                        </div>
                      </div>
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-semibold",
                          levelClass,
                        )}
                      >
                        {isDanger ? (
                          <ShieldAlert className="w-3.5 h-3.5" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        )}
                        {item.level}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                        <div className="text-[10px] uppercase text-text-secondary">
                          {copy("Usage", "Использование", "שימוש")}
                        </div>
                        <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                          {item.current ?? "-"} / {item.max ?? "-"}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                        <div className="text-[10px] uppercase text-text-secondary">
                          %
                        </div>
                        <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                          {item.utilization_pct !== null
                            ? `${item.utilization_pct}%`
                            : "-"}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 text-[12px] leading-5 text-text">
                      <span className="font-medium">{item.action}</span>
                      {item.plan_code ? (
                        <span className="text-text-secondary">
                          {" "}
                          | {copy("plan", "план", "תוכנית")} {item.plan_code}
                        </span>
                      ) : null}
                    </div>
                  </article>
                  <div
                    className={cn(
                      "hidden md:grid grid-cols-[180px_130px_130px_130px_1fr] gap-3 px-4 py-3 text-[13px] row-hover",
                      item.is_unread && "bg-[var(--dmx-accent-tint)]",
                    )}
                  >
                    <div className="text-text-secondary">
                      {formatDateTime(item.created_at)}
                    </div>
                    <div>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-semibold",
                          levelClass,
                        )}
                      >
                        {isDanger ? (
                          <ShieldAlert className="w-3.5 h-3.5" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        )}
                        {item.level}
                      </span>
                    </div>
                    <div className="font-medium text-text capitalize">
                      {metricLabel(item.metric)}
                    </div>
                    <div className="text-text-secondary">
                      {item.current ?? "-"} / {item.max ?? "-"}
                      {item.utilization_pct !== null
                        ? ` (${item.utilization_pct}%)`
                        : ""}
                    </div>
                    <div className="text-text">
                      <span className="font-medium">{item.action}</span>
                      {item.plan_code ? (
                        <span className="text-text-secondary">
                          {" "}
                          | {copy("plan", "план", "תוכנית")} {item.plan_code}
                        </span>
                      ) : null}
                      {item.is_unread ? (
                        <span className="ml-2 inline-flex w-2 h-2 rounded-full bg-accent align-middle" />
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        <div
          id="reports-audit-catalogs"
          className={reportsPanelClass("overflow-hidden")}
        >
          <div className="px-4 py-3 border-b border-border bg-surface-subtle text-[11px] uppercase text-text-secondary">
            {copy(
              "Catalog Audit Report",
              "Аудит справочников",
              "דוח ביקורת קטלוג",
            )}
          </div>
          <div className="px-4 py-3 border-b border-border grid gap-2 md:grid-cols-[180px_220px_150px_150px_auto] items-center">
            <select
              value={auditEntityType}
              onChange={(e) => {
                setAuditEntityType(e.target.value);
                setAuditOffset(0);
              }}
              className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px]"
            >
              <option value="">
                {copy("All entities", "Все сущности", "כל הישויות")}
              </option>
              {AUDIT_ENTITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              value={auditAction}
              onChange={(e) => {
                setAuditAction(e.target.value);
                setAuditOffset(0);
              }}
              className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px]"
            >
              <option value="">
                {copy("All actions", "Все действия", "כל הפעולות")}
              </option>
              {AUDIT_ACTION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <input
              value={auditDateFrom}
              onChange={(e) => {
                setAuditDateFrom(e.target.value);
                setAuditOffset(0);
              }}
              type="date"
              className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px]"
            />
            <input
              value={auditDateTo}
              onChange={(e) => {
                setAuditDateTo(e.target.value);
                setAuditOffset(0);
              }}
              type="date"
              className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px]"
            />
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                onClick={() => exportAuditMutation.mutate()}
                disabled={
                  !canRunPrivilegedActions || exportAuditMutation.isPending
                }
                title={privilegedActionHint}
                className="h-9 px-3 rounded-md border border-border bg-surface text-[12px] disabled:opacity-50"
              >
                {copy("Export CSV", "Экспорт CSV", "ייצוא CSV")}
              </button>
              <button
                onClick={() => {
                  setAuditEntityType("");
                  setAuditAction("");
                  setAuditDateFrom("");
                  setAuditDateTo("");
                  setAuditOffset(0);
                }}
                className="h-9 px-3 rounded-md border border-border bg-surface text-[12px]"
              >
                {copy("Reset", "Сбросить", "איפוס")}
              </button>
            </div>
          </div>

          <div className="hidden md:grid grid-cols-[170px_120px_1fr_1fr] gap-3 px-4 py-3 border-b border-border text-[11px] uppercase text-text-secondary">
            <span>{copy("Time", "Время", "זמן")}</span>
            <span>{copy("Entity", "Сущность", "ישות")}</span>
            <span>{copy("Action", "Действие", "פעולה")}</span>
            <span>{copy("Reason", "Причина", "סיבה")}</span>
          </div>
          {auditCatalogsQuery.isLoading && (
            <div className="px-4 py-6 text-[13px] text-text-secondary">
              {copy("Loading audit…", "Загружаем аудит…", "טוען ביקורת...")}
            </div>
          )}
          {!auditCatalogsQuery.isLoading && auditItems.length === 0 && (
            <div className="px-4 py-6 text-[13px] text-text-secondary">
              {copy(
                "No catalog audit entries.",
                "Записей аудита справочников нет.",
                "אין רשומות ביקורת קטלוג.",
              )}
            </div>
          )}
          {!auditCatalogsQuery.isLoading &&
            auditItems.map((item) => (
              <div key={item.id} className="border-t border-border">
                <article className="px-4 py-3 md:hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 text-[13px] font-semibold leading-5 text-text">
                      {item.entity_type}
                    </div>
                    <div className="shrink-0 rounded-full bg-surface-subtle px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                      {formatDateTime(item.created_at)}
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                    <div className="text-[10px] uppercase text-text-secondary">
                      {copy("Action", "Действие", "פעולה")}
                    </div>
                    <div className="mt-1 text-[13px] font-medium text-text">
                      {item.action}
                    </div>
                  </div>
                  <div className="mt-2 text-[12px] leading-5 text-text-secondary">
                    {item.reason || "-"}
                  </div>
                </article>
                <div className="hidden md:grid grid-cols-[170px_120px_1fr_1fr] gap-3 px-4 py-3 text-[13px] items-center">
                  <div className="text-text-secondary">
                    {formatDateTime(item.created_at)}
                  </div>
                  <div className="font-medium">{item.entity_type}</div>
                  <div>{item.action}</div>
                  <div className="text-text-secondary">
                    {item.reason || "-"}
                  </div>
                </div>
              </div>
            ))}
          <div className="px-4 py-3 border-t border-border flex flex-wrap items-center justify-between gap-2 text-[12px]">
            <div className="text-text-secondary">
              {copy("Total matched", "Всего совпадений", 'סה"כ התאמות')}:{" "}
              {auditSummary?.total || 0}
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={!auditCanPrev}
                onClick={() =>
                  setAuditOffset((x) => Math.max(0, x - AUDIT_PREVIEW_LIMIT))
                }
                className="h-8 px-3 rounded-md border border-border bg-surface disabled:opacity-50"
              >
                {tt("reports.prev")}
              </button>
              <button
                disabled={!auditCanNext}
                onClick={() => setAuditOffset((x) => x + AUDIT_PREVIEW_LIMIT)}
                className="h-8 px-3 rounded-md border border-border bg-surface disabled:opacity-50"
              >
                {tt("reports.next")}
              </button>
            </div>
          </div>
        </div>

        <div
          id="reports-issue-audit"
          className={reportsPanelClass("overflow-hidden")}
        >
          <div className="px-4 py-3 border-b border-border bg-surface-subtle text-[11px] uppercase text-text-secondary">
            {copy("Issue Audit Report", "Аудит проблем", "דוח ביקורת תקלות")}
          </div>
          <div className="px-4 py-3 border-b border-border grid gap-2 md:grid-cols-[220px_240px_150px_150px_auto] items-center">
            <select
              value={issueAuditAction}
              onChange={(e) => {
                setIssueAuditAction(e.target.value);
                setIssueAuditOffset(0);
              }}
              className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px]"
            >
              <option value="">
                {copy("All actions", "Все действия", "כל הפעולות")}
              </option>
              {ISSUE_AUDIT_ACTION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <input
              value={issueAuditIssueId}
              onChange={(e) => {
                setIssueAuditIssueId(e.target.value);
                setIssueAuditOffset(0);
              }}
              placeholder={copy("Issue UUID", "UUID проблемы", "UUID תקלה")}
              className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px]"
            />
            <input
              value={issueAuditDateFrom}
              onChange={(e) => {
                setIssueAuditDateFrom(e.target.value);
                setIssueAuditOffset(0);
              }}
              type="date"
              className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px]"
            />
            <input
              value={issueAuditDateTo}
              onChange={(e) => {
                setIssueAuditDateTo(e.target.value);
                setIssueAuditOffset(0);
              }}
              type="date"
              className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px]"
            />
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                onClick={() => exportIssueAuditMutation.mutate()}
                disabled={
                  !canRunPrivilegedActions || exportIssueAuditMutation.isPending
                }
                title={privilegedActionHint}
                className="h-9 px-3 rounded-md border border-border bg-surface text-[12px] disabled:opacity-50"
              >
                {copy("Export CSV", "Экспорт CSV", "ייצוא CSV")}
              </button>
              <button
                onClick={() => {
                  setIssueAuditAction("");
                  setIssueAuditIssueId("");
                  setIssueAuditDateFrom("");
                  setIssueAuditDateTo("");
                  setIssueAuditOffset(0);
                }}
                className="h-9 px-3 rounded-md border border-border bg-surface text-[12px]"
              >
                {copy("Reset", "Сбросить", "איפוס")}
              </button>
            </div>
          </div>
          {issueAuditIssueIdTrimmed.length > 0 &&
          !issueAuditIssueIdNormalized ? (
            <div className="px-4 pt-2 text-[12px] text-status-warning-fg">
              {copy(
                "Issue UUID format is invalid, filter is not applied.",
                "Формат UUID проблемы неверный, фильтр не применяется.",
                "פורמט UUID התקלה לא תקין, המסנן לא הוחל.",
              )}
            </div>
          ) : null}

          <div className="hidden md:grid grid-cols-[170px_1fr_1fr_220px] gap-3 px-4 py-3 border-b border-border text-[11px] uppercase text-text-secondary">
            <span>{copy("Time", "Время", "זמן")}</span>
            <span>{copy("Action", "Действие", "פעולה")}</span>
            <span>
              {copy("Changed fields", "Изменённые поля", "שדות שהשתנו")}
            </span>
            <span>{copy("Controls", "Управление", "פקדים")}</span>
          </div>
          {issueAuditQuery.isLoading && (
            <div className="px-4 py-6 text-[13px] text-text-secondary">
              {copy(
                "Loading issue audit…",
                "Загружаем аудит проблем…",
                "טוען ביקורת בעיה...",
              )}
            </div>
          )}
          {!issueAuditQuery.isLoading && issueAuditItems.length === 0 && (
            <div className="px-4 py-6 text-[13px] text-text-secondary">
              {copy(
                "No issue audit entries.",
                "Записей аудита проблем нет.",
                "אין רשומות ביקורת תקלות.",
              )}
            </div>
          )}
          {!issueAuditQuery.isLoading &&
            issueAuditItems.map((item) => {
              const changedFields = changedFieldKeys(item.before, item.after);
              const isExpanded = expandedIssueAuditId === item.id;
              return (
                <div key={item.id} className="border-t border-border">
                  <article className="px-4 py-3 md:hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold leading-5 text-text">
                          {item.action}
                        </div>
                        <div className="mt-1 text-[11px] leading-4 text-text-secondary">
                          {formatDateTime(item.created_at)}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          setExpandedIssueAuditId((current) =>
                            current === item.id ? null : item.id,
                          )
                        }
                        className="h-8 shrink-0 rounded-md border border-border bg-surface px-3 text-[12px]"
                      >
                        {isExpanded
                          ? copy("Hide Diff", "Скрыть изменения", "הסתר שינויים")
                          : copy("Show Diff", "Показать изменения", "הצג שינויים")}
                      </button>
                    </div>
                    <div className="mt-2 text-[12px] leading-5 text-text-secondary">
                      {item.reason ||
                        copy("No reason", "Без причины", "ללא סיבה")}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {changedFields.length === 0 ? (
                        <span className="text-[12px] text-text-secondary">
                          {copy(
                            "No detected changes",
                            "Изменений не обнаружено",
                            "לא זוהו שינויים",
                          )}
                        </span>
                      ) : (
                        changedFields.slice(0, 4).map((field) => (
                          <span
                            key={field}
                            className="inline-flex h-6 items-center rounded-md border border-border bg-surface px-2 text-[11px]"
                          >
                            {field}
                          </span>
                        ))
                      )}
                      {changedFields.length > 4 ? (
                        <span className="inline-flex h-6 items-center rounded-md border border-border bg-surface px-2 text-[11px] text-text-secondary">
                          +{changedFields.length - 4}
                        </span>
                      ) : null}
                    </div>
                    <button
                      onClick={() => {
                        if (item.entity_id) {
                          router.push(`/issues?issue_id=${item.entity_id}`);
                        }
                      }}
                      disabled={!item.entity_id}
                      className="mt-3 h-8 rounded-md border border-border bg-surface px-3 text-[12px] disabled:opacity-50"
                    >
                      {copy("Open Issue", "Открыть проблему", "פתח תקלה")}
                    </button>
                  </article>
                  <div className="hidden md:grid grid-cols-[170px_1fr_1fr_220px] gap-3 px-4 py-3 text-[13px] items-start">
                    <div className="text-text-secondary">
                      {formatDateTime(item.created_at)}
                    </div>
                    <div>
                      <div className="font-medium">{item.action}</div>
                      <div className="text-[11px] text-text-secondary mt-0.5">
                        {item.reason ||
                          copy("No reason", "Без причины", "ללא סיבה")}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {changedFields.length === 0 ? (
                        <span className="text-[12px] text-text-secondary">
                          {copy(
                            "No detected changes",
                            "Изменений не обнаружено",
                            "לא זוהו שינויים",
                          )}
                        </span>
                      ) : (
                        changedFields.slice(0, 4).map((field) => (
                          <span
                            key={field}
                            className="inline-flex h-6 items-center rounded-md border border-border bg-surface px-2 text-[11px]"
                          >
                            {field}
                          </span>
                        ))
                      )}
                      {changedFields.length > 4 ? (
                        <span className="inline-flex h-6 items-center rounded-md border border-border bg-surface px-2 text-[11px] text-text-secondary">
                          +{changedFields.length - 4}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          if (item.entity_id) {
                            router.push(`/issues?issue_id=${item.entity_id}`);
                          }
                        }}
                        disabled={!item.entity_id}
                        className="h-8 px-3 rounded-md border border-border bg-surface text-[12px] disabled:opacity-50"
                      >
                        {copy("Open Issue", "Открыть проблему", "פתח תקלה")}
                      </button>
                      <button
                        onClick={() =>
                          setExpandedIssueAuditId((current) =>
                            current === item.id ? null : item.id,
                          )
                        }
                        className="h-8 px-3 rounded-md border border-border bg-surface text-[12px]"
                      >
                        {isExpanded
                          ? copy("Hide Diff", "Скрыть изменения", "הסתר שינויים")
                          : copy("Show Diff", "Показать изменения", "הצג שינויים")}
                      </button>
                    </div>
                  </div>
                  {isExpanded ? (
                    <div className="px-4 pb-3">
                      <div className="grid gap-2 md:grid-cols-2">
                        <div className="rounded-lg border border-border bg-surface-subtle">
                          <div className="px-3 py-2 border-b border-border text-[11px] uppercase text-text-secondary">
                            {copy("Before", "До", "לפני")}
                          </div>
                          <pre className="p-3 text-[11px] leading-5 whitespace-pre-wrap break-all text-text-secondary overflow-x-auto">
                            {prettyJson(item.before)}
                          </pre>
                        </div>
                        <div className="rounded-lg border border-border bg-surface-subtle">
                          <div className="px-3 py-2 border-b border-border text-[11px] uppercase text-text-secondary">
                            {copy("After", "После", "אחרי")}
                          </div>
                          <pre className="p-3 text-[11px] leading-5 whitespace-pre-wrap break-all text-text-secondary overflow-x-auto">
                            {prettyJson(item.after)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          <div className="px-4 py-3 border-t border-border flex flex-wrap items-center justify-between gap-2 text-[12px]">
            <div className="text-text-secondary">
              {copy("Total matched", "Всего совпадений", 'סה"כ התאמות')}:{" "}
              {issueAuditSummary?.total || 0}
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={!issueAuditCanPrev}
                onClick={() =>
                  setIssueAuditOffset((x) =>
                    Math.max(0, x - AUDIT_PREVIEW_LIMIT),
                  )
                }
                className="h-8 px-3 rounded-md border border-border bg-surface disabled:opacity-50"
              >
                {tt("reports.prev")}
              </button>
              <button
                disabled={!issueAuditCanNext}
                onClick={() =>
                  setIssueAuditOffset((x) => x + AUDIT_PREVIEW_LIMIT)
                }
                className="h-8 px-3 rounded-md border border-border bg-surface disabled:opacity-50"
              >
                {tt("reports.next")}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-[12px] text-text-secondary">
            {alertsQuery.data?.last_read_at
              ? copy("Last read at", "Прочитано в", "נקרא לאחרונה ב") +
                `: ${formatDateTime(alertsQuery.data.last_read_at)}`
              : copy(
                  "Alerts are not marked as read yet.",
                  "Алерты ещё не были отмечены как прочитанные.",
                  "ההתראות עדיין לא סומנו כנקראו.",
                )}
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={!canGoPrev}
              onClick={() => setOffset((x) => Math.max(0, x - PAGE_SIZE))}
              className="h-8 px-3 rounded-md border border-border bg-surface text-[12px] disabled:opacity-50"
            >
              {tt("reports.prev")}
            </button>
            <button
              disabled={!canGoNext}
              onClick={() => setOffset((x) => x + PAGE_SIZE)}
              className="h-8 px-3 rounded-md border border-border bg-surface text-[12px] disabled:opacity-50"
            >
              {tt("reports.next")}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
