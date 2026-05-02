const fs = require('fs');

// читаем данные
const data = JSON.parse(fs.readFileSync('clean-data.json', 'utf-8'));
const dictionary = JSON.parse(fs.readFileSync('dictionary.json', 'utf-8'));

// =====================
// 🔍 Извлечение ЖК (умнее)
// =====================
function extractResidentialComplex(text) {
    if (!text) return null;

    const lower = text.toLowerCase();

    const match =
        lower.match(/жк\s*["«]?([a-zа-яіїє0-9\-]+)/i) ||
        lower.match(/jk\s*([a-z0-9\-]+)/i);

    if (match) return match[1];

    return null;
}

// =====================
// 🔍 Извлечение улицы (умнее)
// =====================
function extractStreet(text) {
    if (!text) return null;

    const lower = text.toLowerCase();

    const match =
        lower.match(/вул\.?\s*([a-zа-яіїє0-9\-]+)/i) ||
        lower.match(/улица\s*([a-zа-яіїє0-9\-]+)/i);

    if (match) return match[1];

    return null;
}

// =====================
// 🔄 ОБРАБОТКА
// =====================
const enrichedData = data.map(item => {
    const text = item.normalized_title;

    let residential_complex = extractResidentialComplex(text);
    let street = extractStreet(text);

    let district = null;

    // 👉 если ЖК есть в словаре
    if (residential_complex && dictionary.residential_complexes[residential_complex]) {
        const geo = dictionary.residential_complexes[residential_complex];

        district = geo.district;
        street = street || geo.street;
    }

    // 👉 если улица есть в словаре
    if (street && dictionary.streets[street]) {
        district = district || dictionary.streets[street];
    }

    // =====================
    // 🔥 САМООБУЧЕНИЕ
    // =====================

    // 👉 добавляем новый ЖК
    if (residential_complex && !dictionary.residential_complexes[residential_complex]) {
        dictionary.residential_complexes[residential_complex] = {
            district: district || null,
            street: street || null
        };

        console.log('➕ Новый ЖК найден:', residential_complex);
    }

    // 👉 добавляем новую улицу
    if (street && !dictionary.streets[street]) {
        dictionary.streets[street] = district || null;

        console.log('➕ Новая улица найдена:', street);
    }

    return {
        ...item,
        district,
        residential_complex,
        street
    };
});

// сохраняем данные
fs.writeFileSync('enriched-data.json', JSON.stringify(enrichedData, null, 2));

// сохраняем обновлённый словарь
fs.writeFileSync('dictionary.json', JSON.stringify(dictionary, null, 2));

console.log('Готово! Система самообучается 🚀');