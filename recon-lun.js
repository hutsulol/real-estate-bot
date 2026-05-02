const { chromium } = require('playwright');

const TARGETS = [
  {
    name: 'flatfy-secondary-ifrankivsk',
    url: 'https://flatfy.lun.ua/uk/%D0%BF%D1%80%D0%BE%D0%B4%D0%B0%D0%B6-%D0%BA%D0%B2%D0%B0%D1%80%D1%82%D0%B8%D1%80-%D1%96%D0%B2%D0%B0%D0%BD%D0%BE-%D1%84%D1%80%D0%B0%D0%BD%D0%BA%D1%96%D0%B2%D1%81%D1%8C%D0%BA',
  },
  {
    name: 'lun-novobudovy-ifrankivsk',
    url: 'https://lun.ua/uk/%D0%BD%D0%BE%D0%B2%D0%BE%D0%B1%D1%83%D0%B4%D0%BE%D0%B2%D0%B8-%D1%96%D0%B2%D0%B0%D0%BD%D0%BE-%D1%84%D1%80%D0%B0%D0%BD%D0%BA%D1%96%D0%B2%D1%81%D1%8C%D0%BA',
  },
];

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  for (const t of TARGETS) {
    console.log(`\n========== ${t.name} ==========`);
    console.log(`URL: ${t.url}`);

    const page = await context.newPage();
    const calls = [];

    page.on('response', async (resp) => {
      const url = resp.url();
      const ct = resp.headers()['content-type'] || '';
      if (!ct.includes('json')) return;
      let len = 0;
      try {
        const buf = await resp.body();
        len = buf.length;
      } catch {}
      calls.push({
        status: resp.status(),
        method: resp.request().method(),
        url,
        len,
      });
    });

    try {
      const nav = await page.goto(t.url, {
        timeout: 60000,
        waitUntil: 'networkidle',
      });
      console.log(`Final URL: ${page.url()}`);
      console.log(`Status: ${nav?.status()}`);
      console.log(`Title: ${await page.title()}`);
    } catch (e) {
      console.log('NAV ERROR:', e.message);
    }

    await page.waitForTimeout(3000);

    console.log(`\nJSON calls (${calls.length}):`);
    const sorted = calls.sort((a, b) => b.len - a.len).slice(0, 25);
    for (const c of sorted) {
      console.log(`  [${c.status}] ${c.method} ${c.len}B  ${c.url}`);
    }

    await page.close();
  }

  await browser.close();
})();
