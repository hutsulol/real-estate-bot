require('dotenv').config();
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const CITY_GEO_ID = Number(process.env.LUN_GEO_ID || 10008717);
const SECTION_ID = Number(process.env.LUN_SECTION_ID || 1);
const PAGE_SIZE = Number(process.env.LUN_PAGE_SIZE || 24);
const MAX_PAGES = Number(process.env.LUN_MAX_PAGES || 8);
const UPDATE_EVERY_MS = Number(process.env.LUN_SYNC_INTERVAL_MS || 60 * 60 * 1000);

const supabaseUrl = process.env.SUPABASE_URL || 'https://ixxvfvtdomhenwqhpyqj.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_7SWFWo2-TZLFKtWWZbLwxQ_aDbp_JNC';

const supabase = createClient(supabaseUrl, supabaseKey);

function normalizeToApartment(card) {
  return {
    id: card.id ?? null,
    title: card.title || card.address || `${card.roomCount || '?'}к ${card.areaTotal || '?'}м²`,
    price: card.price ?? null,
    currency: (card.currency || 'UAH').toUpperCase(),
    rooms: card.roomCount ?? null,
    district: card.districtName ?? null,
    residential_complex: card.residentialComplexName ?? null,
    street: card.streetName ?? null,
    link: card.urlRaw || card.url || null,
    deal_type: 'sale'
  };
}

async function fetchPage(page) {
  const params = new URLSearchParams({
    language: 'uk',
    sectionId: String(SECTION_ID),
    geoId: String(CITY_GEO_ID),
    page: String(page),
    pageSize: String(PAGE_SIZE),
    groupCollapse: 'true',
    geoDistance: `${CITY_GEO_ID}:10000`
  });

  const url = `https://lun.ua/api/v2/market/realties?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      accept: 'application/json, text/plain, */*',
      'accept-language': 'uk-UA,uk;q=0.9,en;q=0.8',
      referer: 'https://lun.ua/sale/if/flats',
      'user-agent': 'Mozilla/5.0'
    }
  });

  if (!res.ok) throw new Error(`LUN API ${res.status} page=${page}`);
  return res.json();
}

async function collectListings() {
  const merged = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    console.log(`LUN fetch page ${page}/${MAX_PAGES}`);
    const payload = await fetchPage(page);
    const cards = Array.isArray(payload.cards) ? payload.cards : [];
    if (!cards.length) break;
    merged.push(...cards);
  }

  const byId = new Map();
  for (const c of merged) if (c?.id) byId.set(c.id, c);

  return [...byId.values()]
    .map(normalizeToApartment)
    .filter((x) => x.id && x.price && x.link);
}

async function upsertApartments(items) {
  let inserted = 0;
  const chunkSize = 300;

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('apartments')
      .upsert(chunk, { onConflict: 'id' });

    if (error) {
      console.error('Supabase upsert error:', error);
      throw error;
    }
    inserted += chunk.length;
  }

  return inserted;
}

async function runOnce() {
  console.log(`[${new Date().toISOString()}] Sync started`);
  const listings = await collectListings();
  fs.writeFileSync('data-lun.json', JSON.stringify(listings, null, 2));
  console.log(`Prepared ${listings.length} LUN listings for DB upsert`);
  const count = await upsertApartments(listings);
  console.log(`[${new Date().toISOString()}] Sync finished: ${count} upserted`);
}

(async () => {
  const watch = process.argv.includes('--watch');

  try {
    await runOnce();
  } catch (e) {
    console.error('Initial sync failed:', e.message);
    process.exit(1);
  }

  if (watch) {
    console.log(`Watch mode ON, every ${Math.round(UPDATE_EVERY_MS / 60000)} min`);
    setInterval(async () => {
      try {
        await runOnce();
      } catch (e) {
        console.error('Sync iteration failed:', e.message);
      }
    }, UPDATE_EVERY_MS);
  }
})();
