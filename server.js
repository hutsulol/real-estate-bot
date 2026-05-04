require('dotenv').config();

const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// 🔑 OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 🗄 Supabase
const supabase = createClient(
  'https://ixxvfvtdomhenwqhpyqj.supabase.co',
  'sb_publishable_7SWFWo2-TZLFKtWWZbLwxQ_aDbp_JNC'
);

// =======================
// 🤖 AI парсинг запроса
// =======================
async function parseQuery(query) {
  const prompt = `
Ти парсер запитів про нерухомість в Івано-Франківську.

Поверни СТРОГО JSON, без коментарів:

{
  "rooms": number | null,                       // 1, 2, 3, 4
  "district": string | null,                    // "центр", "каскад", "пасічна", "бам", "софіївка", "княгинин"…
  "max_price": number | null,                   // у тій же валюті, що і запит
  "currency": "UAH" | "USD" | "EUR" | null,
  "deal_type": "rent" | "sale" | null,
  "floor_min": number | null,                   // "від 4 поверху"
  "floor_max": number | null,                   // "до 9 поверху"
  "floor_eq": number | null,                    // "на 5 поверсі"
  "area_min": number | null,                    // м²
  "area_max": number | null,
  "year_from": number | null,                   // рік забудови ≥ X
  "heating": string | null,                     // "індивідуальне", "газ", "центральне"
  "walls": string | null,                       // "цегла", "моноліт"
  "has_repair": boolean | null,                 // true/false
  "is_secondary": boolean | null,               // true=вторинка, false=новобудова
  "complex": string | null                      // ЖК
}

Правила:
- Якщо в запиті "5 поверх" / "на п'ятому поверсі" → floor_eq=5.
- "від 4 поверху" → floor_min=4. "до 9" → floor_max=9. "4-9 поверх" → floor_min=4, floor_max=9.
- "не перший і не останній" → floor_min=2 (без floor_max).
- "новобудова" → is_secondary=false. "вторинка" → is_secondary=true.
- "з ремонтом" → has_repair=true. "без ремонту" → has_repair=false.
- Не вгадуй те, чого немає у запиті — null.
- Без markdown, тільки JSON.

Приклади:

"зняти 2к центр, 5 поверх" →
{"rooms":2,"district":"центр","max_price":null,"currency":null,"deal_type":"rent","floor_min":null,"floor_max":null,"floor_eq":5,"area_min":null,"area_max":null,"year_from":null,"heating":null,"walls":null,"has_repair":null,"is_secondary":null,"complex":null}

"купити 3к каскад до 70000 usd, від 2018, з ремонтом" →
{"rooms":3,"district":"каскад","max_price":70000,"currency":"USD","deal_type":"sale","floor_min":null,"floor_max":null,"floor_eq":null,"area_min":null,"area_max":null,"year_from":2018,"heating":null,"walls":null,"has_repair":true,"is_secondary":null,"complex":null}

"квартири на 5 поверсі" →
{"rooms":null,"district":null,"max_price":null,"currency":null,"deal_type":null,"floor_min":null,"floor_max":null,"floor_eq":5,"area_min":null,"area_max":null,"year_from":null,"heating":null,"walls":null,"has_repair":null,"is_secondary":null,"complex":null}

Запит:
${query}
`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0
  });

  let text = res.choices[0].message.content;
  text = text.replace(/```json/g, '').replace(/```/g, '').trim();

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

// =======================
// 🔧 Загальний білдер запиту до Supabase
// =======================
function applyFilters(dbQuery, f) {
  if (f.rooms != null) dbQuery = dbQuery.eq('rooms', f.rooms);
  if (f.district) dbQuery = dbQuery.ilike('district', `%${f.district}%`);
  if (f.complex) dbQuery = dbQuery.ilike('residential_complex', `%${f.complex}%`);
  if (f.max_price != null) dbQuery = dbQuery.lte('price', f.max_price);
  if (f.deal_type) dbQuery = dbQuery.eq('deal_type', f.deal_type);

  if (f.floor_eq != null) dbQuery = dbQuery.eq('floor', f.floor_eq);
  if (f.floor_min != null) dbQuery = dbQuery.gte('floor', f.floor_min);
  if (f.floor_max != null) dbQuery = dbQuery.lte('floor', f.floor_max);

  if (f.area_min != null) dbQuery = dbQuery.gte('area_total', f.area_min);
  if (f.area_max != null) dbQuery = dbQuery.lte('area_total', f.area_max);

  if (f.year_from != null) dbQuery = dbQuery.gte('year_built', f.year_from);

  if (f.heating) dbQuery = dbQuery.ilike('heating', `%${f.heating}%`);
  if (f.walls) dbQuery = dbQuery.ilike('walls', `%${f.walls}%`);
  if (f.has_repair != null) dbQuery = dbQuery.eq('has_repair', f.has_repair);
  if (f.is_secondary != null) dbQuery = dbQuery.eq('is_secondary', f.is_secondary);

  if (f.source) dbQuery = dbQuery.eq('source', f.source);

  return dbQuery;
}

