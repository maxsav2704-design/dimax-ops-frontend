import type { Locale } from "@/lib/locale";

type DashboardCopy = {
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  heroChips: {
    projects: string;
    problems: string;
    calendar: string;
  };
  heroActions: {
    operations: string;
    projects: string;
    calendar: string;
  };
  kpi: {
    activeProjects: string;
    installed7d: string;
    problems: string;
    profit7d: string;
    syncStatusPending: string;
    syncDanger: string;
    notInstalled: string;
    doorsWithoutRates: string;
    revenue: string;
    payroll: string;
  };
  errors: {
    dashboardLoadFailed: string;
  };
  dispatcher: {
    eyebrow: string;
    title: string;
    description: string;
    openProjects: string;
    openInstallers: string;
    openCalendar: string;
    metrics: {
      projects: string;
      needsDispatch: string;
      doors: string;
      pending: string;
      installed: string;
      unassigned: string;
      issues: string;
      blocked: string;
      availableCrew: string;
      busy: string;
      nextVisits7d: string;
      installationSchedule: string;
    };
    projectsSection: {
      title: string;
      description: string;
      contact: string;
      status: string;
      openProject: string;
      pending: string;
      assigned: string;
      unassigned: string;
      completion: string;
      issues: string;
      blocked: string;
      noScheduledVisit: string;
      suggestedInstallers: string;
      projects: string;
      doors: string;
      noRecommendations: string;
      noProjects: string;
    };
    installersSection: {
      title: string;
      description: string;
      noContactData: string;
      status: string;
      activeFallback: string;
      projects: string;
      openDoors: string;
      issues: string;
      nextSlot: string;
      noScheduledEvent: string;
      noInstallers: string;
    };
    notScheduled: string;
  };
  problemsTable: {
    title: string;
    description: string;
    viewAll: string;
    project: string;
    problems: string;
    address: string;
    updated: string;
    empty: string;
    emptyHint: string;
    addressNotSet: string;
  };
  topReasons: {
    title: string;
    description: string;
    range7d: string;
    empty: string;
    emptyHint: string;
  };
  nextSchedule: {
    title: string;
    description: string;
    openCalendar: string;
    empty: string;
  };
};

