const fs = require('fs');

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

// 👉 функция определения количества комнат
function parseRooms(title) {
    if (!title) return null;

    const match = title.match(/(\d+)[-\s]?(к|кім|ком)/i);
    if (match) return parseInt(match[1]);

    return null;
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
    const rooms = parseRooms(item.title);

    return {
        id: item.id,
        title: item.title,
        normalized_title: cleanTitle(item.title),
        price,
        currency,
        rooms,
        link: item.link
    };
});

// сохраняем
fs.writeFileSync('clean-data.json', JSON.stringify(cleanedData, null, 2));

console.log('Готово! Данные очищены и сохранены в clean-data.json');