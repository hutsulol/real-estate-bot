export type Source = "ria" | "lun" | "olx";

// Listing as returned by backend /search and /listings
// (Supabase row + server.js post-processing).
export interface Listing {
  id: string;
  title: string;
  price: number;
  currency: string;
  rooms: number | null;
  link: string;
  district: string | null;
  residential_complex: string | null;
  street: string | null;
  // Enriched columns added in migrations/0001_enrich_apartments.sql
  floor: number | null;
  total_floors: number | null;
  area_total: number | null;
  area_living: number | null;
  area_kitchen: number | null;
  walls: string | null;
  heating: string | null;
  year_built: number | null;
  has_repair: boolean | null;
  is_secondary: boolean | null;
  source: Source | null;
  posted_at: string | null;
  // server.js adds
  deal_type?: "rent" | "sale" | null;
  deal?: string;
}

// Display-friendly listing used by UI cards.
export interface ListingView {
  id: string;
  title?: string;
  rooms: number | null;
  area?: number | null;
  areaLiving?: number | null;
  areaKitchen?: number | null;
  floor?: number | null;
  floors?: number | null;
  price: number;
  currency: string;
  district: string | null;
  complex: string | null;
  street: string | null;
  walls?: string | null;
  heating?: string | null;
  yearBuilt?: number | null;
  hasRepair?: boolean | null;
  isSecondary?: boolean | null;
  source: Source;
  posted?: string;
  link?: string;
  deal?: string;
  dealType?: "rent" | "sale" | null;
}

export type ClientStatus = "active" | "paused" | "closed";

export interface ClientCriteria {
  secondary: boolean;
  repaired: boolean;
  yearFrom: number;
  floorFrom: number;
  heating: string;
}

export interface Client {
  id: string;
  name: string;
  username: string;
  initials: string;
  status: ClientStatus;
  description: string;
  budget: string;
  district: string;
  rooms: string;
  autoEnabled: boolean;
  delay: number;
  frequency: string;
  initiate: boolean;
  metrics: { sent: number; read: number; replied: number };
  matches: number;
  lastMsg: string;
  criteria: ClientCriteria;
}

export interface ChatHistoryItem {
  id: string;
  title: string;
  sub: string;
  active?: boolean;
}

export interface TgMessage {
  from: "bot" | "user";
  text: string;
  time: string;
}

export type Theme = "light" | "dark";

export interface Tweaks {
  theme: Theme;
}

export interface ChatMessage {
  role: "user" | "ai";
  text: string;
  tools?: { src: string; count: number; ok: boolean }[];
  listings?: ListingView[];
  loading?: boolean;
}
