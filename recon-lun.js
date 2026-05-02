const { chromium } = require('playwright');
const fs = require('fs');

const TARGETS = [
  {
    name: 'flatfy-secondary-ifrankivsk',
    url: 'https://flatfy.lun.ua/uk/продаж-квартир-івано-франківськ',
  },
  {
    name: 'lun-novobudovy-ifrankivsk',
    url: 'https://lun.ua/uk/новобудови-івано-франківськ',
  },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const report = [];

  for (const t of TARGETS) {
    const block = [];
    const log = (s) => {
      console.log(s);
      block.push(s);
    };

    log(`\n========== ${t.name} ==========`);
    log(`URL: ${t.url}`);

    const page = await context.newPage();
    const calls = [];
    const samples = {};

    page.on('response', async (resp) => {
      const url = resp.url();
      const ct = resp.headers()['content-type'] || '';
      if (!ct.includes('json')) return;
      let len = 0;
      let bodyText = '';
      try {
        const buf = await resp.body();
        len = buf.length;
        bodyText = buf.toString('utf-8');
      } catch {}
      const entry = {
        status: resp.status(),
        method: resp.request().method(),
        url,
        len,
      };
      calls.push(entry);
      // keep first 600 chars of biggest payloads
      if (len > 1000 && !samples[url]) {
        samples[url] = bodyText.slice(0, 600);
      }
    });

    try {
      const nav = await page.goto(t.url, {
        timeout: 60000,
        waitUntil: 'networkidle',
      });
      log(`Final URL: ${page.url()}`);
      log(`Status: ${nav?.status()}`);
      log(`Title: ${await page.title()}`);
    } catch (e) {
      log(`NAV ERROR: ${e.message}`);
    }

    await page.waitForTimeout(3000);

    log(`\nJSON calls (${calls.length}), top 25 by size:`);
    const sorted = [...calls].sort((a, b) => b.len - a.len).slice(0, 25);
    for (const c of sorted) {
      log(`  [${c.status}] ${c.method} ${c.len}B  ${c.url}`);
    }

    log('\nResponse samples (first 600 chars of biggest unique URLs):');
    for (const [url, body] of Object.entries(samples).slice(0, 5)) {
      log(`\n--- ${url}`);
      log(body);
    }

    report.push(block.join('\n'));
    await page.close();
  }

  await browser.close();

  fs.writeFileSync('recon-lun-output.txt', report.join('\n\n'));
  console.log('\n\nSaved full output to recon-lun-output.txt');
})();
