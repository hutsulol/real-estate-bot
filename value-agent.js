const OpenAI = require('openai');

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

function computeHeuristicScore(item, market) {
  const sqm = item.price && item.area_total ? item.price / item.area_total : null;
  const medianSqm = market.medianSqm || sqm || 0;

  let score = 50;
  if (sqm) {
    const diff = (medianSqm - sqm) / Math.max(medianSqm, 1);
    score += Math.max(-25, Math.min(30, diff * 60));
  }

  if (item.district && /(центр|cent|каскад|пасічна)/i.test(item.district)) score += 8;
  if (item.residential_complex) score += 6;
  if (item.rooms && item.rooms >= 1 && item.rooms <= 3) score += 3;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function enrichWithHeuristic(items) {
  const sqmPrices = items
    .map((i) => (i.price && i.area_total ? i.price / i.area_total : null))
    .filter(Boolean)
    .sort((a, b) => a - b);
  const medianSqm = sqmPrices.length ? sqmPrices[Math.floor(sqmPrices.length / 2)] : null;

  return items
    .map((item) => ({
      ...item,
      value_score: computeHeuristicScore(item, { medianSqm }),
      price_per_sqm: item.price && item.area_total ? +(item.price / item.area_total).toFixed(2) : null,
    }))
    .sort((a, b) => b.value_score - a.value_score || a.price - b.price);
}

function parseFloorFallback(query) {
  const m = query.match(/(?:на|этаж|поверх|этажe|поверсі)\s*(\d{1,2})/i) || query.match(/(\d{1,2})\s*(?:этаж|поверх)/i);
  return m ? Number(m[1]) : null;
}

async function parseUserIntent(query) {
  if (!client) return { floor: parseFloorFallback(query) };
  const prompt = `Верни JSON: {"rooms":number|null,"district":string|null,"max_price":number|null,"deal_type":"rent"|"sale"|null,"priority":"investment"|"comfort"|"balanced", "floor":number|null}. Запрос: ${query}`;
  const resp = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = (resp.choices?.[0]?.message?.content || '').replace(/```json|```/g, '').trim();
  try {
    const parsed = JSON.parse(text);
    if (parsed.floor == null) parsed.floor = parseFloorFallback(query);
    return parsed;
  } catch {
    return { floor: parseFloorFallback(query) };
  }
}

module.exports = { enrichWithHeuristic, parseUserIntent };
