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

  const scriptMatches = [...html.matchAll(/<script[^>]*type=\"application\/ld\+json\"[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1]);
  const scriptText = scriptMatches.join(' ');
  const full = `${plain} ${scriptText}`;
  const floorRaw = pick(/поверх\s*(\d+)\s*[з\/]\s*(\d+)/i, full);
  const floor = floorRaw ? Number(floorRaw) : Number(pick(/поверх\s*(\d+)/i, full));
  const floorCount = Number(pick(/поверх\s*\d+\s*[з\/]\s*(\d+)/i, full));

  const wallType = /(цеглян|панель|моноліт|блок)/i.test(full)
    ? pick(/(цеглян\w+|панель\w+|моноліт\w+|блок\w+)/i, full)
    : null;

  const heating = /(індивідуальн\w+|централ\w+|автономн\w+|газове|електро)/i.test(full)
    ? pick(/(індивідуальн\w+|централ\w+|автономн\w+|газове\s+опалення|електро\s+опалення)/i, full)
    : null;

  const supports = [];
  if (/єоселя|eоселя/i.test(full)) supports.push('єОселя');
  if (/євідновлення|eвідновлення/i.test(full)) supports.push('єВідновлення');

  const rcCandidates = [...full.matchAll(/ЖК\s*([A-Za-zА-Яа-яІіЇїЄє0-9\-\s"'`]{2,60})/gi)].map((m) => m[1].trim());
  const rc = rcCandidates.length ? [...new Set(rcCandidates)].slice(0, 2).join(' / ') : null;

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
      let html = null;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const res = await fetch(row.link, { headers: { 'user-agent': 'Mozilla/5.0' } });
        if (res.ok) { html = await res.text(); break; }
        await new Promise((r) => setTimeout(r, 300 * attempt));
      }
      if (!html) continue;
      const details = extractDetails(html);

      const payload = Object.fromEntries(Object.entries(details).filter(([, v]) => v !== null));
      if (!Object.keys(payload).length) {
        console.log(`No details parsed for ${row.id}`);
        continue;
      }

      const { error: upErr } = await supabase.from('apartments').update(payload).eq('id', row.id);
      if (!upErr) updated += 1;
    } catch {}
  }

  console.log(`Rieltor enrich updated: ${updated}`);
})();
