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

(async () => {
  console.log(`Загружаем ${data.length} записей в ${SUPABASE_TABLE}...`);

  for (const item of data) {
    const { error } = await supabase.from(SUPABASE_TABLE).insert({
      id: item.id,
      title: item.title,
      price: item.price,
      currency: item.currency,
      rooms: item.rooms ?? item.room_count ?? null,
      district: item.district ?? null,
      residential_complex: item.residential_complex ?? null,
      street: item.street ?? null,
      floor: item.floor ?? null,
      floor_count: item.floor_count ?? null,
      area_total: item.area_total ?? null,
      link: item.link ?? item.source_url ?? null,
      deal_type: item.deal_type ?? null,
      source: item.source ?? null,
    });

    if (error) {
      console.log('Insert error:', error.message);
    }
  }

  console.log('Готово 🚀');
})();
