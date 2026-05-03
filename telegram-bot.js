require('dotenv').config();
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');
const { parseUserIntent, enrichWithHeuristic } = require('./value-agent');
const { appendMemory, getRecentMemory, vaultRoot, handleLearningInstruction, listBranches, getActiveBranchName, searchVaultForJK, readVaultNote, getHeatingNoteFromVault } = require('./obsidian-memory');
const { detectHeatingRequest, detectComplexRequest, inferListingComplexAndHeating } = require('./complex-heating');

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


function detectListMode(text, intent = {}) {
  if (/(найгірш|гірш|worst|дешев(ий|і)\s*по\s*якості|переоцінен)/i.test(text)) return 'worst';
  if (/(найкращ|топ|best|вигідн|інвест)/i.test(text)) return 'best';
  if (intent.priority === 'investment') return 'best';
  return 'best';
}

async function findListingsByIntent(text) {
  const intent = (await parseUserIntent(text)) || {};
  const listMode = detectListMode(text, intent);
  const requestedCount = extractRequestedCount(text);
  const requestedHeating = detectHeatingRequest(text);
  const requestedComplex = detectComplexRequest(text);
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

  if (requestedComplex || requestedHeating) {
    selected = selected.filter((x) => {
      const inferred = inferListingComplexAndHeating(x);
      if (requestedComplex && inferred.complex !== requestedComplex.name) return false;
      if (requestedHeating && inferred.heating !== requestedHeating) return false;
      return true;
    });
    if (!selected.length) {
      const filterDesc = [
        requestedComplex ? `ЖК: ${requestedComplex.name}` : null,
        requestedHeating ? `опалення: ${requestedHeating}` : null,
      ].filter(Boolean).join(', ');
      return {
        text: `У базі не знайдено квартир з фільтром: ${filterDesc}.\nМожливо, оголошення ще не додані або тип опалення не розпізнано в описах.`,
        emptyFilter: true,
        lunFound: false,
        olxFound: false,
        sourceHint,
        requestedCount,
        intent,
        listMode,
        requestedHeating,
        requestedComplex: requestedComplex?.name || null,
      };
    }
  }

  selected = (listMode === 'worst' ? [...selected].reverse() : selected).slice(0, requestedCount);

  return {
    text: selected.map((x, i) => `${i + 1}) ${x.title || 'Квартира'} | ${x.price} ${x.currency || ''} | ${x.rooms || '?'}к | ${(inferListingComplexAndHeating(x).complex || x.district || 'район не вказано')} | опалення: ${inferListingComplexAndHeating(x).heating || 'не вказано'}\n${x.link || ''}`).join('\n\n'),
    lunFound: nonOlx.length > 0,
    olxFound: onlyOlx.length > 0,
    sourceHint,
    requestedCount,
    intent,
    listMode,
    requestedHeating,
    requestedComplex: requestedComplex?.name || null
  };
}


const lastAssistantReplyByChat = new Map();

function isBranchListQuery(text) {
  return /(які\s+.*гілк|какие\s+.*ветк|list\s+branches|show\s+branches)/i.test(String(text || ''));
}


function shouldReturnListings(text) {
  const t = String(text || '').toLowerCase();
  const explicitListIntent = /(покажи|підбери|подбери|знайди|find|search|дай)/i.test(t)
    && /(варіант|вариант|оголош|объявл|квартир|listing|пропозиц)/i.test(t);

  const reflectiveIntent = /(поясни|обґрунтуй|обоснуй|чому|почему|напиши|розпиши|стратег|фактор|ризик|конкуренц|ліквідн|окупн)/i.test(t);
  if (reflectiveIntent && !explicitListIntent) return false;

  if (explicitListIntent) return true;

  // Короткий запит тільки з типом опалення (фільтр-уточнення)
  const heatingOnly = detectHeatingRequest(t) !== null && t.trim().length <= 60
    && !/(розкажи|поясни|що таке|опиши|як працює)/i.test(t);
  return heatingOnly;
}

