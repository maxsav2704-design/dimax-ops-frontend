"use client";

import { useCallback } from "react";

import { useCopy, useI18n, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { readableApiError } from "@/lib/api-error-display";
import { apiDownload } from "@/lib/api";
import { formatLocaleDateTime as formatLocalizedDateTime, formatLocaleNumber as formatLocalizedNumber, formatLocalePercent as formatLocalizedPercent } from "@/lib/formatting";
import { Star } from "lucide-react";
import type { InstallerMatrixSortBy, InstallerProjectSortBy, InstallersSortBy, OrderNumbersSortBy, ReportsDashboardTone, ReportsFocus, ReportsInsight, ReportsLibraryGroup, ReportsOpsPreset, ReportsPreset, ReportsScopedContext, SortDir } from "./types";

// Shared by ReportsPage and its section components (src/components/reports/*).
// Moved out of the page verbatim while the page is split into sections.

export const reportsOverrides: Record<Locale, Record<string, string>> = {
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

export function reportsPanelClass(extra?: string): string {
  return cn("rounded-lg border border-border bg-surface", extra);
}

export function reportsMetricCardClass(
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

export function formatReportDateTime(value: string): string {
  return formatLocalizedDateTime(value);
}

/**
 * Catalog text (`t`), report overrides (`tt`), inline tri-lingual copy, the
 * localized API error reader and the sort-option label mapper for a section.
 */
export function useReportsText() {
  const { locale, t } = useI18n();
  const copy = useCopy();
  const tt = useCallback(
    (key: string) => reportsOverrides[locale]?.[key] ?? t(key),
    [locale, t],
  );
  const readError = useCallback(
    (error: unknown, fallback: string) => readableApiError(error, locale, fallback),
    [locale],
  );
  const optionLabel = useCallback(
    (label: string) => {
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
    },
    [copy],
  );
  return { locale, t, tt, copy, readError, optionLabel };
}

// ---- moved verbatim from ReportsPage.tsx (module level) ----

export const LIVE_REPORT_REFRESH_MS = 30_000;

export const STANDARD_REPORT_REFRESH_MS = 5 * 60_000;

export const PAGE_SIZE = 20;

export const KPI_PAGE_SIZE = 20;

export const FAILED_OUTBOX_LIMIT = 8;

export const AUDIT_PREVIEW_LIMIT = 8;

export const AUDIT_EXPORT_LIMIT = 10000;

export const KPI_EXPORT_LIMIT = 5000;

export const ISSUES_ANALYTICS_DAYS = 30;

export const PROJECT_MARGIN_LIMIT = 5;

export const INSTALLER_MATRIX_LIMIT = 8;

export const INSTALLER_PROJECT_LIMIT = 10;

export const RISK_CONCENTRATION_LIMIT = 5;

export const REPORTS_PRESETS_STORAGE_KEY = "dimax_reports_presets_v1";

export const REPORTS_FOCUS_IDS: Record<ReportsFocus, string> = {
  operations: "reports-operations-center",
  delivery: "reports-delivery-risk",
  issues: "reports-issues-analytics",
};

export function getReportsFocusCopy(
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

export function getReportsOpsPresetCopy(
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

// Reports tiers (premium visual, owner's open item): one page, three readers.
// "all" keeps the whole cockpit; a tier hides the sections meant for the other readers.
export type ReportsTier = "all" | "executive" | "operations" | "people";
export const REPORTS_TIERS: ReportsTier[] = ["all", "executive", "operations", "people"];
export const REPORTS_TIER_STORAGE_KEY = "dmx.reports.tier";

export function parseReportsTier(value: string | null): ReportsTier | null {
  return value === "all" || value === "executive" || value === "operations" || value === "people" ? value : null;
}

/** The tier a focus deep link belongs to: its section is shown whatever tier is chosen. */
export function reportsFocusTier(focus: ReportsFocus | null): ReportsTier | null {
  return focus ? "operations" : null;
}

export function parseReportsFocus(value: string | null): ReportsFocus | null {
  if (value === "operations" || value === "delivery" || value === "issues") {
    return value;
  }
  return null;
}

export function parseReportsOpsPreset(value: string | null): ReportsOpsPreset | null {
  if (
    value === "failed-imports" ||
    value === "delivery-risk" ||
    value === "issue-pressure"
  ) {
    return value;
  }
  return null;
}

export function getReportsFocusTargetId(
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

export const AUDIT_ENTITY_OPTIONS = [
  "door_type",
  "reason",
  "company",
  "project",
  "sync_state",
] as const;

export const AUDIT_ACTION_OPTIONS = [
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

export const ISSUE_AUDIT_ACTION_OPTIONS = [
  "ISSUE_STATUS_UPDATE",
  "ISSUE_WORKFLOW_UPDATE",
  "ISSUE_WORKFLOW_BULK_UPDATE",
] as const;

export const SLA_HISTORY_DAYS_OPTIONS = [7, 30] as const;

export const SORT_DIR_OPTIONS: Array<{ value: SortDir; label: string }> = [
  { value: "desc", label: "Desc" },
  { value: "asc", label: "Asc" },
];

export const INSTALLERS_SORT_OPTIONS: Array<{
  value: InstallersSortBy;
  label: string;
}> = [
  { value: "installed_doors", label: "Installed Doors" },
  { value: "payroll_total", label: "Payroll" },
  { value: "revenue_total", label: "Revenue" },
  { value: "profit_total", label: "Profit" },
  { value: "installer_name", label: "Installer Name" },
];

export const INSTALLER_MATRIX_SORT_OPTIONS: Array<{
  value: InstallerMatrixSortBy;
  label: string;
}> = [
  { value: "profit_total", label: "Profit" },
  { value: "margin_pct", label: "Margin %" },
  { value: "installed_doors", label: "Installed Doors" },
  { value: "avg_profit_per_door", label: "Profit / Door" },
  { value: "open_issues", label: "Open Issues" },
];

export const INSTALLER_PROJECT_SORT_OPTIONS: Array<{
  value: InstallerProjectSortBy;
  label: string;
}> = [
  { value: "profit_total", label: "Profit" },
  { value: "margin_pct", label: "Margin %" },
  { value: "installed_doors", label: "Installed Doors" },
  { value: "avg_profit_per_door", label: "Profit / Door" },
  { value: "open_issues", label: "Open Issues" },
];

export const ORDER_NUMBERS_SORT_OPTIONS: Array<{
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

export const SLA_STATUS_CLASS: Record<string, string> = {
  OK: "border-status-ok-border bg-status-ok-bg text-status-ok-fg",
  WARN: "border-status-warning-border bg-status-warning-bg text-status-warning-fg",
  DANGER:
    "border-status-problem-border bg-status-problem-bg text-status-problem-fg",
};

export function installerPerformanceBandClass(band: string): string {
  if (band === "INCOMPLETE") {
    return "text-text-secondary bg-surface-subtle border-border";
  }
  if (band === "STRONG") {
    return "text-status-ok-fg bg-status-ok-bg border-status-ok-border";
  }
  if (band === "RISK") {
    return "text-status-problem-fg bg-status-problem-bg border-status-problem-border";
  }
  return "text-status-warning-fg bg-status-warning-bg border-status-warning-border";
}

export function reportsNoticeClass(
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

export function formatDateTime(value: string): string {
  return formatLocalizedDateTime(value);
}

export function metricLabel(metric: string | null): string {
  if (!metric) {
    return "unknown";
  }
  return metric.replaceAll("_", " ");
}

export function compactMap(map: Record<string, number> | undefined): string {
  if (!map || Object.keys(map).length === 0) {
    return "n/a";
  }
  return Object.entries(map)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" | ");
}

export function buildOperationsHref(params: {
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

export function formatAmount(value: number | null | undefined): string {
  if (value === null) return "-";
  return formatLocalizedNumber(value ?? 0, undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null) return "-";
  return formatLocalizedPercent(value ?? 0);
}

export function formatCount(value: number | string | null | undefined): string {
  return formatLocalizedNumber(value ?? 0, undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function toReportNumber(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function reportsDashboardToneClasses(tone: ReportsDashboardTone) {
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





export function downloadBlob(blob: Blob, filename: string): void {
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

export async function downloadCsvExport(
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

export function auditDateFromValue(value: string): string | null {
  if (!value) {
    return null;
  }
  return new Date(`${value}T00:00:00`).toISOString();
}

export function auditDateToValue(value: string): string | null {
  if (!value) {
    return null;
  }
  return new Date(`${value}T23:59:59.999`).toISOString();
}

export function buildAuditParams({
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

export function changedFieldKeys(
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

export function prettyJson(value: unknown): string {
  if (value === null || value === undefined) {
    return "{}";
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function readReportsPresets(): ReportsPreset[] {
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

export function writeReportsPresets(presets: ReportsPreset[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(
    REPORTS_PRESETS_STORAGE_KEY,
    JSON.stringify(presets),
  );
}

