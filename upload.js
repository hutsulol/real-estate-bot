require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const SUPABASE_TABLE = process.env.SUPABASE_TABLE || 'apartments';
const INPUT_FILE = process.env.OUTPUT_DATA_FILE || 'final-data.json';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase env. Add SUPABASE_URL + SUPABASE_ANON_KEY (or SUPABASE_PROJECT_URL + SUPABASE_KEY) to .env');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));

function toInt(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapRow(item) {
  const location = item.location || item.district || item.street || null;

  return {
    id: toInt(item.id),
    title: item.title ?? null,
    price: toInt(item.price),
    location,
    link: item.link ?? item.source_url ?? null,
    area_total: toNumber(item.area_total),
    area_kitchen: toNumber(item.area_kitchen),
    rooms: toInt(item.rooms ?? item.room_count),
    floor: toInt(item.floor),
    floors_total: toInt(item.floors_total ?? item.floor_count),
    currency: item.currency ?? null,
  };
}

(async () => {
  console.log(`Загружаем ${data.length} записей в ${SUPABASE_TABLE}...`);

  let ok = 0;
  let failed = 0;

  for (const item of data) {
    const row = mapRow(item);

    if (row.id === null) {
      failed += 1;
      console.log('Skip row: invalid id', item.id);
      continue;
    }

    const { error } = await supabase.from(SUPABASE_TABLE).upsert(row, { onConflict: 'id' });

    if (error) {
      failed += 1;
      console.log('Insert error:', error.message);
      continue;
    }

    ok += 1;
  }

  console.log(`Готово 🚀 success=${ok} failed=${failed}`);
})();
