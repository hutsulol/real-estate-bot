const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const TARGETS = [
  {
    name: 'lun-sale-if-flats',
    url: 'https://lun.ua/sale/if/flats',
    paginate: true,
  },
  {
    name: 'lun-sale-if-flats-page2',
    url: 'https://lun.ua/sale/if/flats?page=2',
  },
  {
    name: 'flatfy-secondary-ifrankivsk',
    url: 'https://flatfy.lun.ua/uk/продаж-квартир-івано-франківськ',
  },
  {
    name: 'lun-novobudovy-ifrankivsk',
    url: 'https://lun.ua/uk/новобудови-івано-франківськ',
  },
];

const DUMP_DIR = 'recon-lun-dumps';

function safeName(target, suffix) {
  return `${target.name}__${suffix}`.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180);
}

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
    const bodies = new Map();

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

    // Trigger lazy loading
    try {
      await page.waitForTimeout(2500);
      for (let i = 0; i < 8; i++) {
        await page.mouse.wheel(0, 2000);
        await page.waitForTimeout(700);
      }
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    } catch (e) {
      log(`SCROLL ERROR: ${e.message}`);
    }

    // Optional: try clicking a "next page" / load more button
    if (t.paginate) {
      try {
        const candidates = [
          'a[rel="next"]',
          'a:has-text("Далі")',
          'a:has-text("Наступна")',
          'button:has-text("Показати ще")',
          'button:has-text("Завантажити ще")',
        ];
        for (const sel of candidates) {
          const el = await page.$(sel);
          if (el) {
            log(`Pagination: clicking ${sel}`);
            await el.click({ delay: 50 }).catch(() => {});
            await page.waitForTimeout(2500);
            break;
          }
        }
      } catch (e) {
        log(`PAGINATE ERROR: ${e.message}`);
      }
    }

    // Save full HTML
    try {
      const html = await page.content();
      const htmlPath = path.join(DUMP_DIR, safeName(t, 'page') + '.html');
      fs.writeFileSync(htmlPath, html);
      log(`HTML saved: ${htmlPath} (${html.length}B)`);

      // Inspect inline <script> tags + DOM cards
      const scriptInfo = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script'));
        const out = [];
        scripts.forEach((s, idx) => {
          const txt = s.textContent || '';
          if (txt.length < 500) return;
          // Score: presence of listing-ish keywords
          const m = txt.match(/price|priceUsd|realtyId|roomCount|fullArea|advertisement|insertTime|"id":\s*\d+/gi);
          out.push({
            idx,
            id: s.id || null,
            type: s.type || null,
            len: txt.length,
            score: m ? m.length : 0,
            head: txt.slice(0, 200),
          });
        });
        // Common SSR/data hooks
        const globals = {};
        ['__NEXT_DATA__', '__INITIAL_STATE__', '__APOLLO_STATE__', '__NUXT__', '__PRELOADED_STATE__'].forEach(
          (k) => {
            globals[k] = typeof window[k] !== 'undefined';
          }
        );
        // Count anchors/cards
        const sample = (sel, n = 3) =>
          Array.from(document.querySelectorAll(sel))
            .slice(0, n)
            .map((el) => el.outerHTML.slice(0, 220));
        const counts = {
          'a[href*="/realty/"]': document.querySelectorAll('a[href*="/realty/"]').length,
          'a[href*="/sale/"]': document.querySelectorAll('a[href*="/sale/"]').length,
          'a[href*="/flat/"]': document.querySelectorAll('a[href*="/flat/"]').length,
          'article': document.querySelectorAll('article').length,
          '[data-testid]': document.querySelectorAll('[data-testid]').length,
          '[class*="card" i]': document.querySelectorAll('[class*="card" i]').length,
          '[class*="Card" i]': document.querySelectorAll('[class*="Card" i]').length,
          '[class*="listing" i]': document.querySelectorAll('[class*="listing" i]').length,
        };
        const samples = {
          'a[href*="/realty/"]': sample('a[href*="/realty/"]'),
          'article': sample('article'),
          '[data-testid]': sample('[data-testid]'),
        };
        return { scripts: out, globals, counts, samples };
      });

      log(`\nWindow globals: ${JSON.stringify(scriptInfo.globals)}`);
      log(`DOM card counts:`);
      for (const [k, v] of Object.entries(scriptInfo.counts)) log(`  ${k}: ${v}`);
      for (const [k, arr] of Object.entries(scriptInfo.samples)) {
        if (arr.length) {
          log(`  sample ${k}:`);
          arr.forEach((h) => log(`    ${h.replace(/\s+/g, ' ')}`));
        }
      }

      // Save top-3 highest-scoring inline scripts
      const topScripts = scriptInfo.scripts
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score || b.len - a.len)
        .slice(0, 3);
      log(`\nInline <script> blocks with listing keywords (top 3):`);
      for (const s of topScripts) {
        log(`  idx=${s.idx} id=${s.id} type=${s.type} len=${s.len} score=${s.score}`);
        log(`    head: ${s.head.replace(/\s+/g, ' ').slice(0, 160)}`);
        const full = await page
          .evaluate((idx) => document.querySelectorAll('script')[idx]?.textContent || '', s.idx)
          .catch(() => '');
        if (full) {
          const sp = path.join(DUMP_DIR, safeName(t, `script-${s.idx}`) + '.txt');
          fs.writeFileSync(sp, full);
          log(`    saved: ${sp}`);
        }
      }

      // Extract __NEXT_DATA__
      const nextData = await page
        .$eval('script#__NEXT_DATA__', (el) => el.textContent)
        .catch(() => null);
      if (nextData) {
        const ndPath = path.join(DUMP_DIR, safeName(t, 'next-data') + '.json');
        fs.writeFileSync(ndPath, nextData);
        log(`__NEXT_DATA__ saved: ${ndPath} (${nextData.length}B)`);

        // Try to surface listing-like arrays inside __NEXT_DATA__
        try {
          const parsed = JSON.parse(nextData);
          const hits = [];
          const walk = (node, pathStr) => {
            if (!node || typeof node !== 'object') return;
            if (Array.isArray(node)) {
              if (node.length && typeof node[0] === 'object' && node[0]) {
                const keys = Object.keys(node[0]).join(',');
                if (
                  /price|rooms|area|address|realtyId|geo|advertisement/i.test(keys)
                ) {
                  hits.push({ path: pathStr, len: node.length, keys });
                }
              }
              node.slice(0, 3).forEach((v, i) => walk(v, `${pathStr}[${i}]`));
              return;
            }
            for (const k of Object.keys(node)) walk(node[k], `${pathStr}.${k}`);
          };
          walk(parsed, '$');
          if (hits.length) {
            log(`Listing-like arrays in __NEXT_DATA__:`);
            hits.slice(0, 10).forEach((h) =>
              log(`  ${h.path}  len=${h.len}  keys=${h.keys.slice(0, 200)}`)
            );
          } else {
            log(`No obvious listing arrays in __NEXT_DATA__`);
          }
        } catch (e) {
          log(`__NEXT_DATA__ parse failed: ${e.message}`);
        }
      } else {
        log('No __NEXT_DATA__ on page');
      }
    } catch (e) {
      log(`HTML/NEXT-DATA error: ${e.message}`);
    }

    log(`\nJSON calls (${calls.length}), top 25 by size:`);
    const sorted = [...calls].sort((a, b) => b.len - a.len).slice(0, 25);
    for (const c of sorted) {
      const pd = c.postData ? ` <postLen=${c.postData.length}>` : '';
      log(`  [${c.status}] ${c.method} ${c.len}B${pd}  ${c.url}`);
    }

    const topBodies = [...bodies.values()]
      .sort((a, b) => b.len - a.len)
      .slice(0, 5);
    log(`\nFull-body dumps written to ${DUMP_DIR}/:`);
    topBodies.forEach((b, i) => {
      const safe =
        `${t.name}__${String(i).padStart(2, '0')}__` +
        b.url
          .replace(/^https?:\/\//, '')
          .replace(/[^a-zA-Z0-9._-]/g, '_')
          .slice(0, 150);
      const jsonPath = path.join(DUMP_DIR, `${safe}.json`);
      fs.writeFileSync(jsonPath, b.text);
      if (b.postData) {
        fs.writeFileSync(path.join(DUMP_DIR, `${safe}.req.txt`), b.postData);
      }
      log(
        `  - ${jsonPath} (${b.len}B${b.postData ? `, postLen=${b.postData.length}` : ''})`
      );
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
  console.log(`Saved JSON/HTML dumps to ${DUMP_DIR}/`);
})();
