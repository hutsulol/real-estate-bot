require('dotenv').config();
const OpenAI = require('openai');

const TELEGRAM_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '')
  .trim()
  .replace(/[‒–—―−]/g, '-')
  .replace(/^bot/i, '');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!TELEGRAM_TOKEN) throw new Error('Set TELEGRAM_BOT_TOKEN in .env');
if (!OPENAI_API_KEY) throw new Error('Set OPENAI_API_KEY in .env');

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const api = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

async function tg(method, params = {}) {
  const res = await fetch(`${api}/${method}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(params)
  });
  return res.json();
}

async function answer(text) {
  const prompt = `Ты AI-агент по недвижимости в Ивано-Франковске. Объясняй, как оценивать выгоду квартиры: цена за м², район, ЖК, ликвидность. Коротко и по делу. Вопрос: ${text}`;
  const r = await openai.chat.completions.create({ model: 'gpt-4o-mini', temperature: 0.2, messages: [{ role: 'user', content: prompt }] });
  return r.choices?.[0]?.message?.content || 'Не удалось сгенерировать ответ.';
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
