require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

const supabase = createClient(
    'https://ixxvfvtdomhenwqhpyqj.supabase.co',
    'sb_publishable_7SWFWo2-TZLFKtWWZbLwxQ_aDbp_JNC'
);

const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY
});

async function parseQuery(query) {
    const prompt = `
Разбери запрос пользователя для поиска недвижимости.

Верни JSON:

{
  "rooms": number | null,
  "district": string | null,
  "max_price": number | null
}

Пример:
"2к квартира центр до 50000" →
{
  "rooms": 2,
  "district": "центр",
  "max_price": 50000
}

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

    return JSON.parse(text);
}

async function search(query) {
    const filters = await parseQuery(query);

    console.log('Фильтры:', filters);

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

    const { data, error } = await dbQuery.limit(10);

    if (error) {
        console.log(error);
        return;
    }

    console.log('Результаты:');
    console.log(data);
}

// тест
search("2к квартира центр до 50000");