const fs = require('fs');
const OpenAI = require('openai');

const client = new OpenAI({
    apiKey: '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'
});

// читаем данные
const data = JSON.parse(fs.readFileSync('enriched-data.json', 'utf-8'));
const dictionary = JSON.parse(fs.readFileSync('dictionary.json', 'utf-8'));

// берем только проблемные
const itemsToProcess = data.filter(item =>
    !item.district || !item.residential_complex || !item.street
).slice(0, 5);

// 🔥 функция AI
async function askAI(items) {
    const prompt = `
Ты эксперт по недвижимости в Ивано-Франковске.

Определи максимально точно:
- район (центр, пасічна, каскад, бам и т.д.)
- ЖК (если есть)
- улицу

Правила:
- анализируй смысл текста
- "центральна частина міста" → центр
- исправляй латиницу (knyaginin → княгинин)
- если есть ЖК → можно определить район
- старайся НЕ оставлять null

Ответ строго JSON массив:

[
  {
    "id": "...",
    "district": "...",
    "residential_complex": "...",
    "street": "..."
  }
]

Данные:
${JSON.stringify(items, null, 2)}
`;

    const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { role: "user", content: prompt }
        ],
        temperature: 0
    });

    let text = response.choices[0].message.content;

    // 🔥 чистим markdown ```json
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
        return JSON.parse(text);
    } catch (e) {
        console.log('❌ Ошибка парсинга:', text);
        return [];
    }
}

// 🔥 основной запуск
(async () => {
    console.log('Отправляем в OpenAI...');

    const aiResults = await askAI(itemsToProcess);

    console.log('AI RESULT:', aiResults);

    for (let aiItem of aiResults) {
        const original = data.find(d => d.id === aiItem.id);
        if (!original) continue;

        // обновляем данные
        original.district = original.district || aiItem.district;
        original.residential_complex = original.residential_complex || aiItem.residential_complex;
        original.street = original.street || aiItem.street;

        // 🔥 обновляем словарь
        if (aiItem.residential_complex && !dictionary.residential_complexes[aiItem.residential_complex]) {
            dictionary.residential_complexes[aiItem.residential_complex] = {
                district: aiItem.district || null,
                street: aiItem.street || null
            };
            console.log('➕ Новый ЖК:', aiItem.residential_complex);
        }

        if (aiItem.street && !dictionary.streets[aiItem.street]) {
            dictionary.streets[aiItem.street] = aiItem.district || null;
            console.log('➕ Новая улица:', aiItem.street);
        }
    }

    // сохраняем
    fs.writeFileSync('final-data.json', JSON.stringify(data, null, 2));
    fs.writeFileSync('dictionary.json', JSON.stringify(dictionary, null, 2));

    console.log('Готово! OpenAI обработал данные 🚀');
})();