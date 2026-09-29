// Client-safe names and shapes for the Freshmen guide, shared by the public
// page, the admin manager, and the API (server/api/modules/freshmen).
// Icons are stored by name; components/freshmen-icons.tsx maps them to
// lucide icons.

export const FRESHMEN_ICON_NAMES = [
  "backpack",
  "book-open",
  "clipboard-check",
  "users",
  "house",
  "wallet",
  "laptop",
  "key-round",
  "graduation-cap",
  "heart-pulse",
  "stethoscope",
  "shield-check",
  "megaphone",
  "calendar",
  "map-pin",
  "phone",
  "bed-double",
  "lock",
  "bath",
  "flashlight",
  "utensils",
  "plug-zap",
  "shirt",
  "bus",
  "sparkles",
  "circle-help",
  "file-text",
  "id-card",
] as const;

export type FreshmenIconName = (typeof FRESHMEN_ICON_NAMES)[number];

export type TopicLayout = "text" | "steps" | "cards";

export const TOPIC_LAYOUT_LABELS: Record<TopicLayout, string> = {
  text: "Text only",
  steps: "Text + numbered steps",
  cards: "Text + icon cards",
};

export interface TopicItem {
  title: string;
  note?: string | null;
  icon?: string | null;
}

export interface FreshmenTopic {
  id: number;
  section_id: number;
  title: string;
  body: string | null;
  layout: TopicLayout;
  items: Array<TopicItem> | null;
  sort_order: number;
}

export interface FreshmenSection {
  id: number;
  guide_id: number;
  title: string;
  intro: string | null;
  image_url: string | null;
  is_mandatory: 0 | 1;
  sort_order: number;
  is_published: 0 | 1;
  topics: Array<FreshmenTopic>;
}

export interface FreshmenGuide {
  id: number;
  title: string;
  summary: string | null;
  icon: string;
  image_url: string | null;
  sort_order: number;
  is_published: 0 | 1;
  sections: Array<FreshmenSection>;
}

export interface FreshmenFaq {
  id: number;
  question: string;
  answer: string;
  sort_order: number;
  is_published: 0 | 1;
}

export interface FreshmenContent {
  guides: Array<FreshmenGuide>;
  faqs: Array<FreshmenFaq>;
}
