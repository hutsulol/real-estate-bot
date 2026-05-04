import type { Listing, ListingView, Source } from "../types";

// In dev, /api is proxied to http://localhost:3000 by vite.config.ts.
// In prod, set VITE_API_BASE in .env to your deployed backend URL.
const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

export interface ParsedFilters {
  rooms?: number | null;
  district?: string | null;
  max_price?: number | null;
  deal_type?: "rent" | "sale" | null;
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
  limit?: number;
}

export async function getAllListings(params: ListingsParams = {}): Promise<Listing[]> {
  const qs = new URLSearchParams();
  if (params.rooms != null) qs.set("rooms", String(params.rooms));
  if (params.district) qs.set("district", params.district);
  if (params.max_price != null) qs.set("max_price", String(params.max_price));
  if (params.deal_type) qs.set("deal_type", params.deal_type);
  if (params.limit != null) qs.set("limit", String(params.limit));
  const url = `${API_BASE}/listings${qs.toString() ? `?${qs}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Listings failed: ${res.status}`);
  const data = (await res.json()) as Listing[];
  return Array.isArray(data) ? data : [];
}

// Round-robin a source label so the UI can colour-tag a listing even though
// the backend does not yet record which scraper produced it.
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
    price: l.price,
    currency: l.currency,
    district: l.district,
    complex: l.residential_complex,
    street: l.street,
    source: l.source ?? inferSource(l.id),
    link: l.link,
    deal: l.deal,
  };
}
