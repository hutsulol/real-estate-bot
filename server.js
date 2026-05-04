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
Ты парсер недвижимости.

Верни JSON:

{
  "rooms": number | null,
  "district": string | null,
  "max_price": number | null,
  "deal_type": "rent" | "sale" | null
}

Примеры:

"зняти 2к центр" →
{"rooms":2,"district":"центр","max_price":null,"deal_type":"rent"}

"купити квартиру центр" →
{"rooms":null,"district":"центр","max_price":null,"deal_type":"sale"}

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

// =======================
// 🔍 Поиск
// =======================
app.get('/search', async (req, res) => {
  try {
    const query = req.query.q;

    if (!query) {
      return res.json([]);
    }

    const filters = await parseQuery(query);
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
    
    const { data, error } = await dbQuery.limit(50);

    if (error) {
      console.log("❌ Supabase error:", error);
      res.set('Access-Control-Expose-Headers', 'X-Parsed-Filters');
      res.set('X-Parsed-Filters', JSON.stringify(filters));
      return res.json([]);
    }

    // 🔥 удаляем дубликаты
    let clean = deduplicate(data);

    // 🔥 считаем выгодность
    clean = addDealScore(clean);

    // 🔥 сортируем
    clean.sort((a, b) => {
      if (a.deal === '🔥 выгодно') return -1;
      if (b.deal === '🔥 выгодно') return 1;
      return a.price - b.price;
    });

    // Експонуємо розпізнані фільтри для фронта (debug у чаті)
    res.set('Access-Control-Expose-Headers', 'X-Parsed-Filters');
    res.set('X-Parsed-Filters', JSON.stringify(filters));
    res.json(clean.slice(0, 20));

  } catch (err) {
    console.log("❌ Server error:", err);
    res.json([]);
  }
});

// =======================
// 📋 Список (без AI-фильтра)
// =======================
app.get('/listings', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 200);
    let dbQuery = supabase.from('apartments').select('*').limit(limit);

    if (req.query.rooms) dbQuery = dbQuery.eq('rooms', Number(req.query.rooms));
    if (req.query.district) dbQuery = dbQuery.ilike('district', `%${req.query.district}%`);
    if (req.query.max_price) dbQuery = dbQuery.lte('price', Number(req.query.max_price));
    if (req.query.deal_type) dbQuery = dbQuery.eq('deal_type', req.query.deal_type);

    const { data, error } = await dbQuery;
    if (error) {
      console.log('❌ Supabase error:', error);
      return res.json([]);
    }

    let clean = deduplicate(data);
    clean = addDealScore(clean);
    clean.sort((a, b) => a.price - b.price);
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