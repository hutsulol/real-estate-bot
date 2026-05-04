import type { Listing, ListingView, Source } from "../types";

// In dev, /api is proxied to http://localhost:3000 by vite.config.ts.
// In prod, set VITE_API_BASE in .env to your deployed backend URL.
const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

export async function searchListings(query: string): Promise<Listing[]> {
  const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
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
