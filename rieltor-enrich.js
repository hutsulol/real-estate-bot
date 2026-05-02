require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://ixxvfvtdomhenwqhpyqj.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_7SWFWo2-TZLFKtWWZbLwxQ_aDbp_JNC'
);

const LIMIT = Number(process.env.RIELTOR_ENRICH_LIMIT || 100);

function pick(re, text) {
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

function extractDetails(html) {
  const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

  const floorRaw = pick(/поверх\s*(\d+)\s*[з\/]\s*(\d+)/i, plain);
  const floor = floorRaw ? Number(floorRaw) : Number(pick(/поверх\s*(\d+)/i, plain));
  const floorCount = Number(pick(/поверх\s*\d+\s*[з\/]\s*(\d+)/i, plain));

  const wallType = /(цеглян|панель|моноліт|блок)/i.test(plain)
    ? pick(/(цеглян\w+|панель\w+|моноліт\w+|блок\w+)/i, plain)
    : null;

  const heating = /(індивідуальн\w+|централ\w+|автономн\w+)/i.test(plain)
    ? pick(/(індивідуальн\w+|централ\w+|автономн\w+)/i, plain)
    : null;

  const supports = [];
  if (/єоселя|eоселя/i.test(plain)) supports.push('єОселя');
  if (/євідновлення|eвідновлення/i.test(plain)) supports.push('єВідновлення');

  const rc = pick(/ЖК\s*([A-Za-zА-Яа-яІіЇїЄє0-9\-\s"'`]+)/i, plain);

  return {
    floor: Number.isFinite(floor) ? floor : null,
    floor_count: Number.isFinite(floorCount) ? floorCount : null,
    wall_type: wallType || null,
    heating_system: heating || null,
    support_programs: supports.length ? supports.join(', ') : null,
    residential_complex: rc || null,
  };
}

(async () => {
  const { data, error } = await supabase
    .from('apartments')
    .select('id,link')
    .eq('source', 'rieltor')
    .or('floor.is.null,floor_count.is.null,wall_type.is.null,heating_system.is.null,residential_complex.is.null')
    .limit(LIMIT);

  if (error) throw error;
  console.log(`Rieltor enrich: ${data.length} records`);

  let updated = 0;
  for (const row of data) {
    try {
      const res = await fetch(row.link, { headers: { 'user-agent': 'Mozilla/5.0' } });
      if (!res.ok) continue;
      const html = await res.text();
      const details = extractDetails(html);

      const payload = Object.fromEntries(Object.entries(details).filter(([, v]) => v !== null));
      if (!Object.keys(payload).length) continue;

      const { error: upErr } = await supabase.from('apartments').update(payload).eq('id', row.id);
      if (!upErr) updated += 1;
    } catch {}
  }

  console.log(`Rieltor enrich updated: ${updated}`);
})();
