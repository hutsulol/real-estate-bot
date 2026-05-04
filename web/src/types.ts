export type Source = "ria" | "lun" | "olx";

// Listing as returned by backend /search (Supabase + server.js post-processing)
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
  deal_type?: "rent" | "sale" | null;
  deal?: string;
  source?: Source;
}

// Display-only listing used by mock data and UI cards.
// Mirrors the prototype's richer schema for screens that show fields the
// backend does not yet provide.
export interface ListingView {
  id: string;
  title?: string;
  rooms: number | null;
  area?: number;
  floor?: number;
  floors?: number;
  price: number;
  currency: string;
  district: string | null;
  complex: string | null;
  street: string | null;
  walls?: string;
  heating?: string;
  yearBuilt?: number;
  source: Source;
  posted?: string;
  link?: string;
  deal?: string;
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
