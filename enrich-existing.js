// One-shot backfill: pull every apartment from Supabase, re-extract structured
// fields from its title, and update the row only when the new value is
// non-null AND the column was empty before.
//
//   node enrich-existing.js
//
// Run after applying migrations/0001_enrich_apartments.sql.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { extractAll } = require('./lib/extract');

const SUPABASE_URL = 'https://ixxvfvtdomhenwqhpyqj.supabase.co';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'sb_publishable_7SWFWo2-TZLFKtWWZbLwxQ_aDbp_JNC';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ENRICHABLE = [
  'rooms', 'floor', 'total_floors',
  'area_total', 'area_living', 'area_kitchen',
  'walls', 'heating', 'year_built',
  'has_repair', 'is_secondary',
  'deal_type', 'residential_complex', 'street',
];

async function fetchAll() {
  const all = [];
  const PAGE = 500;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('apartments')
      .select('*')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
  }
  return all;
}

(async () => {
  console.log('Fetching apartments…');
  const rows = await fetchAll();
  console.log(`Loaded ${rows.length} apartments.`);

  let touched = 0;
  let skipped = 0;

  for (const row of rows) {
    const text = `${row.title || ''} ${row.normalized_title || ''}`;
    const extracted = extractAll(text);
    const update = {};

    for (const field of ENRICHABLE) {
      if (extracted[field] != null && row[field] == null) {
        update[field] = extracted[field];
      }
    }

    if (Object.keys(update).length === 0) {
      skipped++;
      continue;
    }

    const { error } = await supabase
      .from('apartments')
      .update(update)
      .eq('id', row.id);

    if (error) {
      console.log(`❌ ${row.id}:`, error.message);
      continue;
    }

    touched++;
    if (touched % 25 === 0) console.log(`  +${touched} updated…`);
  }

  console.log(`\nDone. Updated ${touched}, skipped ${skipped} of ${rows.length}.`);
})().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
