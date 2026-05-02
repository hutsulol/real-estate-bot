require('dotenv').config();
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');
const { parseUserIntent, enrichWithHeuristic } = require('./value-agent');

const TELEGRAM_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '')
  .trim()
  .replace(/[‒–—―−]/g, '-')
  .replace(/^bot/i, '');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!TELEGRAM_TOKEN) throw new Error('Set TELEGRAM_BOT_TOKEN in .env');
if (!OPENAI_API_KEY) throw new Error('Set OPENAI_API_KEY in .env');

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const api = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://ixxvfvtdomhenwqhpyqj.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'sb_publishable_7SWFWo2-TZLFKtWWZbLwxQ_aDbp_JNC'
);

async function tg(method, params = {}) {
  const res = await fetch(`${api}/${method}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(params)
  });
  return res.json();
}

function extractRequestedCount(text) {
  const m = text.match(/(?:дай|покажи|знайди)?\s*(\d{1,2})\s*(?:варіант|вариант|оголош|объявл|квартир)/i);
  if (!m) return 5;
  return Math.min(20, Math.max(1, Number(m[1])));
}

async function findListingsByIntent(text) {
  const intent = (await parseUserIntent(text)) || {};
  const requestedCount = extractRequestedCount(text);
  const withoutOlx = /(без\s+олх|без\s+olx|exclude\s+olx)/i.test(text);
  const hasOlxHint = /(\bolx\b|олх)/i.test(text) && !withoutOlx;
  const hasLunHint = /(\blun\b|лун|ріелтор|rieltor)/i.test(text);
  const mixedHint = /(всіх джерел|всех источников|переміш|впереміш|mix|mixed)/i.test(text);
  const sourceHint = withoutOlx ? 'lun' : (mixedHint ? 'both' : (hasOlxHint && hasLunHint ? 'both' : (hasOlxHint ? 'olx' : (hasLunHint ? 'lun' : null))));
  let query = supabase.from('apartments').select('*').limit(250);

  if (intent.rooms) query = query.eq('rooms', intent.rooms);
  if (intent.district) query = query.ilike('district', `%${intent.district}%`);
  if (intent.max_price) query = query.lte('price', intent.max_price);
  if (intent.floor) query = query.eq('floor', intent.floor);
  if (intent.floor_min) query = query.gte('floor', intent.floor_min);
  if (intent.floor_max) query = query.lte('floor', intent.floor_max);
  const dealType = intent.deal_type || 'sale';
  query = query.eq('deal_type', dealType);

  const { data, error } = await query;
  if (error || !data?.length) return null;

  const ranked = enrichWithHeuristic(data);
  const onlyOlx = ranked.filter((x) => (x.link || '').includes('olx.ua'));
  const nonOlx = ranked.filter((x) => !(x.link || '').includes('olx.ua'));
  const needVerifiedFloor = !!(intent.floor || intent.floor_min || intent.floor_max);

  let selected = ranked;
  if (sourceHint === 'olx') selected = onlyOlx.length ? onlyOlx : ranked;
  else if (sourceHint === 'lun') selected = nonOlx.length ? nonOlx : ranked;
  else if (sourceHint === 'both') {
    const mixed = [];
    const a = [...nonOlx];
    const b = [...onlyOlx];
    while (a.length || b.length) {
      if (a.length) mixed.push(a.shift());
      if (b.length) mixed.push(b.shift());
      if (mixed.length >= 10) break;
    }
    selected = mixed.length ? mixed : ranked;
  }

  if (needVerifiedFloor && sourceHint !== 'olx') {
    selected = selected.filter((x) => x.floor !== null && x.floor !== undefined);
  }

  selected = selected.slice(0, requestedCount);

  return {
    text: selected.map((x, i) => `${i + 1}) ${x.title || 'Квартира'} | ${x.price} ${x.currency || ''} | ${x.rooms || '?'}к | ${x.district || 'район не вказано'}\n${x.link || ''}`).join('\n\n'),
    lunFound: nonOlx.length > 0,
    olxFound: onlyOlx.length > 0,
    sourceHint,
    requestedCount
  };
}

async function answer(text) {
  const askForListings = /(список|покажи|підбери|пропозиці|варіант|квартир|олх|olx|лун|lun|ріелтор|rieltor)/i.test(text);
  if (askForListings) {
    const result = await findListingsByIntent(text);
    if (result) {
      let prefix = 'Ось найкращі варіанти з вашої бази (без пріоритету джерела):';
      if (result.sourceHint === 'olx') prefix = result.olxFound ? 'Ось варіанти з OLX:' : 'OLX-варіанти не знайдено у вашій базі. Ось доступні зараз:';
      else if (result.sourceHint === 'lun') prefix = result.lunFound ? 'Ось варіанти з LUN:' : 'LUN-варіанти не знайдено — запустіть sync:lun. Ось доступні зараз:';
      else if (result.sourceHint === 'both') prefix = 'Ось змішаний список LUN + OLX (без пріоритету):';
      return `${prefix}\n\n${result.text}`;
    }
  }

  const system = `Ти AI-асистент з нерухомості. ВІДПОВІДАЙ ЛИШЕ УКРАЇНСЬКОЮ мовою, навіть якщо користувач пише іншою.
Правила:
- Без копіпасти і шаблонних довгих списків.
- Коротко: 2-5 речень, по суті.
- Якщо доречно, дай 1-3 конкретні критерії оцінки вигоди (ціна за м², район, ЖК, ліквідність).
- Не повторюй попередню відповідь майже дослівно.
- Якщо користувач просить список з бази, а даних немає, прямо скажи що у базі не знайдено.`;
  const r = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.3,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: text }
    ]
  });
  return r.choices?.[0]?.message?.content || 'Вибач, не вдалося сформувати відповідь.';
}

(async () => {
  let offset = 0;

  try {
    const me = await tg('getMe');
    if (!me.ok) throw new Error(JSON.stringify(me));
    console.log(`Telegram bot polling started as @${me.result.username}`);
  } catch (e) {
    console.error('Telegram init error:', e.message);
    process.exit(1);
  }
  while (true) {
    try {
      const updates = await tg('getUpdates', { timeout: 30, offset });
      for (const u of updates.result || []) {
        offset = u.update_id + 1;
        const chatId = u.message?.chat?.id;
        const text = u.message?.text;
        if (!chatId || !text) continue;
        const reply = await answer(text);
        await tg('sendMessage', { chat_id: chatId, text: reply });
      }
    } catch (e) {
      console.error('Polling error:', e.message);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
})();