const copy: Record<Locale, DashboardCopy> = {
  en: {
    heroEyebrow: "Operational overview",
    heroTitle: "Dashboard",
    heroDescription:
      "One screen to understand the current state: where risk is growing, which projects need attention, and where to move next.",
    heroChips: {
      projects: "Projects",
      problems: "Problems",
      calendar: "Calendar",
    },
    heroActions: {
      operations: "Operations",
      projects: "Projects",
      calendar: "Calendar",
    },
    kpi: {
      activeProjects: "Active Projects",
      installed7d: "Installed (7d)",
      problems: "Problems",
      profit7d: "Profit (7d)",
      syncStatusPending: "Sync status pending",
      syncDanger: "Sync danger",
      notInstalled: "Not installed",
      doorsWithoutRates: "doors without rates",
      revenue: "Revenue",
      payroll: "Payroll",
    },
    errors: {
      dashboardLoadFailed: "Failed to load dashboard data. Check token and API availability.",
    },
    dispatcher: {
      eyebrow: "Dispatcher Board",
      title: "Live operator control for doors, blockers and crew load",
      description:
        "Use this board to decide which project needs crew now, where blockers are growing, and which installer can absorb the next assignment.",
      openProjects: "Open projects",
      openInstallers: "Open installers",
      openCalendar: "Open calendar",
      metrics: {
        projects: "Projects",
        needsDispatch: "Needs dispatch",
        doors: "Doors",
        pending: "Pending",
        installed: "Installed",
        unassigned: "Unassigned",
        issues: "Issues",
        blocked: "Blocked",
        availableCrew: "Available Crew",
        busy: "Busy",
        nextVisits7d: "Next 7d Visits",
        installationSchedule: "Installation schedule",
      },
      projectsSection: {
        title: "Projects needing dispatch",
        description: "Prioritized by blockers, unassigned doors and pending backlog.",
        contact: "Contact",
        status: "Status",
        openProject: "Open project",
        pending: "Pending",
        assigned: "Assigned",
        unassigned: "Unassigned",
        completion: "Completion",
        issues: "Issues",
        blocked: "Blocked",
        noScheduledVisit: "No scheduled visit",
        suggestedInstallers: "Suggested installers",
        projects: "Projects",
        doors: "Doors",
        noRecommendations: "No active installer recommendations yet.",
        noProjects: "No project dispatch data available yet.",
      },
      installersSection: {
        title: "Crew availability",
        description: "Who can absorb more work right now.",
        noContactData: "No contact data",
        status: "Status",
        activeFallback: "ACTIVE",
        projects: "Projects",
        openDoors: "Open Doors",
        issues: "Issues",
        nextSlot: "Next slot",
        noScheduledEvent: "No scheduled event",
        noInstallers: "No installer load data available yet.",
      },
      notScheduled: "Not scheduled",
    },
    problemsTable: {
      title: "Problem Projects (Top 10)",
      description: "Projects with the highest unresolved installation pressure.",
      viewAll: "View all",
      project: "Project",
      problems: "Problems",
      address: "Address",
      updated: "Updated",
      empty: "No problem projects.",
      emptyHint: "All projects are running smoothly.",
      addressNotSet: "Address not set",
    },
    topReasons: {
      title: "Top reasons",
      description: "Issue drivers across the last seven-day window.",
      range7d: "7d range",
      empty: "No data.",
      emptyHint: "Reasons will appear when issues arise.",
    },
    nextSchedule: {
      title: "Next schedule",
      description: "Upcoming operational slots with clear time windows.",
      openCalendar: "Open calendar",
      empty: "No upcoming events.",
    },
  },
  ru: {
    heroEyebrow: "Операционный обзор",
    heroTitle: "Дашборд",
    heroDescription:
      "Один экран для понимания текущего состояния: где растёт риск, какие проекты требуют внимания и куда логично перейти следующим шагом.",
    heroChips: {
      projects: "Проекты",
      problems: "Проблемы",
      calendar: "Календарь",
    },
    heroActions: {
      operations: "Операции",
      projects: "Проекты",
      calendar: "Календарь",
    },
    kpi: {
      activeProjects: "Активные проекты",
      installed7d: "Установлено (7д)",
      problems: "Проблемы",
      profit7d: "Прибыль (7д)",
      syncStatusPending: "Статус синка ожидается",
      syncDanger: "Критичный sync",
      notInstalled: "Не установлено",
      doorsWithoutRates: "дверей без ставок",
      revenue: "Выручка",
      payroll: "Начисления",
    },
    errors: {
      dashboardLoadFailed: "Не удалось загрузить данные дашборда. Проверьте токен и доступность API.",
    },
    dispatcher: {
      eyebrow: "Диспетчерская панель",
      title: "Живой контроль дверей, блокеров и загрузки бригад",
      description:
        "Используйте эту панель, чтобы понять, какому проекту нужна бригада прямо сейчас, где растут блокеры и кто из монтажников может взять следующее назначение.",
      openProjects: "Открыть проекты",
      openInstallers: "Открыть монтажников",
      openCalendar: "Открыть календарь",
      metrics: {
        projects: "Проекты",
        needsDispatch: "Нужно назначение",
        doors: "Двери",
        pending: "В ожидании",
        installed: "Установлено",
        unassigned: "Без назначения",
        issues: "Проблемы",
        blocked: "Блокировано",
        availableCrew: "Свободные бригады",
        busy: "Заняты",
        nextVisits7d: "Визиты 7д",
        installationSchedule: "График установок",
      },
      projectsSection: {
        title: "Проекты, требующие назначения",
        description: "Приоритет по блокерам, неназначенным дверям и незакрытому хвосту.",
        contact: "Контакт",
        status: "Статус",
        openProject: "Открыть проект",
        pending: "В ожидании",
        assigned: "Назначено",
        unassigned: "Без назначения",
        completion: "Готовность",
        issues: "Проблемы",
        blocked: "Блокировано",
        noScheduledVisit: "Визит не назначен",
        suggestedInstallers: "Рекомендуемые монтажники",
        projects: "Проекты",
        doors: "Двери",
        noRecommendations: "Пока нет активных рекомендаций по монтажникам.",
        noProjects: "Пока нет данных по диспетчеризации проектов.",
      },
      installersSection: {
        title: "Доступность бригад",
        description: "Кто может взять больше работы прямо сейчас.",
        noContactData: "Нет контактов",
        status: "Статус",
        activeFallback: "АКТИВЕН",
        projects: "Проекты",
        openDoors: "Открытые двери",
        issues: "Проблемы",
        nextSlot: "Следующее окно",
        noScheduledEvent: "Событие не назначено",
        noInstallers: "Пока нет данных по загрузке монтажников.",
      },
      notScheduled: "Не назначено",
    },
    problemsTable: {
      title: "Проблемные проекты (Топ 10)",
      description: "Проекты с самым высоким незакрытым установочным давлением.",
      viewAll: "Смотреть все",
      project: "Проект",
      problems: "Проблемы",
      address: "Адрес",
      updated: "Обновлено",
      empty: "Нет проблемных проектов.",
      emptyHint: "Все проекты идут стабильно.",
      addressNotSet: "Адрес не указан",
    },
    topReasons: {
      title: "Топ причин",
      description: "Основные драйверы проблем за последние семь дней.",
      range7d: "Диапазон 7д",
      empty: "Нет данных.",
      emptyHint: "Причины появятся, когда возникнут проблемы.",
    },
    nextSchedule: {
      title: "Ближайшее расписание",
      description: "Предстоящие операционные слоты с понятными временными окнами.",
      openCalendar: "Открыть календарь",
      empty: "Нет ближайших событий.",
    },
  },
  he: {
    heroEyebrow: "מבט תפעולי",
    heroTitle: "דשבורד",
    heroDescription:
      "מסך אחד להבנת המצב הנוכחי: איפה הסיכון גדל, אילו פרויקטים דורשים תשומת לב ולאן נכון לעבור בשלב הבא.",
    heroChips: {
      projects: "פרויקטים",
      problems: "תקלות",
      calendar: "יומן",
    },
    heroActions: {
      operations: "תפעול",
      projects: "פרויקטים",
      calendar: "יומן",
    },
    kpi: {
      activeProjects: "פרויקטים פעילים",
      installed7d: "הותקן (7 ימים)",
      problems: "תקלות",
      profit7d: "רווח (7 ימים)",
      syncStatusPending: "סטטוס סנכרון ממתין",
      syncDanger: "סנכרון קריטי",
      notInstalled: "לא הותקן",
      doorsWithoutRates: "דלתות ללא תעריף",
      revenue: "הכנסות",
      payroll: "תשלומים",
    },
    errors: {
      dashboardLoadFailed: "טעינת נתוני הדשבורד נכשלה. בדקו את הטוקן ואת זמינות ה-API.",
    },
    dispatcher: {
      eyebrow: "לוח תפעול",
      title: "שליטה חיה בדלתות, חסמים ועומס הצוותים",
      description:
        "השתמשו בלוח הזה כדי להבין איזה פרויקט צריך צוות עכשיו, איפה החסמים גדלים ואיזה מתקין יכול לקלוט את המשימה הבאה.",
      openProjects: "פתח פרויקטים",
      openInstallers: "פתח מתקינים",
      openCalendar: "פתח יומן",
      metrics: {
        projects: "פרויקטים",
        needsDispatch: "דורש שיבוץ",
        doors: "דלתות",
        pending: "ממתין",
        installed: "הותקן",
        unassigned: "ללא שיוך",
        issues: "תקלות",
        blocked: "חסום",
        availableCrew: "צוותים זמינים",
        busy: "עסוקים",
        nextVisits7d: "ביקורים 7 ימים",
        installationSchedule: "לו\"ז התקנות",
      },
      projectsSection: {
        title: "פרויקטים שדורשים שיבוץ",
        description: "עדיפות לפי חסמים, דלתות ללא שיוך ועומס פתוח.",
        contact: "איש קשר",
        status: "סטטוס",
        openProject: "פתח פרויקט",
        pending: "ממתין",
        assigned: "משויך",
        unassigned: "ללא שיוך",
        completion: "התקדמות",
        issues: "תקלות",
        blocked: "חסום",
        noScheduledVisit: "אין ביקור מתוזמן",
        suggestedInstallers: "מתקינים מומלצים",
        projects: "פרויקטים",
        doors: "דלתות",
        noRecommendations: "עדיין אין המלצות פעילות למתקינים.",
        noProjects: "עדיין אין נתוני שיבוץ פרויקטים.",
      },
      installersSection: {
        title: "זמינות צוותים",
        description: "מי יכול לקלוט עוד עבודה כרגע.",
        noContactData: "אין פרטי קשר",
        status: "סטטוס",
        activeFallback: "פעיל",
        projects: "פרויקטים",
        openDoors: "דלתות פתוחות",
        issues: "תקלות",
        nextSlot: "חלון הבא",
        noScheduledEvent: "אין אירוע מתוזמן",
        noInstallers: "עדיין אין נתוני עומס למתקינים.",
      },
      notScheduled: "לא מתוזמן",
    },
    problemsTable: {
      title: "פרויקטים בעייתיים (10 המובילים)",
      description: "הפרויקטים עם לחץ ההתקנה הלא פתור הגבוה ביותר.",
      viewAll: "צפה בהכול",
      project: "פרויקט",
      problems: "תקלות",
      address: "כתובת",
      updated: "עודכן",
      empty: "אין פרויקטים בעייתיים.",
      emptyHint: "כל הפרויקטים מתקדמים בצורה חלקה.",
      addressNotSet: "אין כתובת",
    },
    topReasons: {
      title: "סיבות מובילות",
      description: "הגורמים המרכזיים לתקלות בשבעת הימים האחרונים.",
      range7d: "טווח 7 ימים",
      empty: "אין נתונים.",
      emptyHint: "הסיבות יופיעו כאשר יעלו תקלות.",
    },
    nextSchedule: {
      title: "הלו\"ז הקרוב",
      description: "חלונות העבודה הקרובים עם טווחי זמן ברורים.",
      openCalendar: "פתח יומן",
      empty: "אין אירועים קרובים.",
    },
  },
};

export function getDashboardCopy(locale: Locale): DashboardCopy {
  return copy[locale];
}
