const COMPLEX_RULES = [
  { name: 'ЖК Манхеттен', heating: 'дахова котельня', aliases: ['манхеттен','манхетен','manhattan','manheten','manhatten'] },
  { name: 'ЖК Comfort Park', heating: 'індивідуальне газове', aliases: ['comfort park','комфорт парк','комфортпарк'] },
  { name: 'ЖК Comfort House', heating: 'індивідуальне газове', aliases: ['comfort house','комфорт хаус','комфортхаус'] },
  { name: 'ЖК Манхеттен АП', heating: 'дахова котельня', aliases: ['манхеттен ап','манхетен ап','manhattan up','manheten up','manhattenup','manhattanup','манхетенап'] },
  { name: 'ЖК Липки', heating: 'індивідуальне газове', aliases: ['липки','жк липки','lypky'] },
  { name: 'ЖК Паркове містечко', heating: 'індивідуальне газове', aliases: ['паркове містечко','паркове','parkove'] },
  { name: 'ЖК Містечко Центральне', heating: 'індивідуальне газове', aliases: ['містечко центральне','центральне містечко','central town','височана','височана 18'] },
  { name: 'ЖК Княгинин', heating: 'індивідуальне газове', aliases: ['княгинин','knyahynyn','княгинин жк'] },
  { name: 'ЖК Family Plaza', heating: 'індивідуальне газове', aliases: ['family plaza','фемілі плаза','familyplaza'] },
  { name: 'ЖК Калинова Слобода', heating: 'індивідуальне газове', aliases: ['калинова слобода','калинова','kalynova sloboda'] },
  { name: 'ЖК Millennium', heating: 'індивідуальне газове', aliases: ['millennium','міленіум','милениум'] },
  { name: 'ЖК U One', heating: 'дахова котельня', aliases: ['u one','ю ван','uone','юван'] },
  { name: 'ЖК Provance Home', heating: 'індивідуальне газове', aliases: ['provance','provance home','прованс','провансхоум','прованс хоум'] },
  { name: 'ЖК River Park', heating: 'індивідуальне газове', aliases: ['river park','рівер парк','riverpark'] },
  { name: 'ЖК Паркова Алея', heating: 'індивідуальне газове', aliases: ['паркова алея','parkova aleya'] },
  { name: 'ЖК Main House', heating: 'індивідуальне газове', aliases: ['main house','мейн хаус','мейнхаус'] },
  { name: 'ЖК Skygarden', heating: 'дахова котельня', aliases: ['skygarden','скайгарден'] },
  { name: 'ЖК Містечко Південне', heating: 'індивідуальне газове', aliases: ['містечко південне','містечко південне соціум'] },
  { name: 'ЖК Княгинин-Центр', heating: 'індивідуальне газове', aliases: ['княгинин центр','kniahynyn-center','жк kniahynyn-center','княгинин-центр'] },
  { name: 'ЖК HydroPark DeLuxe', heating: 'індивідуальне газове', aliases: ['гідропарк','гідропаркделюкс','гідропарк делюкс','гідро парк'] },
];

const HEATING_KEYWORDS = {
  'індивідуальне газове': ['індивідуальне опалення','індивідуальне газове','газовий котел','двоконтурний котел','автономне опалення','котел'],
  'індивідуальне електричне': ['електроопалення','електричний котел','електричне опалення','конвектори','електрокотел'],
  'дахова котельня': ['дахова котельня','власна котельня','будинкова котельня','автономне опалення будинку'],
  'централізоване': ['центральне опалення','централізоване опалення','міське опалення'],
  'без опалення': ['без опалення','не підключено опалення'],
};

const norm = (s='') => s.toLowerCase();

function detectHeatingRequest(text='') {
  const t = norm(text);
  for (const [type, kws] of Object.entries(HEATING_KEYWORDS)) {
    if (kws.some((k) => t.includes(norm(k)))) return type;
  }
  return null;
}

function detectComplexRequest(text='') {
  const t = norm(text);
  return COMPLEX_RULES.find((r) => r.aliases.some((a) => t.includes(norm(a)))) || null;
}

function inferListingComplexAndHeating(listing) {
  const blob = norm(`${listing.title || ''} ${listing.residential_complex || ''} ${listing.location || ''} ${listing.district || ''}`);
  const complex = COMPLEX_RULES.find((r) => r.aliases.some((a) => blob.includes(norm(a))));
  return { complex: complex?.name || null, heating: complex?.heating || null };
}

module.exports = { COMPLEX_RULES, HEATING_KEYWORDS, detectHeatingRequest, detectComplexRequest, inferListingComplexAndHeating };
