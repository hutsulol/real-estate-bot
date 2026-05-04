const fs = require('fs');
const { extractAll } = require('./lib/extract');

// читаем сырые данные
const rawData = JSON.parse(fs.readFileSync('data.json', 'utf-8'));

// 👉 функция очистки цены
function parsePrice(priceStr) {
    if (!priceStr) return { price: null, currency: null };

    let currency = null;

    if (priceStr.includes('грн')) currency = 'UAH';
    else if (priceStr.includes('$')) currency = 'USD';
    else if (priceStr.includes('€')) currency = 'EUR';

    // убираем всё кроме цифр и точек
    const clean = priceStr.replace(/[^\d.]/g, '');
    const price = parseFloat(clean);

    return {
        price: isNaN(price) ? null : price,
        currency
    };
}

// 👉 функция очистки title
function cleanTitle(title) {
    return title
        .toLowerCase()
        .replace(/[^\w\sа-яіїє]/gi, '')
        .trim();
}

// 👉 основная обработка
const cleanedData = rawData.map(item => {
    const { price, currency } = parsePrice(item.price);
    const extracted = extractAll(item.title);

    return {
        id: item.id,
        title: item.title,
        normalized_title: cleanTitle(item.title),
        price,
        currency: currency || 'UAH',
        link: item.link,
        // structured fields from extractAll
        rooms: extracted.rooms,
        floor: extracted.floor,
        total_floors: extracted.total_floors,
        area_total: extracted.area_total,
        area_living: extracted.area_living,
        area_kitchen: extracted.area_kitchen,
        walls: extracted.walls,
        heating: extracted.heating,
        year_built: extracted.year_built,
        has_repair: extracted.has_repair,
        is_secondary: extracted.is_secondary,
        deal_type: extracted.deal_type || item.deal_type || null,
        residential_complex: extracted.residential_complex,
        street: extracted.street,
    };
});

// сохраняем
fs.writeFileSync('clean-data.json', JSON.stringify(cleanedData, null, 2));

console.log('Готово! Данные очищены и сохранены в clean-data.json');
