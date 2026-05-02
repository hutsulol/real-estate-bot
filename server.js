require('dotenv').config();

const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');
const { enrichWithHeuristic, parseUserIntent } = require('./value-agent');

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
Ты парсер недвижимости.

Верни JSON:

{
  "rooms": number | null,
  "district": string | null,
  "max_price": number | null,
  "deal_type": "rent" | "sale" | null,
  "source": "olx" | "rieltor" | "all" | null
}

Примеры:

"зняти 2к центр" →
{"rooms":2,"district":"центр","max_price":null,"deal_type":"rent","source":"all"}

"купити квартиру центр" →
{"rooms":null,"district":"центр","max_price":null,"deal_type":"sale","source":"all"}

Запрос:
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

    if (!exists) {
      unique.push(item);
    }
  }

  return unique;
}

// =======================
// 💰 Оценка выгодности
// =======================
function addDealScore(list) {
  const avg =
    list.reduce((sum, i) => sum + i.price, 0) / (list.length || 1);

  return list.map(item => {
    let score = 'нормально';

    if (item.price < avg * 0.85) score = '🔥 выгодно';
    else if (item.price > avg * 1.15) score = 'дорого';

    return {
      ...item,
      deal: score
    };
  });
}


function detectSource(item) {
  if (item.source) return item.source;
  const link = item.link || '';
  if (link.includes('olx.ua')) return 'olx';
  if (link.includes('rieltor.ua')) return 'rieltor';
  return 'unknown';
}

function mixSources(list, maxItems = 20) {
  const olx = list.filter((x) => (x.link || '').includes('olx.ua'));
  const other = list.filter((x) => !(x.link || '').includes('olx.ua'));
  const mixed = [];

  while ((olx.length || other.length) && mixed.length < maxItems) {
    if (other.length) mixed.push(other.shift());
    if (olx.length && mixed.length < maxItems) mixed.push(olx.shift());
  }

  return mixed.length ? mixed : list.slice(0, maxItems);
}

// =======================
// 🔍 Поиск
// =======================
app.get('/search', async (req, res) => {
  try {
    const query = req.query.q;
    const sourceParam = req.query.source;

    if (!query) {
      return res.json([]);
    }

    const aiFilters = await parseUserIntent(query);
    const filters = aiFilters || await parseQuery(query);
    console.log("Фильтры:", filters);

    let dbQuery = supabase.from('apartments').select('*');

    if (filters.rooms) {
      dbQuery = dbQuery.eq('rooms', filters.rooms);
    }

    if (filters.district) {
      dbQuery = dbQuery.ilike('district', `%${filters.district}%`);
    }

    if (filters.max_price) {
      dbQuery = dbQuery.lte('price', filters.max_price);
    }

    if (filters.deal_type) {
      dbQuery = dbQuery.eq('deal_type', filters.deal_type);
    }

    const effectiveSource = sourceParam || filters.source;
    if (effectiveSource && effectiveSource !== 'all') {
      if (effectiveSource === 'olx') dbQuery = dbQuery.ilike('link', '%olx.ua%');
      if (effectiveSource === 'rieltor' || effectiveSource === 'rieltor.ua') dbQuery = dbQuery.ilike('link', '%rieltor.ua%');
    }

    const { data, error } = await dbQuery.limit(300);

    if (error) {
      console.log("❌ Supabase error:", error);
      return res.json([]);
    }

    // 🔥 удаляем дубликаты
    let clean = deduplicate(data);

    // AI-ранжирование + выгодность
    clean = enrichWithHeuristic(clean);
    clean = addDealScore(clean);

    const wantsMixedSources = /(всіх джерел|всех источников|переміш|впереміш|mix|mixed)/i.test(query);
    const finalList = wantsMixedSources ? mixSources(clean, 20) : clean.slice(0, 20);

    res.json(finalList.map((x) => ({
      ...x,
      source: detectSource(x),
      details: {
        floor: x.floor ?? null,
        floor_count: x.floor_count ?? null,
        wall_type: x.wall_type ?? null,
        heating_system: x.heating_system ?? null,
        support_programs: x.support_programs ?? null,
      }
    })));

  } catch (err) {
    console.log("❌ Server error:", err);
    res.json([]);
  }
});

// =======================
// 🚀 Запуск
// =======================
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});