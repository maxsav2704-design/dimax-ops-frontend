export const AI_API = "/api/v1/admin/ai";

/** Where the workspace runs: the admin office or the installer cabinet. Same mechanism, different API and routes. */
export type AiSurface = "admin" | "installer";
export const AI_SURFACES: Record<AiSurface, { api: string; base: string }> = {
  admin: { api: "/api/v1/admin/ai", base: "/ai" },
  installer: { api: "/api/v1/installer/ai", base: "/installer/ai" },
};

export function canUseAiSurface(session: { role?: string; admin_scope?: string | null } | null | undefined, surface: AiSurface): boolean {
  if (!session) return false;
  if (surface === "installer") return session.role === "INSTALLER";
  return session.role === "ADMIN" && ["OWNER", "OPERATIONS", "FINANCE", "VIEWER"].includes(session.admin_scope ?? "");
}

export type AiLocale = "en" | "ru" | "he";
export type AiContextKind = "project" | "door" | "issue";
export type AiContext = { kind: AiContextKind; id: string };

export type AiStatus = {
  ready: boolean;
  reason: "ready" | "disabled" | "missing_api_key" | "missing_model";
  tools: string[];
  read_only: true;
  /** "mock" is the demo provider (no real model); "openai" is the live Responses API. */
  provider?: "openai" | "mock";
  actions_enabled?: boolean;
  real_model_verified?: false;
  execution?: "inline" | "background";
  rules_version?: number | null;
  daily_limit?: number;
  daily_used?: number;
};
export type AiRules = { version: number; text: string; updated_at: string | null; updated_by: string | null };
export type AiCheck = { ok: boolean; provider: "openai" | "mock"; model: string | null; latency_ms: number; code: string | null; answer_preview: string | null };

export type AiSource = { kind: "project" | "door" | "issue" | "installer"; id: string; label: string; path: string };
export type AiStep = { tool: string; ok: boolean; ms: number };

export type AiReply = {
  run_id: string;
  answer: string;
  sources: AiSource[];
  tools_used: string[];
  provider_requests: number;
  read_only: true;
  steps?: AiStep[];
  proposal_ids?: string[];
  provider?: "openai" | "mock";
  rules_version?: number | null;
};

export type AiProposalStatus = "PROPOSED" | "CONFIRMED" | "EXECUTED" | "REJECTED" | "EXPIRED" | "FAILED" | "CONFLICT";
export type AiPreviewValues = Record<string, unknown>;
export type AiProposal = {
  id: string; task_id: string; conversation_id: string; tool_name: string; status: AiProposalStatus;
  arguments: Record<string, unknown>;
  preview: { entity?: AiSource; summary?: AiPreviewValues; before?: AiPreviewValues; after?: AiPreviewValues };
  expected: Record<string, unknown>;
  result: { result?: AiPreviewValues; sources?: AiSource[]; message?: string } | null;
  error_code: string | null;
  expires_at: string; decided_at: string | null; executed_at: string | null; created_at: string; updated_at: string;
};

export type AiTask = {
  id: string; conversation_id: string; request_id: string; message: string;
  locale: AiLocale; project_id: string | null; context?: AiContext | null;
  status: "RUNNING" | "COMPLETED" | "FAILED" | "INTERRUPTED" | "CANCELLED";
  attempt_count: number; reply: AiReply | null; error_code: string | null;
  proposals?: AiProposal[];
  created_at: string; updated_at: string;
};
export type AiConversation = { id: string; title: string; created_at: string; updated_at: string };
export type AiPage<T> = { items: T[]; has_more: boolean };
export type AiTaskRequest = { request_id: string; conversation_id: string | null; message: string; locale: AiLocale; context?: AiContext | null };