// =======================
// ❌ Удаление дубликатов
// =======================
function deduplicate(list) {
  const unique = [];
  for (let item of list) {
    const exists = unique.find(u => {
      const sameRooms = u.rooms === item.rooms;
      const priceClose = Math.abs(u.price - item.price) < u.price * 0.05;
      const sameLocation =
        (u.street && u.street === item.street) ||
        (u.residential_complex && u.residential_complex === item.residential_complex);
      return sameRooms && priceClose && sameLocation;
    });
    if (!exists) unique.push(item);
  }
  return unique;
}

// =======================
// 💰 Оценка выгодности
// =======================
function addDealScore(list) {
  const avg = list.reduce((sum, i) => sum + (i.price || 0), 0) / (list.length || 1);
  return list.map(item => {
    let score = 'нормально';
    if (item.price < avg * 0.85) score = '🔥 выгодно';
    else if (item.price > avg * 1.15) score = 'дорого';
    return { ...item, deal: score };
  });
}

// =======================
// 🔍 Поиск (з AI парсингом запиту)
// =======================
app.get('/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) return res.json([]);

    const filters = await parseQuery(query);
    console.log('Фільтри:', filters);

    let dbQuery = supabase.from('apartments').select('*');
    dbQuery = applyFilters(dbQuery, filters);

    const { data, error } = await dbQuery.limit(50);

    res.set('Access-Control-Expose-Headers', 'X-Parsed-Filters');
    res.set('X-Parsed-Filters', JSON.stringify(filters));

    if (error) {
      console.log('❌ Supabase error:', error);
      return res.json([]);
    }

    let clean = deduplicate(data);
    clean = addDealScore(clean);
    clean.sort((a, b) => {
      if (a.deal === '🔥 выгодно') return -1;
      if (b.deal === '🔥 выгодно') return 1;
      return (a.price || 0) - (b.price || 0);
    });
    res.json(clean.slice(0, 20));
  } catch (err) {
    console.log('❌ Server error:', err);
    res.json([]);
  }
});

// =======================
// 📋 Список (явні фільтри з querystring, без AI)
// =======================
app.get('/listings', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 200);

    const filters = {
      rooms: req.query.rooms ? Number(req.query.rooms) : null,
      district: req.query.district || null,
      max_price: req.query.max_price ? Number(req.query.max_price) : null,
      deal_type: req.query.deal_type || null,
      floor_eq: req.query.floor ? Number(req.query.floor) : null,
      floor_min: req.query.floor_min ? Number(req.query.floor_min) : null,
      floor_max: req.query.floor_max ? Number(req.query.floor_max) : null,
      area_min: req.query.area_min ? Number(req.query.area_min) : null,
      area_max: req.query.area_max ? Number(req.query.area_max) : null,
      year_from: req.query.year_from ? Number(req.query.year_from) : null,
      heating: req.query.heating || null,
      walls: req.query.walls || null,
      has_repair: req.query.has_repair == null ? null : req.query.has_repair === 'true',
      is_secondary: req.query.is_secondary == null ? null : req.query.is_secondary === 'true',
      source: req.query.source || null,
      complex: req.query.complex || null,
    };

    let dbQuery = supabase.from('apartments').select('*').limit(limit);
    dbQuery = applyFilters(dbQuery, filters);

    const { data, error } = await dbQuery;
    if (error) {
      console.log('❌ Supabase error:', error);
      return res.json([]);
    }

    let clean = deduplicate(data);
    clean = addDealScore(clean);
    clean.sort((a, b) => (a.price || 0) - (b.price || 0));
    res.json(clean);
  } catch (err) {
    console.log('❌ Server error:', err);
    res.json([]);
  }
});

// =======================
// ❤️ Healthcheck
// =======================
app.get('/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// =======================
// 🚀 Запуск
// =======================
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
