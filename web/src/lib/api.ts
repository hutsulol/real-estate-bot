import type { Listing, ListingView, Source } from "../types";

// In dev, /api is proxied to http://localhost:3000 by vite.config.ts.
// In prod, set VITE_API_BASE in .env to your deployed backend URL.
const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

export interface ParsedFilters {
  rooms?: number | null;
  district?: string | null;
  max_price?: number | null;
  currency?: string | null;
  deal_type?: "rent" | "sale" | null;
  floor_eq?: number | null;
  floor_min?: number | null;
  floor_max?: number | null;
  area_min?: number | null;
  area_max?: number | null;
  year_from?: number | null;
  heating?: string | null;
  walls?: string | null;
  has_repair?: boolean | null;
  is_secondary?: boolean | null;
  complex?: string | null;
}

export interface SearchResponse {
  filters: ParsedFilters;
  results: Listing[];
}

export async function searchListings(query: string): Promise<SearchResponse> {
  const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  const data = (await res.json()) as Listing[];
  let filters: ParsedFilters = {};
  const raw = res.headers.get("X-Parsed-Filters");
  if (raw) {
    try {
      filters = JSON.parse(raw);
    } catch {
      /* ignore malformed header */
    }
  }
  return { filters, results: Array.isArray(data) ? data : [] };
}

export interface ListingsParams {
  rooms?: number;
  district?: string;
  max_price?: number;
  deal_type?: "rent" | "sale";
  floor?: number;
  floor_min?: number;
  floor_max?: number;
  area_min?: number;
  area_max?: number;
  year_from?: number;
  heating?: string;
  walls?: string;
  has_repair?: boolean;
  is_secondary?: boolean;
  source?: string;
  complex?: string;
  limit?: number;
}

export async function getAllListings(params: ListingsParams = {}): Promise<Listing[]> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null) continue;
    qs.set(k, String(v));
  }
  const url = `${API_BASE}/listings${qs.toString() ? `?${qs}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Listings failed: ${res.status}`);
  const data = (await res.json()) as Listing[];
  return Array.isArray(data) ? data : [];
}

// Round-robin a source label so the UI can colour-tag a listing even though
// the backend does not always record which scraper produced it.
function inferSource(id: string): Source {
  const sources: Source[] = ["olx", "ria", "lun"];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return sources[Math.abs(h) % sources.length];
}

export function listingToView(l: Listing): ListingView {
  return {
    id: l.id,
    title: l.title,
    rooms: l.rooms,
    area: l.area_total,
    areaLiving: l.area_living,
    areaKitchen: l.area_kitchen,
    floor: l.floor,
    floors: l.total_floors,
    price: l.price,
    currency: l.currency,
    district: l.district,
    complex: l.residential_complex,
    street: l.street,
    walls: l.walls,
    heating: l.heating,
    yearBuilt: l.year_built,
    hasRepair: l.has_repair,
    isSecondary: l.is_secondary,
    source: l.source ?? inferSource(l.id),
    link: l.link,
    deal: l.deal,
    dealType: l.deal_type,
  };
}
