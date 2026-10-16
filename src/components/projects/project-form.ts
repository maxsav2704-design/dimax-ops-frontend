// Project create/edit form: state shape, draft helpers and address suggestions.
// Moved verbatim from ProjectsPage.tsx (monolith split, Projects step 1).

import { type Locale } from "@/lib/i18n";

export const projectsMetricLabelClass =
  "text-[10.5px] font-semibold uppercase text-text-secondary";

export type ProjectLifecycleStatus =
  | "PLANNED"
  | "ACTIVE"
  | "ON_HOLD"
  | "COMPLETED"
  | "CANCELLED";

export type ProjectFormState = {
  code: string;
  name: string;
  planned_start_date: string;
  planned_end_date: string;
  lifecycle_status: ProjectLifecycleStatus;
  address: string;
  address_street: string;
  address_building: string;
  address_city: string;
  address_entrance: string;
  address_lat: string;
  address_lng: string;
  address_waze_url: string;
  developer_company: string;
  contact_name: string;
  contact_phone: string;
  developer_phone_alt: string;
  developer_whatsapp: string;
  contact_email: string;
  developer_notes: string;
};

export type ProjectFormFieldErrors = Partial<
  Record<
    | "contact_phone"
    | "developer_phone_alt"
    | "developer_whatsapp"
    | "address_waze_url",
    string
  >
>;

export type ProjectAddressSuggestion = {
  key: string;
  label: string;
  street: string;
  building: string;
  city: string;
  entrance: string;
  lat: string;
  lng: string;
};

export type ProjectAddressSuggestionsResponse = {
  items: ProjectAddressSuggestion[];
};

export const PROJECT_CITY_COORDS: Array<{
  lat: string;
  lng: string;
  aliases: string[];
}> = [
  { lat: "31.8014", lng: "34.6435", aliases: ["ashdod", "אשדוד", "ашдод"] },
  {
    lat: "31.2518",
    lng: "34.7915",
    aliases: ["ashkelon", "אשקלון", "ашкелон"],
  },
  {
    lat: "31.7683",
    lng: "35.2137",
    aliases: ["jerusalem", "ירושלים", "иерусалим"],
  },
  {
    lat: "32.0853",
    lng: "34.7818",
    aliases: ["tel aviv", "tel-aviv", "תל אביב", "тель авив"],
  },
  { lat: "32.7940", lng: "34.9896", aliases: ["haifa", "חיפה", "хайфа"] },
  {
    lat: "31.9980",
    lng: "34.7320",
    aliases: ["rishon lezion", "ראשון לציון", "ришон лецион"],
  },
  { lat: "32.3215", lng: "34.8532", aliases: ["netanya", "נתניה", "нетания"] },
  {
    lat: "31.2520",
    lng: "34.7913",
    aliases: ["beer sheva", "be'er sheva", "באר שבע", "беэр шева"],
  },
];

export function emptyProjectForm(): ProjectFormState {
  return {
    code: "",
    name: "",
    planned_start_date: "",
    planned_end_date: "",
    lifecycle_status: "ACTIVE",
    address: "",
    address_street: "",
    address_building: "",
    address_city: "",
    address_entrance: "",
    address_lat: "",
    address_lng: "",
    address_waze_url: "",
    developer_company: "",
    contact_name: "",
    contact_phone: "",
    developer_phone_alt: "",
    developer_whatsapp: "",
    contact_email: "",
    developer_notes: "",
  };
}

export function normalizeDraftPhone(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  let digits = trimmed.replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) {
    digits = `+${digits.slice(2)}`;
  }
  if (digits.startsWith("0")) {
    digits = `+972${digits.slice(1)}`;
  } else if (!digits.startsWith("+")) {
    digits = `+${digits}`;
  }
  digits = `+${digits.replace(/[^\d]/g, "")}`;
  return digits.length >= 12 && digits.length <= 13 ? digits : null;
}

export function buildDraftProjectAddress(form: ProjectFormState): string {
  const structured = [
    form.address_street.trim(),
    form.address_building.trim(),
    form.address_city.trim(),
  ].filter(Boolean);
  const base =
    structured.length > 0 ? structured.join(", ") : form.address.trim();
  if (!base) {
    return "";
  }
  return form.address_entrance.trim()
    ? `${base}, ${form.address_entrance.trim()}`
    : base;
}