// Only current in-app destinations are allowed. Model text is rendered as text.
export function safeAiSourcePath(path: string): boolean {
  return (/^\/(projects|issues|installers)\?/.test(path) || /^\/installer\/(projects\/[0-9a-f-]{36}|issues\?)/.test(path)) && !/[\\\r\n]/.test(path);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `project:<uuid>` from a deep link; anything else is ignored. */
export function parseAiContext(value: string | null | undefined): AiContext | null {
  if (!value) return null;
  const [kind, id] = value.split(":");
  if ((kind === "project" || kind === "door" || kind === "issue") && id && UUID.test(id)) return { kind, id };
  return null;
}

/** The one agent mechanism everywhere: a section opens the workspace with its object as context. */
export function aiContextHref(context: AiContext | null, question?: string, base = "/ai"): string {
  const params = new URLSearchParams();
  if (context) params.set("context", `${context.kind}:${context.id}`);
  if (question) params.set("q", question);
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

type Tri = { en: string; ru: string; he: string };
const tri = (en: string, ru: string, he: string): Tri => ({ en, ru, he });

/** Ready questions of the compact launcher, by the kind of the selected object. */
export const AI_PROMPTS: Record<AiContextKind | "company", Tri[]> = {
  company: [
    tri("Which projects need attention today?", "Какие объекты требуют внимания сегодня?", "אילו פרויקטים דורשים תשומת לב היום?"),
    tri("Where are the open issues?", "Где открытые замечания?", "היכן הליקויים הפתוחים?"),
  ],
  project: [
    tri("Which positions are not finished?", "Какие позиции не завершены?", "אילו פריטים לא הושלמו?"),
    tri("What blocks this project?", "Что блокирует объект?", "מה חוסם את הפרויקט?"),
    tri("Report an obstacle on a position", "Записать препятствие по позиции", "לרשום מכשול על פריט"),
  ],
  door: [
    tri("What is recorded on this position?", "Что записано по этой позиции?", "מה רשום על הפריט הזה?"),
    tri("Report an obstacle on this position", "Записать препятствие по этой позиции", "לרשום מכשול על הפריט הזה"),
  ],
  issue: [
    tri("Summarise this issue", "Кратко: что с этим замечанием?", "סכם את הליקוי הזה"),
    tri("Add a comment for the installer", "Добавить комментарий для монтажника", "להוסיף תגובה למתקין"),
    tri("Raise the priority and set a deadline", "Поднять приоритет и поставить срок", "להעלות עדיפות ולקבוע מועד"),
  ],
};

/** The installer's own wording: their positions, a comment for the office. */
export const AI_INSTALLER_PROMPTS: Record<AiContextKind | "company", Tri[]> = {
  company: [
    tri("Which of my positions are not finished?", "Какие мои позиции не завершены?", "אילו מהפריטים שלי לא הושלמו?"),
    tri("What is on my schedule this week?", "Что у меня по расписанию на этой неделе?", "מה בלו\"ז שלי השבוע?"),
  ],
  project: [
    tri("Which of my positions here are not finished?", "Какие мои позиции здесь не завершены?", "אילו מהפריטים שלי כאן לא הושלמו?"),
    tri("Report an obstacle on my position", "Записать препятствие по моей позиции", "לרשום מכשול על הפריט שלי"),
  ],
  door: [
    tri("What is recorded on this position?", "Что записано по этой позиции?", "מה רשום על הפריט הזה?"),
    tri("Report an obstacle on this position", "Записать препятствие по этой позиции", "לרשום מכשול על הפריט הזה"),
  ],
  issue: [
    tri("Summarise this issue", "Кратко: что с этим замечанием?", "סכם את הליקוי הזה"),
    tri("Add my comment for the office", "Добавить мой комментарий для офиса", "להוסיף את התגובה שלי למשרד"),
  ],
};

export const PROPOSAL_TOOL_LABEL: Record<string, Tri> = {
  propose_issue_report: tri("Report an issue on a position", "Замечание по позиции", "ליקוי על פריט"),
  propose_issue_comment: tri("Comment in the issue", "Комментарий к замечанию", "תגובה בליקוי"),
  propose_issue_workflow: tri("Change the issue workflow", "Изменение хода замечания", "שינוי מהלך הליקוי"),
  propose_my_issue_report: tri("My report on a position", "Моё замечание по позиции", "הדיווח שלי על פריט"),
  propose_my_issue_comment: tri("My comment in the issue", "Мой комментарий к замечанию", "התגובה שלי בליקוי"),
};

export const PREVIEW_FIELD_LABEL: Record<string, Tri> = {
  door_status: tri("Position status", "Статус позиции", "סטטוס הפריט"),
  issue_status: tri("Issue status", "Статус замечания", "סטטוס הליקוי"),
  issue_title: tri("Issue title", "Название замечания", "כותרת הליקוי"),
  title: tri("Title", "Название", "כותרת"),
  details: tri("Details", "Описание", "פירוט"),
  priority: tri("Priority", "Приоритет", "עדיפות"),
  workflow_state: tri("Workflow", "Ход работы", "מהלך"),
  comment: tri("Comment", "Комментарий", "תגובה"),
  due_at: tri("Deadline", "Срок", "מועד יעד"),
  project: tri("Project", "Объект", "פרויקט"),
  door: tri("Position", "Позиция", "פריט"),
  door_marking: tri("Marking", "Маркировка", "סימון"),
  mode: tri("Record", "Запись", "רשומה"),
  door_version: tri("Position version", "Версия позиции", "גרסת הפריט"),
  issue_id: tri("Issue", "Замечание", "ליקוי"),
  comment_id: tri("Comment", "Комментарий", "תגובה"),
};

export const PREVIEW_VALUE_LABEL: Record<string, Tri> = {
  OPEN: tri("Open", "Открыто", "פתוח"), CLOSED: tri("Closed", "Закрыто", "סגור"),
  NEW: tri("New", "Новое", "חדש"), TRIAGED: tri("Triaged", "Разобрано", "מוין"),
  IN_PROGRESS: tri("In progress", "В работе", "בתהליך"), BLOCKED: tri("Blocked", "Заблокировано", "חסום"),
  RESOLVED: tri("Resolved", "Решено", "נפתר"),
  NOT_INSTALLED: tri("Not installed", "Не установлена", "לא הותקן"), INSTALLED: tri("Installed", "Установлена", "הותקן"),
  ISSUE_OPEN: tri("Issue open", "Открыто замечание", "ליקוי פתוח"), LOCKED: tri("Locked", "Заблокирована", "נעול"),
  CANCELLED: tri("Cancelled", "Отменена", "בוטל"),
  new: tri("New issue", "Новое замечание", "ליקוי חדש"), reopen: tri("Reopen the closed issue", "Повторное открытие", "פתיחה מחדש"),
  append: tri("Added to the open issue", "Дополнение открытого замечания", "תוספת לליקוי הפתוח"),
};

export function previewValue(value: unknown, locale: AiLocale): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string") {
    const known = PREVIEW_VALUE_LABEL[value];
    if (known) return known[locale];
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(locale);
    }
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

/** Rows of the before/after table: every key of the preview, identical values marked unchanged. */
export function previewRows(preview: AiProposal["preview"]): { key: string; before: unknown; after: unknown; changed: boolean }[] {
  const before = preview.before ?? {};
  const after = preview.after ?? {};
  const keys = Array.from(new Set([...Object.keys(after), ...Object.keys(before)]));
  return keys
    .filter((key) => !(before[key] == null && after[key] == null))
    .map((key) => ({ key, before: before[key], after: after[key], changed: JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null) }));
}

