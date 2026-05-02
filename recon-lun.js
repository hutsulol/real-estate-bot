const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const TARGETS = [
  {
    name: 'flatfy-secondary-ifrankivsk',
    url: 'https://flatfy.lun.ua/uk/продаж-квартир-івано-франківськ',
  },
  {
    name: 'flatfy-novobudovy-ifrankivsk',
    url: 'https://flatfy.lun.ua/uk/новобудови-івано-франківськ',
  },
  {
    name: 'lun-novobudovy-ifrankivsk',
    url: 'https://lun.ua/uk/новобудови/івано-франківськ',
  },
];

const DUMP_DIR = 'recon-lun-dumps';

(async () => {
  if (!fs.existsSync(DUMP_DIR)) fs.mkdirSync(DUMP_DIR);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'uk-UA',
    viewport: { width: 1366, height: 900 },
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
    const bodies = new Map(); // url -> { text, len, status, method, postData }

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
      const req = resp.request();
      const entry = {
        status: resp.status(),
        method: req.method(),
        url,
        len,
        postData: req.postData() || null,
      };
      calls.push(entry);
      if (!bodies.has(url) || bodies.get(url).len < len) {
        bodies.set(url, { ...entry, text: bodyText });
      }
    });

    try {
      const nav = await page.goto(t.url, {
        timeout: 45000,
        waitUntil: 'domcontentloaded',
      });
      log(`Final URL: ${page.url()}`);
      log(`Status: ${nav?.status()}`);
      log(`Title: ${await page.title()}`);
    } catch (e) {
      log(`NAV ERROR: ${e.message}`);
    }

    // Trigger lazy loading: scroll a few times and wait
    try {
      await page.waitForTimeout(2500);
      for (let i = 0; i < 6; i++) {
        await page.mouse.wheel(0, 1500);
        await page.waitForTimeout(800);
      }
      // Final settle
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    } catch (e) {
      log(`SCROLL ERROR: ${e.message}`);
    }

    log(`\nJSON calls (${calls.length}), top 25 by size:`);
    const sorted = [...calls].sort((a, b) => b.len - a.len).slice(0, 25);
    for (const c of sorted) {
      const pd = c.postData ? ` <postLen=${c.postData.length}>` : '';
      log(`  [${c.status}] ${c.method} ${c.len}B${pd}  ${c.url}`);
    }

    // Dump full bodies of top 5 unique URLs to disk
    const topBodies = [...bodies.values()]
      .sort((a, b) => b.len - a.len)
      .slice(0, 5);
    log(`\nFull-body dumps written to ${DUMP_DIR}/:`);
    topBodies.forEach((b, i) => {
      const safe = `${t.name}__${String(i).padStart(2, '0')}__` +
        b.url
          .replace(/^https?:\/\//, '')
          .replace(/[^a-zA-Z0-9._-]/g, '_')
          .slice(0, 150);
      const jsonPath = path.join(DUMP_DIR, `${safe}.json`);
      fs.writeFileSync(jsonPath, b.text);
      if (b.postData) {
        fs.writeFileSync(path.join(DUMP_DIR, `${safe}.req.txt`), b.postData);
      }
      log(`  - ${jsonPath} (${b.len}B${b.postData ? `, postLen=${b.postData.length}` : ''})`);
    });

    log('\nResponse samples (first 600 chars of biggest unique URLs):');
    for (const b of topBodies) {
      log(`\n--- ${b.method} ${b.url}`);
      if (b.postData) log(`>>> POST body (first 400): ${b.postData.slice(0, 400)}`);
      log(b.text.slice(0, 600));
    }

    report.push(block.join('\n'));
    await page.close();
  }

  await browser.close();

  fs.writeFileSync('recon-lun-output.txt', report.join('\n\n'));
  console.log('\n\nSaved full output to recon-lun-output.txt');
  console.log(`Saved JSON dumps to ${DUMP_DIR}/`);
})();