async function answer(text, chatId = 'default') {
  const learningAck = handleLearningInstruction(text, lastAssistantReplyByChat.get(String(chatId)) || '');
  if (learningAck) {
    appendMemory({ userText: text, replyText: learningAck, intent: null, listMode: 'learning' });
    const out = `${learningAck} Тепер використаю це у наступних відповідях.`;
    lastAssistantReplyByChat.set(String(chatId), out);
    return out;
  }

  if (isBranchListQuery(text)) {
    const branches = listBranches();
    const active = getActiveBranchName();
    const reply = branches.length
      ? `Гілки пам'яті:
- ${branches.join('\n- ')}\n\nАктивна: ${active}`
      : 'Гілок поки немає.';
    appendMemory({ userText: text, replyText: reply, intent: null, listMode: 'memory_query' });
    lastAssistantReplyByChat.set(String(chatId), reply);
    return reply;
  }

  const askForListings = shouldReturnListings(text);
  if (askForListings) {
    const result = await findListingsByIntent(text);
    if (result) {
      if (result.emptyFilter) {
        appendMemory({ userText: text, replyText: result.text, intent: result.intent, listMode: 'filter_empty' });
        lastAssistantReplyByChat.set(String(chatId), result.text);
        return result.text;
      }
      let prefix = result.listMode === 'worst'
        ? 'Ось найгірші (найменш вигідні) варіанти з вашої бази:'
        : 'Ось найкращі варіанти з вашої бази (без пріоритету джерела):';
      if (result.sourceHint === 'olx') prefix = result.olxFound ? 'Ось варіанти з OLX:' : 'OLX-варіанти не знайдено у вашій базі. Ось доступні зараз:';
      else if (result.sourceHint === 'lun') prefix = result.lunFound ? 'Ось варіанти з LUN:' : 'LUN-варіанти не знайдено — запустіть sync:lun. Ось доступні зараз:';
      else if (result.sourceHint === 'both') prefix = 'Ось змішаний список LUN + OLX (без пріоритету):';
      const filterLine = [result.requestedComplex ? `ЖК: ${result.requestedComplex}` : null, result.requestedHeating ? `Опалення: ${result.requestedHeating}` : null].filter(Boolean).join(' | ');
      const responseText = `${prefix}${filterLine ? `\nФільтр: ${filterLine}` : ''}\n\n${result.text}`;
      appendMemory({ userText: text, replyText: responseText, intent: result.intent, listMode: result.listMode });
      lastAssistantReplyByChat.set(String(chatId), responseText);
      return responseText;
    }
  }

  const system = `Ти AI-асистент з нерухомості. ВІДПОВІДАЙ ЛИШЕ УКРАЇНСЬКОЮ мовою, навіть якщо користувач пише іншою.
Правила:
- Без копіпасти і шаблонних довгих списків.
- Коротко: 2-5 речень, по суті.
- Якщо доречно, дай 1-3 конкретні критерії оцінки вигоди (ціна за м², район, ЖК, ліквідність).
- Не повторюй попередню відповідь майже дослівно.
- Якщо користувач просить список з бази, а даних немає, прямо скажи що у базі не знайдено.
- Якщо користувач просить аналітику/фактори/стратегію, НЕ повертай список оголошень, дай міркування та критерії рішення.
- Якщо в контексті є дані з Obsidian-нотаток — використовуй їх як достовірне першоджерело.`;

  // Збираємо контекст з Obsidian vault
  const vaultContextParts = [];

  // 1. Якщо питання про конкретний ЖК — шукаємо в vault
  const complexMatch = detectComplexRequest(text);
  if (complexMatch) {
    const hits = searchVaultForJK(complexMatch.name.replace('ЖК ', ''));
    if (hits.length) {
      vaultContextParts.push(`Дані з Obsidian про ${complexMatch.name}:\n${hits.map((h) => h.excerpt).join('\n---\n')}`);
    }
  }

  // 2. Якщо явно просять інфу з обсідіану — читаємо heating-файл або шукаємо по тексту
  const wantsObsidian = /(обсідіан|obsidian|нотатк|з\s+бази\s+знань|яку\s+я\s+задав)/i.test(text);
  if (wantsObsidian && !vaultContextParts.length) {
    const heatingNote = getHeatingNoteFromVault();
    if (heatingNote) {
      vaultContextParts.push(`Файл Obsidian «${heatingNote.file}»:\n${heatingNote.content.slice(0, 3000)}`);
    } else {
      // шукаємо по будь-яким ключовим словам з тексту
      const words = text.replace(/[^а-яіїєґa-z0-9\s]/gi, ' ').split(/\s+/).filter((w) => w.length > 3);
      for (const w of words.slice(0, 3)) {
        const hits = searchVaultForJK(w);
        if (hits.length) { vaultContextParts.push(hits.map((h) => `[${h.file}]\n${h.excerpt}`).join('\n')); break; }
      }
    }
  }

  // 3. Питання про опалення взагалі — підкидаємо heating-нотатку
  const heatingInQuery = /(опаленн|котельн|котел|heating)/i.test(text);
  if (heatingInQuery && !vaultContextParts.length) {
    const heatingNote = getHeatingNoteFromVault();
    if (heatingNote) vaultContextParts.push(`Файл Obsidian «${heatingNote.file}»:\n${heatingNote.content.slice(0, 3000)}`);
  }

  const memory = getRecentMemory(4);
  const r = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.3,
    messages: [
      { role: 'system', content: system },
      ...(memory ? [{ role: 'system', content: `Пам'ять агента (Obsidian нотатки, стисло):\n${memory}` }] : []),
      ...(vaultContextParts.length ? [{ role: 'system', content: `Контекст з Obsidian vault:\n${vaultContextParts.join('\n\n')}` }] : []),
      { role: 'user', content: text }
    ]
  });
  const reply = r.choices?.[0]?.message?.content || 'Вибач, не вдалося сформувати відповідь.';
  appendMemory({ userText: text, replyText: reply, intent: null, listMode: 'dialog' });
  lastAssistantReplyByChat.set(String(chatId), reply);
  return reply;
}

(async () => {
  let offset = 0;

  try {
    const me = await tg('getMe');
    if (!me.ok) throw new Error(JSON.stringify(me));
    console.log(`Telegram bot polling started as @${me.result.username}`);
    console.log(`Obsidian memory vault: ${vaultRoot}`);
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
        const reply = await answer(text, chatId);
        await tg('sendMessage', { chat_id: chatId, text: reply });
      }
    } catch (e) {
      console.error('Polling error:', e.message);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
})();