export const aiCopy = {
  en: {
    title: "DIMAX AI", subtitle: "Ask about projects, positions, issues and installers. Changes are proposals you confirm.",
    readOnly: "Reads system data", question: "Your task or question", ask: "Ask DIMAX AI",
    working: "Checking system records…", clear: "Clear", cancel: "Stop waiting", sources: "Source records",
    answer: "Answer", pending: "Checking connection…", retry: "Check again",
    disconnected: "AI is not connected yet. Ask the system administrator to complete the connection.",
    disabled: "AI is currently switched off.", unavailable: "AI could not answer. Try again later.",
    access: "AI access is unavailable for this account.", limit: "Request limit reached. Try again later.",
    timeout: "The request took too long. Try a more specific question.",
    accessError: "Your access has changed. Refresh the page before continuing.",
    empty: "Ask a specific question. Answers use records available to your account.",
    examples: ["Which projects are active?", "Find open issues on my project", "Find an installer by name"],
    installerExamples: ["Which of my positions are not finished?", "What is open on my issues?", "Report an obstacle on a position"],
    installerSubtitle: "Your positions, your issues. Reports are proposals you confirm; installation is confirmed in the app as before.",
    tooLong: "Use no more than 4,000 characters.", cancelled: "You stopped waiting for this answer. No business data was changed.",
    voice: "Dictate", voiceStop: "Stop dictation", voiceFailed: "Dictation did not work in this browser.",
    conversations: "Conversation", newConversation: "New conversation", more: "Load older records",
    historyError: "Conversation history could not be loaded.", recover: "Check the same request",
    retryTask: "Run this task again", cancelTask: "Cancel task", saved: "Saved on the server",
    interrupted: "The previous run was interrupted. You can start it again.",
    taskCancelled: "This task was cancelled.", unknownDelivery: "The connection was lost. Check the same request to recover its result.",
    rail: "Dialogs and tasks", connection: "Connection", thread: "Dialog",
    providerMock: "Demo provider: no real model is connected. Answers are built from system records; the real connection is not verified.",
    providerLive: "Model connection configured. A real model run has not been verified on this installation.",
    actionsOn: "Actions: proposals that you confirm", actionsOff: "Actions: off, reads only",
    contextLabel: "Selected object", contextClear: "Clear", contextKinds: { project: "Project", door: "Position", issue: "Issue" },
    contextHint: "The agent reads this object first; the question is answered in its context.",
    heroIdle: "Ready", heroWorking: "Working", heroAwaiting: "Waiting for your decision",
    timeline: { received: "Request received", context: "Selected object read", reading: "Records read", proposing: "Proposal prepared", answer: "Answer", failed: "Stopped" },
    stepsCount: (n: number) => `${n} tool ${n === 1 ? "call" : "calls"}`,
    proposal: {
      title: "Proposed action", review: "Review and confirm", confirm: "Confirm", reject: "Reject", confirming: "Saving…",
      executed: "Saved and verified", rejected: "Rejected, nothing saved", expired: "Expired: ask again for a fresh preview",
      conflict: "The record changed after the preview. Ask again for a fresh preview.", failed: "Could not be saved.",
      proposed: "Waiting for your decision", expires: "Valid until", before: "Now", after: "After confirmation", unchanged: "unchanged",
      keeps: "Installation facts, prices, assignments and earnings are not changed.",
      dialogChanges: "The office command is saved once with the values shown. The record is re-read first; if it changed, nothing is saved.",
      result: "Saved record", open: "Open record", decisionLost: "The connection was lost. Confirm again: the same decision is reused, nothing is saved twice.",
    },
    assist: { title: "DIMAX AI", open: "Open the workspace", hint: "Ask about this object" },
    executionBackground: "Runs in the background: the answer arrives while you keep working", executionInline: "Runs within the request",
    rulesVersion: (version: number) => `Company rules: version ${version}`, noRulesYet: "Company rules: none set",
    budget: (used: number, limit: number) => `Daily limit: ${used} of ${limit} requests today`,
    settings: {
      meta: "Connection, daily limit and the company rules the agent follows.",
      ready: "Connected and switched on", background: "Execution: background worker", inline: "Execution: within the request",
      budget: (used: number, limit: number) => `Daily limit: ${used} of ${limit} requests today`,
      rules: "Company rules for the agent", rulesHint: "Plain language, read by the agent as company authority. Rules cannot add tools, grant rights or change prices, installation facts or earnings.",
      rulesPlaceholder: "Example: deadlines for issues are at least two working days; always mention the project name in answers.",
      version: "Version", noRules: "No rules set yet", save: "Save rules", saved: "Rules saved", saveFailed: "Rules could not be saved",
      check: "Check connection", checkOk: "Connection works", checkFailed: "Connection check failed", ownerOnly: "Only the company owner can change rules or run the check.",
    },
  },
  ru: {
    title: "DIMAX AI", subtitle: "Задачи и вопросы по объектам, позициям, замечаниям и монтажникам. Изменения — это предложения, которые вы подтверждаете.",
    readOnly: "Читает данные системы", question: "Задача или вопрос", ask: "Спросить DIMAX AI",
    working: "Проверяю записи системы…", clear: "Очистить", cancel: "Остановить ожидание", sources: "Записи-источники",
    answer: "Ответ", pending: "Проверяю подключение…", retry: "Проверить снова",
    disconnected: "ИИ пока не подключён. Администратору системы нужно завершить подключение.",
    disabled: "ИИ сейчас выключен.", unavailable: "Не удалось получить ответ. Повторите позже.",
    access: "ИИ недоступен для этой учётной записи.", limit: "Достигнут лимит запросов. Повторите позже.",
    timeout: "Запрос занял слишком много времени. Уточните вопрос.",
    accessError: "Права доступа изменились. Обновите страницу перед продолжением.",
    empty: "Задайте конкретный вопрос. Ответ будет основан на записях, доступных вашей учётной записи.",
    examples: ["Какие объекты сейчас активны?", "Найди открытые замечания на моём объекте", "Найди монтажника по имени"],
    installerExamples: ["Какие мои позиции не завершены?", "Что открыто по моим замечаниям?", "Записать препятствие по позиции"],
    installerSubtitle: "Ваши позиции и ваши замечания. Отчёты — это предложения, которые вы подтверждаете; монтаж подтверждается в приложении как раньше.",
    tooLong: "Используйте не более 4 000 символов.", cancelled: "Ожидание ответа остановлено. Данные бизнеса не изменены.",
    voice: "Надиктовать", voiceStop: "Остановить диктовку", voiceFailed: "Диктовка в этом браузере не сработала.",
    conversations: "Диалог", newConversation: "Новый диалог", more: "Загрузить более ранние записи",
    historyError: "Не удалось загрузить историю диалога.", recover: "Проверить тот же запрос",
    retryTask: "Запустить задачу снова", cancelTask: "Отменить задачу", saved: "Сохранено на сервере",
    interrupted: "Предыдущий запуск прерван. Задачу можно запустить снова.",
    taskCancelled: "Эта задача отменена.", unknownDelivery: "Связь прервалась. Проверьте тот же запрос, чтобы восстановить результат.",
    rail: "Диалоги и задачи", connection: "Подключение", thread: "Диалог",
    providerMock: "Демо-провайдер: реальная модель не подключена. Ответы собираются по записям системы; реальное подключение не проверено.",
    providerLive: "Подключение модели настроено. Реальный прогон модели на этой установке не проверен.",
    actionsOn: "Действия: предложения, которые вы подтверждаете", actionsOff: "Действия выключены, только чтение",
    contextLabel: "Выбранный объект", contextClear: "Сбросить", contextKinds: { project: "Объект", door: "Позиция", issue: "Замечание" },
    contextHint: "Агент сначала читает этот объект; вопрос отвечается в его контексте.",
    heroIdle: "Готов", heroWorking: "Работает", heroAwaiting: "Ждёт вашего решения",
    timeline: { received: "Запрос получен", context: "Выбранный объект прочитан", reading: "Записи прочитаны", proposing: "Предложение подготовлено", answer: "Ответ", failed: "Остановлено" },
    stepsCount: (n: number) => `${n} ${n === 1 ? "вызов" : n < 5 ? "вызова" : "вызовов"} инструментов`,
    proposal: {
      title: "Предлагаемое действие", review: "Проверить и подтвердить", confirm: "Подтвердить", reject: "Отклонить", confirming: "Сохраняю…",
      executed: "Сохранено и проверено", rejected: "Отклонено, ничего не сохранено", expired: "Срок истёк: спросите снова, чтобы получить свежий предпросмотр",
      conflict: "Запись изменилась после предпросмотра. Спросите снова, чтобы получить свежий предпросмотр.", failed: "Не удалось сохранить.",
      proposed: "Ждёт вашего решения", expires: "Действует до", before: "Сейчас", after: "После подтверждения", unchanged: "без изменений",
      keeps: "Факты монтажа, цены, назначения и начисления не меняются.",
      dialogChanges: "Офисная команда сохраняется один раз с показанными значениями. Запись сначала перечитывается; если она изменилась, ничего не сохраняется.",
      result: "Сохранённая запись", open: "Открыть запись", decisionLost: "Связь прервалась. Подтвердите снова: решение переиспользуется, ничего не сохраняется дважды.",
    },
    assist: { title: "DIMAX AI", open: "Открыть рабочее место", hint: "Спросить об этом объекте" },
    executionBackground: "Работает в фоне: ответ придёт, пока вы продолжаете работу", executionInline: "Работает внутри запроса",
    rulesVersion: (version: number) => `Правила компании: версия ${version}`, noRulesYet: "Правила компании: не заданы",
    budget: (used: number, limit: number) => `Дневной лимит: ${used} из ${limit} запросов сегодня`,
    settings: {
      meta: "Подключение, дневной лимит и правила компании, которым следует агент.",
      ready: "Подключён и включён", background: "Исполнение: фоновый воркер", inline: "Исполнение: внутри запроса",
      budget: (used: number, limit: number) => `Дневной лимит: ${used} из ${limit} запросов сегодня`,
      rules: "Правила компании для агента", rulesHint: "Обычным языком; агент читает их как правила компании. Правила не добавляют инструментов, не дают прав и не меняют цены, факты монтажа и начисления.",
      rulesPlaceholder: "Например: срок по замечаниям не меньше двух рабочих дней; всегда называть объект в ответе.",
      version: "Версия", noRules: "Правила ещё не заданы", save: "Сохранить правила", saved: "Правила сохранены", saveFailed: "Не удалось сохранить правила",
      check: "Проверить подключение", checkOk: "Подключение работает", checkFailed: "Проверка подключения не прошла", ownerOnly: "Менять правила и запускать проверку может только владелец компании.",
    },
  },
  he: {
    title: "DIMAX AI", subtitle: "משימות ושאלות על פרויקטים, פריטים, ליקויים ומתקינים. שינויים הם הצעות שאתם מאשרים.",
    readOnly: "קורא נתוני מערכת", question: "משימה או שאלה", ask: "שאל את DIMAX AI",
    working: "בודק רשומות במערכת…", clear: "נקה", cancel: "הפסק המתנה", sources: "רשומות מקור",
    answer: "תשובה", pending: "בודק חיבור…", retry: "בדוק שוב",
    disconnected: "הבינה המלאכותית עדיין לא מחוברת. מנהל המערכת צריך להשלים את החיבור.",
    disabled: "הבינה המלאכותית כבויה כרגע.", unavailable: "לא התקבלה תשובה. נסה שוב מאוחר יותר.",
    access: "הבינה המלאכותית אינה זמינה לחשבון זה.", limit: "הגעת למגבלת הבקשות. נסה שוב מאוחר יותר.",
    timeout: "הבקשה ארכה זמן רב מדי. נסה שאלה ממוקדת יותר.",
    accessError: "הרשאות הגישה השתנו. רענן את הדף לפני ההמשך.",
    empty: "שאל שאלה ממוקדת. התשובות מבוססות על הרשומות הזמינות לחשבון שלך.",
    examples: ["אילו פרויקטים פעילים?", "מצא ליקויים פתוחים בפרויקט שלי", "מצא מתקין לפי שם"],
    installerExamples: ["אילו מהפריטים שלי לא הושלמו?", "מה פתוח בליקויים שלי?", "לרשום מכשול על פריט"],
    installerSubtitle: "הפריטים שלך והליקויים שלך. דיווחים הם הצעות שאתה מאשר; ההתקנה מאושרת באפליקציה כמו קודם.",
    tooLong: "השתמש בעד 4,000 תווים.", cancelled: "ההמתנה לתשובה הופסקה. נתוני העסק לא השתנו.",
    voice: "הכתבה", voiceStop: "עצור הכתבה", voiceFailed: "ההכתבה לא עבדה בדפדפן זה.",
    conversations: "שיחה", newConversation: "שיחה חדשה", more: "טען רשומות קודמות",
    historyError: "לא ניתן לטעון את היסטוריית השיחה.", recover: "בדוק את אותה בקשה",
    retryTask: "הפעל את המשימה שוב", cancelTask: "בטל משימה", saved: "נשמר בשרת",
    interrupted: "ההפעלה הקודמת נקטעה. אפשר להפעיל שוב.",
    taskCancelled: "המשימה בוטלה.", unknownDelivery: "החיבור אבד. בדוק את אותה בקשה כדי לשחזר את התוצאה.",
    rail: "שיחות ומשימות", connection: "חיבור", thread: "שיחה",
    providerMock: "ספק הדגמה: מודל אמיתי אינו מחובר. התשובות נבנות מרשומות המערכת; החיבור האמיתי לא אומת.",
    providerLive: "חיבור המודל מוגדר. הרצה אמיתית של המודל לא אומתה בהתקנה זו.",
    actionsOn: "פעולות: הצעות שאתם מאשרים", actionsOff: "פעולות כבויות, קריאה בלבד",
    contextLabel: "אובייקט נבחר", contextClear: "נקה", contextKinds: { project: "פרויקט", door: "פריט", issue: "ליקוי" },
    contextHint: "הסוכן קורא קודם את האובייקט הזה; השאלה נענית בהקשרו.",
    heroIdle: "מוכן", heroWorking: "עובד", heroAwaiting: "ממתין להחלטתך",
    timeline: { received: "הבקשה התקבלה", context: "האובייקט הנבחר נקרא", reading: "הרשומות נקראו", proposing: "ההצעה הוכנה", answer: "תשובה", failed: "נעצר" },
    stepsCount: (n: number) => `${n} קריאות כלים`,
    proposal: {
      title: "פעולה מוצעת", review: "בדוק ואשר", confirm: "אשר", reject: "דחה", confirming: "שומר…",
      executed: "נשמר ואומת", rejected: "נדחה, דבר לא נשמר", expired: "פג תוקף: שאל שוב לקבלת תצוגה מקדימה עדכנית",
      conflict: "הרשומה השתנתה אחרי התצוגה המקדימה. שאל שוב לקבלת תצוגה עדכנית.", failed: "לא ניתן היה לשמור.",
      proposed: "ממתין להחלטתך", expires: "בתוקף עד", before: "עכשיו", after: "אחרי האישור", unchanged: "ללא שינוי",
      keeps: "עובדות ההתקנה, המחירים, השיבוצים והצבירות אינם משתנים.",
      dialogChanges: "פקודת המשרד נשמרת פעם אחת עם הערכים המוצגים. הרשומה נקראת מחדש קודם; אם השתנתה, דבר לא נשמר.",
      result: "רשומה שנשמרה", open: "פתח רשומה", decisionLost: "החיבור אבד. אשר שוב: אותה החלטה נעשה בה שימוש, דבר לא נשמר פעמיים.",
    },
    assist: { title: "DIMAX AI", open: "פתח את סביבת העבודה", hint: "שאל על האובייקט הזה" },
    executionBackground: "פועל ברקע: התשובה תגיע בזמן שאתם ממשיכים לעבוד", executionInline: "פועל בתוך הבקשה",
    rulesVersion: (version: number) => `כללי החברה: גרסה ${version}`, noRulesYet: "כללי החברה: לא הוגדרו",
    budget: (used: number, limit: number) => `מגבלה יומית: ${used} מתוך ${limit} בקשות היום`,
    settings: {
      meta: "חיבור, מגבלה יומית וכללי החברה שהסוכן פועל לפיהם.",
      ready: "מחובר ופעיל", background: "ביצוע: עובד רקע", inline: "ביצוע: בתוך הבקשה",
      budget: (used: number, limit: number) => `מגבלה יומית: ${used} מתוך ${limit} בקשות היום`,
      rules: "כללי החברה לסוכן", rulesHint: "בשפה פשוטה; הסוכן קורא אותם כסמכות החברה. הכללים אינם מוסיפים כלים, אינם מעניקים הרשאות ואינם משנים מחירים, עובדות התקנה או צבירות.",
      rulesPlaceholder: "לדוגמה: מועד יעד לליקויים הוא לפחות יומיים עבודה; לציין תמיד את שם הפרויקט בתשובה.",
      version: "גרסה", noRules: "עדיין לא הוגדרו כללים", save: "שמור כללים", saved: "הכללים נשמרו", saveFailed: "לא ניתן היה לשמור את הכללים",
      check: "בדוק חיבור", checkOk: "החיבור פועל", checkFailed: "בדיקת החיבור נכשלה", ownerOnly: "רק בעל החברה יכול לשנות כללים או להריץ את הבדיקה.",
    },
  },
};

type SpeechRecognitionLike = {
  lang: string; interimResults: boolean; maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void; stop: () => void;
};

/** The browser's speech recognition when it exists; voice only fills the question, rights stay unchanged. */
export function speechRecognitionFactory(): (() => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? () => new Ctor() : null;
}

export const SPEECH_LANG: Record<AiLocale, string> = { en: "en-US", ru: "ru-RU", he: "he-IL" };
