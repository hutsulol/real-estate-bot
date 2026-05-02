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
  const system = `Ти AI-асистент з нерухомості. ВІДПОВІДАЙ ЛИШЕ УКРАЇНСЬКОЮ мовою, навіть якщо користувач пише іншою.
Правила:
- Без копіпасти і шаблонних довгих списків.
- Коротко: 2-5 речень, по суті.
- Якщо доречно, дай 1-3 конкретні критерії оцінки вигоди (ціна за м², район, ЖК, ліквідність).
- Не повторюй попередню відповідь майже дослівно.`;
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
