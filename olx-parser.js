const { chromium } = require('playwright');
const fs = require('fs');

function detectDealType(title) {
  const text = title.toLowerCase();

  if (
    text.includes('оренда') ||
    text.includes('здається') ||
    text.includes('аренда')
  ) return 'rent';

  if (
    text.includes('продаж') ||
    text.includes('продається') ||
    text.includes('продам')
  ) return 'sale';

  return null;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let results = [];

  for (let p = 1; p <= 5; p++) {
    console.log(`Парсим страницу ${p}`);

    await page.goto(`https://www.olx.ua/uk/nedvizhimost/kvartiry/ivano-frankovsk/?page=${p}`, {
      timeout: 60000
    });

    const items = await page.$$eval('[data-cy="l-card"]', cards =>
      cards.map(card => {
        const title = card.querySelector('h6')?.innerText || '';
        const price = card.querySelector('[data-testid="ad-price"]')?.innerText || '';
        const link = card.querySelector('a')?.href || '';

        return { title, price, link };
      })
    );

    results.push(...items);

    // 🔥 задержка (важно)
    await new Promise(r => setTimeout(r, 1500));
  }

  const cleaned = results.map(item => {
    const price = parseFloat(
      item.price.replace(/\s/g, '').replace(/[^\d.]/g, '')
    );

    const idMatch = item.link.match(/ID(\w+)\.html/);

    return {
      id: idMatch ? idMatch[1] : null,
      title: item.title,
      price: price || null,
      currency: 'UAH',
      link: item.link,
      deal_type: detectDealType(item.title)
    };
  });

  fs.writeFileSync('data.json', JSON.stringify(cleaned, null, 2));

  console.log('✅ Готово, сохранено в data.json');

  await browser.close();
})();