export function buildDraftWazeLink(form: ProjectFormState): string | null {
  if (form.address_lat.trim() && form.address_lng.trim()) {
    return `https://www.waze.com/ul?ll=${encodeURIComponent(form.address_lat.trim())},${encodeURIComponent(form.address_lng.trim())}&navigate=yes`;
  }
  if (form.address_waze_url.trim()) {
    return form.address_waze_url.trim();
  }
  const address = buildDraftProjectAddress(form);
  if (!address) {
    return null;
  }
  return `https://www.waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
}

export function buildDraftWhatsappMessage(
  form: ProjectFormState,
  locale: Locale,
): string | null {
  const code = form.code.trim();
  const name = form.name.trim();
  if (!code && !name) {
    return null;
  }
  const projectRef = code && name ? `${name} (${code})` : name || code;
  if (locale === "ru") {
    return `Добрый день, по проекту ${projectRef}`;
  }
  if (locale === "he") {
    return `שלום, בקשר לפרויקט ${projectRef}`;
  }
  return `Hello, regarding project ${projectRef}`;
}

export function buildDraftWhatsappLink(
  form: ProjectFormState,
  locale: Locale,
): string | null {
  const phone = normalizeDraftPhone(
    form.developer_whatsapp || form.contact_phone,
  );
  if (!phone) {
    return null;
  }
  const message = buildDraftWhatsappMessage(form, locale);
  const waPhone = phone.replace("+", "");
  return message
    ? `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${waPhone}`;
}

export function formatProjectPhoneInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }

  let digits = trimmed.replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) {
    digits = `+${digits.slice(2)}`;
  }
  if (digits.startsWith("0")) {
    digits = `+972${digits.slice(1)}`;
  } else if (digits.startsWith("972")) {
    digits = `+${digits}`;
  } else if (!digits.startsWith("+")) {
    digits = `+972${digits}`;
  }

  return `+${digits.replace(/[^\d]/g, "")}`;
}

export function buildDraftMapPreviewUrl(form: ProjectFormState): string | null {
  const latText = form.address_lat.trim();
  const lngText = form.address_lng.trim();
  // Number("") is 0, which used to draw a map of 0°,0° for an empty address.
  if (!latText || !lngText) {
    return null;
  }
  const lat = Number(latText);
  const lng = Number(lngText);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  const delta = 0.01;
  const bbox = [lng - delta, lat - delta, lng + delta, lat + delta]
    .map((item) => item.toFixed(6))
    .join("%2C");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(6)}%2C${lng.toFixed(6)}`;
}

export function buildProjectFieldErrorCopy(
  field: keyof ProjectFormFieldErrors,
  locale: Locale,
): string {
  const copyByField: Record<
    keyof ProjectFormFieldErrors,
    Record<Locale, string>
  > = {
    contact_phone: {
      en: "Enter the primary phone in +972XXXXXXXXX format.",
      ru: "Введите основной телефон в формате +972XXXXXXXXX.",
      he: "הזן את הטלפון הראשי בפורמט ‎+972XXXXXXXXX.",
    },
    developer_phone_alt: {
      en: "Enter the backup phone in +972XXXXXXXXX format.",
      ru: "Введите дополнительный телефон в формате +972XXXXXXXXX.",
      he: "הזן את הטלפון הנוסף בפורמט ‎+972XXXXXXXXX.",
    },
    developer_whatsapp: {
      en: "Enter the WhatsApp number in +972XXXXXXXXX format.",
      ru: "Введите номер WhatsApp в формате +972XXXXXXXXX.",
      he: "הזן את מספר ה-WhatsApp בפורמט ‎+972XXXXXXXXX.",
    },
    address_waze_url: {
      en: "Enter a valid http or https Waze link.",
      ru: "Введите корректную Waze-ссылку с http или https.",
      he: "הזן קישור Waze תקין עם http או https.",
    },
  };

  return copyByField[field][locale];
}

export function lookupProjectCityCoords(
  city: string,
): { lat: string; lng: string } | null {
  const normalized = city.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  const match = PROJECT_CITY_COORDS.find((item) =>
    item.aliases.some((alias) => normalized.includes(alias)),
  );
  return match ? { lat: match.lat, lng: match.lng } : null;
}

export function buildProjectAddressSuggestions(
  raw: string,
): ProjectAddressSuggestion[] {
  const value = raw.trim();
  if (value.length < 3) {
    return [];
  }

  const suggestions: ProjectAddressSuggestion[] = [];
  const seen = new Set<string>();

  const pushSuggestion = (
    street: string,
    building: string,
    city: string,
    entrance: string,
  ) => {
    const normalizedStreet = street.trim();
    const normalizedBuilding = building.trim();
    const normalizedCity = city.trim();
    const normalizedEntrance = entrance.trim();
    if (!normalizedStreet && !normalizedCity) {
      return;
    }
    const label = [
      normalizedStreet,
      normalizedBuilding,
      normalizedCity,
      normalizedEntrance,
    ]
      .filter(Boolean)
      .join(", ");
    if (!label || seen.has(label.toLowerCase())) {
      return;
    }
    seen.add(label.toLowerCase());
    const coords = lookupProjectCityCoords(normalizedCity);
    suggestions.push({
      key: label.toLowerCase(),
      label,
      street: normalizedStreet,
      building: normalizedBuilding,
      city: normalizedCity,
      entrance: normalizedEntrance,
      lat: coords?.lat || "",
      lng: coords?.lng || "",
    });
  };

  const commaParts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (commaParts.length >= 3) {
    pushSuggestion(
      commaParts[0] || "",
      commaParts[1] || "",
      commaParts[2] || "",
      commaParts.slice(3).join(", "),
    );
  }

  const compactMatch = value.match(
    /^(.+?)\s+(\d+[A-Za-zА-Яа-я/-]*)\s+([A-Za-z\u0590-\u05FF\u0400-\u04FF][A-Za-z\u0590-\u05FF\u0400-\u04FF\s-]*?)(?:\s+([A-Za-z0-9\u0590-\u05FF\u0400-\u04FF-]+))?$/u,
  );
  if (compactMatch) {
    pushSuggestion(
      compactMatch[1] || "",
      compactMatch[2] || "",
      compactMatch[3] || "",
      compactMatch[4] || "",
    );
  }

  if (suggestions.length === 0) {
    pushSuggestion(value, "", "", "");
  }

  return suggestions;
}
