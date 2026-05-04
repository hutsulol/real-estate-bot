// Title-based field extractor.
// OLX/LUN listing cards expose only the title — this regex set teases out
// every structured fact we can without visiting the individual ad page.

function lower(s) {
  return (s || '').toLowerCase();
}

function extractRooms(text) {
  const m = lower(text).match(/(\d+)[\s-]?(?:к|кім|кімн|ком|комн|kim)/);
  return m ? Math.min(parseInt(m[1], 10), 9) : null;
}

function extractFloor(text) {
  const t = lower(text);
  // "поверх 5 з 9" / "5/9 поверх" / "5-й поверх"
  let m = t.match(/поверх\s+(\d{1,2})\s*[зs/\\]\s*(\d{1,2})/);
  if (m) return { floor: +m[1], total_floors: +m[2] };
  m = t.match(/(\d{1,2})\s*\/\s*(\d{1,2})\s*пов/);
  if (m) return { floor: +m[1], total_floors: +m[2] };
  m = t.match(/(\d{1,2})\s*[\-–]?\s*(?:й|го)?\s*пов(?:ерх|ерсі|ерсе)?/);
  if (m) return { floor: +m[1], total_floors: null };
  m = t.match(/на\s+(\d{1,2})\s+пов/);
  if (m) return { floor: +m[1], total_floors: null };
  return { floor: null, total_floors: null };
}

function extractAreas(text) {
  const t = lower(text);
  // "56 / 23 / 21 м²" → total/living/kitchen
  let m = t.match(/(\d{2,3}(?:[.,]\d)?)\s*\/\s*(\d{1,3}(?:[.,]\d)?)\s*\/\s*(\d{1,3}(?:[.,]\d)?)\s*м/);
  if (m) {
    return {
      area_total: parseFloat(m[1].replace(',', '.')),
      area_living: parseFloat(m[2].replace(',', '.')),
      area_kitchen: parseFloat(m[3].replace(',', '.')),
    };
  }
  // "56 м²" or "56м²" or "56 m2"
  m = t.match(/(\d{2,3}(?:[.,]\d)?)\s*(?:м[²2]|m2|кв)/);
  if (m) {
    return {
      area_total: parseFloat(m[1].replace(',', '.')),
      area_living: null,
      area_kitchen: null,
    };
  }
  return { area_total: null, area_living: null, area_kitchen: null };
}

function extractWalls(text) {
  const t = lower(text);
  if (/моноліт.{0,2}каркас/.test(t)) return 'моноліт-каркас';
  if (/моноліт/.test(t)) return 'моноліт';
  if (/цегл/.test(t)) return 'цегла';
  if (/кирп/.test(t)) return 'цегла';
  if (/пінобетон|піноблок/.test(t)) return 'пінобетон';
  if (/газоблок/.test(t)) return 'газоблок';
  if (/панел/.test(t)) return 'панель';
  return null;
}

function extractHeating(text) {
  const t = lower(text);
  if (/індивідуал|автоном|індив\.?\s*опал/.test(t)) return 'індивідуальне';
  if (/центральн.{0,5}опал/.test(t)) return 'центральне';
  if (/газ\s*котел|газ\b/.test(t)) return 'газ';
  if (/тверд|дров|кам.н/.test(t)) return 'тверде паливо';
  if (/електро|electr/.test(t)) return 'електричне';
  return null;
}

function extractYearBuilt(text) {
  // Avoid grabbing prices like "2 000 000". Look for explicit year-of-build cues
  // OR a 4-digit 19xx/20xx that sits next to "р." / "рік" / "рік забудови" / "рік побудови".
  const t = lower(text);
  let m = t.match(/(?:рік\s*забудови|рік\s*побудови|побудови|забудови|здано|здача)[^0-9]{0,12}(19\d{2}|20\d{2})/);
  if (m) return +m[1];
  m = t.match(/(19[5-9]\d|20[0-2]\d)\s*(?:р\.?|рік|року)/);
  if (m) return +m[1];
  return null;
}

function extractRepair(text) {
  const t = lower(text);
  // negative signals first — "під ремонт" means *needs* renovation
  if (/без\s+ремонту/.test(t)) return false;
  if (/потребує\s+ремонту/.test(t)) return false;
  if (/під\s+ремонт/.test(t)) return false;
  if (/чорнов/.test(t)) return false;
  if (/готова?\s+до\s+ремонт/.test(t)) return false;
  // positive signals — must be specific, not bare "ремонт"
  if (/євроремонт|відремонт/.test(t)) return true;
  if (/(?:свіж|якіс|сучасн|дизайнерськ|новий|новенький)[а-я]*\s+ремонт/.test(t)) return true;
  if (/з\s+ремонтом|після\s+ремонту/.test(t)) return true;
  return null;
}

function extractSecondary(text) {
  const t = lower(text);
  if (/новобудов/.test(t)) return false;
  if (/жк\s/.test(t) && /нов/.test(t)) return false;
  if (/вторин/.test(t) || /сталінк|хрущ|чешк/.test(t)) return true;
  return null;
}

function extractDealType(text) {
  const t = lower(text);
  if (/оренд|здається|здам|аренд/.test(t)) return 'rent';
  if (/продаж|продається|продам/.test(t)) return 'sale';
  return null;
}

// Existing extractors carried over from enrich-data.js
function extractResidentialComplex(text) {
  if (!text) return null;
  const m =
    lower(text).match(/жк\s*["«]?([a-zа-яіїє0-9\-]+)/i) ||
    lower(text).match(/jk\s*([a-z0-9\-]+)/i);
  return m ? m[1] : null;
}

function extractStreet(text) {
  if (!text) return null;
  const m =
    lower(text).match(/вул\.?\s*([a-zа-яіїє0-9\-]+)/i) ||
    lower(text).match(/улица\s*([a-zа-яіїє0-9\-]+)/i);
  return m ? m[1] : null;
}

// ──────────────────────────────────────────────────────────────────────────
// One-stop helper. Pass a title (or any free-text source) → get every field
// the regex set can pull. null for anything unknown.
function extractAll(text) {
  const { floor, total_floors } = extractFloor(text);
  const { area_total, area_living, area_kitchen } = extractAreas(text);
  return {
    rooms: extractRooms(text),
    floor,
    total_floors,
    area_total,
    area_living,
    area_kitchen,
    walls: extractWalls(text),
    heating: extractHeating(text),
    year_built: extractYearBuilt(text),
    has_repair: extractRepair(text),
    is_secondary: extractSecondary(text),
    deal_type: extractDealType(text),
    residential_complex: extractResidentialComplex(text),
    street: extractStreet(text),
  };
}

module.exports = {
  extractAll,
  extractRooms,
  extractFloor,
  extractAreas,
  extractWalls,
  extractHeating,
  extractYearBuilt,
  extractRepair,
  extractSecondary,
  extractDealType,
  extractResidentialComplex,
  extractStreet,
};
