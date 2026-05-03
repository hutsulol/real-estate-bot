const fs = require('fs');

const CITY_GEO_ID = 10008717; // Ivano-Frankivsk
const SECTION_ID = 1; // flats sale section used by lun
const PAGE_SIZE = 24;
const MAX_PAGES = Number(process.env.LUN_MAX_PAGES || 5);

function detectDealType(card = {}) {
  if (card.sectionName && /rent|оренда/i.test(card.sectionName)) return 'rent';
  return 'sale';
}

function normalizeCard(card) {
  return {
    id: card.id ?? null,
    group_id: card.groupId ?? null,
    title: card.title || card.address || null,
    price: card.price ?? null,
    price_sqm: card.priceSqm ?? null,
    currency: (card.currency || 'uah').toUpperCase(),
    room_count: card.roomCount ?? null,
    area_total: card.areaTotal ?? null,
    floor: card.floor ?? null,
    floor_count: card.floorCount ?? null,
    district: card.districtName ?? null,
    street: card.streetName ?? null,
    source_url: card.urlRaw || card.url || null,
    inserted_at: card.insertTime ?? null,
    downloaded_at: card.downloadTime ?? null,
    deal_type: detectDealType(card),
    source: 'lun',
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
    geoDistance: `${CITY_GEO_ID}:10000`,
  });

  const url = `https://lun.ua/api/v2/market/realties?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      'accept': 'application/json, text/plain, */*',
      'accept-language': 'uk-UA,uk;q=0.9,en;q=0.8',
      'user-agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'referer': 'https://lun.ua/sale/if/flats',
    },
  });

  if (!res.ok) {
    throw new Error(`LUN API error ${res.status} for page ${page}`);
  }

  return res.json();
}

(async () => {
  const all = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    console.log(`LUN: fetching page ${page}/${MAX_PAGES}`);
    const payload = await fetchPage(page);
    const cards = Array.isArray(payload.cards) ? payload.cards : [];

    if (cards.length === 0) {
      console.log('LUN: empty page, stopping');
      break;
    }

    all.push(...cards.map(normalizeCard));
  }

  fs.writeFileSync('data-lun.json', JSON.stringify(all, null, 2));
  console.log(`✅ Saved ${all.length} listings to data-lun.json`);
})();
