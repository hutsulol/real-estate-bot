import type { ChatHistoryItem, Client, ListingView, Source, TgMessage } from "../types";

const DISTRICTS = ["Центр", "Каскад", "Пасічна", "БАМ", "Софіївка", "Княгинин", "Залізничний", "Брати"];
const COMPLEXES = ["ЖК «Центральний»", "ЖК Manhattan", "ЖК Family Plaza", "ЖК Містечко Європейське", "ЖК «Княгинин»", "ЖК Up Hills", "ЖК Avalon", "—"];
const STREETS = ["вул. Шевченка, 24", "вул. Сахарова, 12А", "вул. Є. Коновальця, 88", "вул. Мазепи, 144", "вул. Незалежності, 67", "вул. Угринівська, 3", "вул. Стуса, 9", "вул. Тролейбусна, 18Б"];
const HEAT = ["індивідуальне", "центральне", "автономне", "тверде паливо"];
const WALLS = ["цегла", "монолі-каркас", "пінобетон", "панель"];

function buildListing(i: number): ListingView {
  const sources: Source[] = ["ria", "lun", "olx"];
  const rooms = [1, 1, 2, 2, 2, 3, 3, 4][i % 8];
  const area = [31, 42.5, 56, 64, 38, 72, 84, 95][i % 8];
  const price = [31000, 44000, 52000, 61000, 35000, 78000, 92000, 110000][i % 8];
  const rentPrice = [12000, 16000, 22000, 28000, 14000, 32000, 38000, 45000][i % 8];
  const isRent = i % 3 === 2;
  return {
    id: `lst-${i}`,
    rooms,
    area,
    floor: ((i * 3) % 9) + 1,
    floors: ((i * 3) % 9) + 4,
    price: isRent ? rentPrice : price,
    currency: isRent ? "UAH/міс" : "USD",
    district: DISTRICTS[i % DISTRICTS.length],
    complex: COMPLEXES[i % COMPLEXES.length],
    street: STREETS[i % STREETS.length],
    walls: WALLS[i % WALLS.length],
    heating: HEAT[i % HEAT.length],
    yearBuilt: 1985 + ((i * 7) % 40),
    source: sources[i % 3],
    posted: ["3 хв тому", "12 хв тому", "годину тому", "2 год тому", "вчора", "2 дні тому"][i % 6],
  };
}

export const MOCK_LISTINGS: ListingView[] = Array.from({ length: 18 }, (_, i) => buildListing(i));

export const CHAT_HISTORY: ChatHistoryItem[] = [
  { id: "c1", title: "2к Центр до 50000 USD", sub: "16 результатів • вторинка", active: true },
  { id: "c2", title: "Оренда від власника, Каскад", sub: "8 результатів" },
  { id: "c3", title: "Княгинин, новобудова 2020+", sub: "5 результатів" },
  { id: "c4", title: "1к до 35000, 4-9 поверх", sub: "12 результатів" },
  { id: "c5", title: "Manhattan, всі ЖК", sub: "21 результат" },
  { id: "c6", title: "Терміновий продаж, 3к", sub: "3 результати" },
];

export const CLIENTS: Client[] = [
  {
    id: "u1", name: "Данил Романчук", username: "@danylo_r", initials: "ДР",
    status: "active",
    description: "Шукає 2к в Центрі, тільки вторинка, без ремонту не пропонувати, рік забудови від 2006.",
    budget: "до 60 000 USD", district: "Центр", rooms: "2",
    autoEnabled: true, delay: 8, frequency: "1 раз / 2 год", initiate: true,
    metrics: { sent: 142, read: 128, replied: 41 },
    matches: 7, lastMsg: "10 хв тому",
    criteria: { secondary: true, repaired: true, yearFrom: 2006, floorFrom: 2, heating: "будь-яке" },
  },
  {
    id: "u2", name: "Марія Гнатюк", username: "@maria_gn", initials: "МГ",
    status: "active",
    description: "Сім'я з 2 дітьми, 3к в Каскаді або Пасічній, ціна до 75 000 USD.",
    budget: "до 75 000 USD", district: "Каскад / Пасічна", rooms: "3",
    autoEnabled: true, delay: 12, frequency: "2 рази / день", initiate: true,
    metrics: { sent: 88, read: 80, replied: 28 },
    matches: 4, lastMsg: "годину тому",
    criteria: { secondary: false, repaired: true, yearFrom: 2018, floorFrom: 3, heating: "індивідуальне" },
  },
  {
    id: "u3", name: "Олег Думанський", username: "@oleh_d", initials: "ОД",
    status: "paused",
    description: "Інвестор, 1к-студії в новобудовах. Купує під оренду.",
    budget: "до 45 000 USD", district: "Будь-який", rooms: "1",
    autoEnabled: false, delay: 24, frequency: "1 раз / тиждень", initiate: false,
    metrics: { sent: 34, read: 30, replied: 9 },
    matches: 12, lastMsg: "2 дні тому",
    criteria: { secondary: false, repaired: false, yearFrom: 2020, floorFrom: 1, heating: "будь-яке" },
  },
  {
    id: "u4", name: "Юлія Ткач", username: "@yulia_t", initials: "ЮТ",
    status: "active",
    description: "Оренда довгостроково, 2к, без посередників. Тварини є.",
    budget: "до 18 000 UAH/міс", district: "Центр / Каскад", rooms: "2",
    autoEnabled: true, delay: 5, frequency: "3 рази / день", initiate: true,
    metrics: { sent: 76, read: 64, replied: 22 },
    matches: 9, lastMsg: "20 хв тому",
    criteria: { secondary: true, repaired: true, yearFrom: 2000, floorFrom: 2, heating: "будь-яке" },
  },
  {
    id: "u5", name: "Андрій Бойчук", username: "@andriy_bc", initials: "АБ",
    status: "closed",
    description: "Угода закрита 12.04 — куплено 3к на Сахарова.",
    budget: "—", district: "Центр", rooms: "3",
    autoEnabled: false, delay: 0, frequency: "—", initiate: false,
    metrics: { sent: 210, read: 198, replied: 67 },
    matches: 0, lastMsg: "12 днів тому",
    criteria: { secondary: true, repaired: true, yearFrom: 1990, floorFrom: 1, heating: "будь-яке" },
  },
  {
    id: "u6", name: "Наталія Семенюк", username: "@nataliya_s", initials: "НС",
    status: "active",
    description: "1к для дочки-студентки, бюджет жорсткий, поряд з ПНУ.",
    budget: "до 28 000 USD", district: "Центр", rooms: "1",
    autoEnabled: true, delay: 6, frequency: "1 раз / день", initiate: true,
    metrics: { sent: 52, read: 48, replied: 18 },
    matches: 5, lastMsg: "3 год тому",
    criteria: { secondary: true, repaired: false, yearFrom: 1980, floorFrom: 2, heating: "центральне" },
  },
  {
    id: "u7", name: "Віктор Мельник", username: "@viktor_m", initials: "ВМ",
    status: "active",
    description: "4к преміум-сегмент в Manhattan або аналогічних ЖК.",
    budget: "від 130 000 USD", district: "Центр", rooms: "4",
    autoEnabled: true, delay: 30, frequency: "1 раз / 2 дні", initiate: false,
    metrics: { sent: 18, read: 17, replied: 8 },
    matches: 2, lastMsg: "вчора",
    criteria: { secondary: false, repaired: true, yearFrom: 2020, floorFrom: 4, heating: "індивідуальне" },
  },
];

export const TG_HISTORY: TgMessage[] = [
  { from: "bot", text: "Доброго дня, Даниле! Знайшов 3 нових варіанти, що підходять під ваші критерії 👇", time: "10:14" },
  { from: "bot", text: "2к, ЖК «Центральний», 56 м², 4/9 поверх, цегла, індивідуальне опалення. 52 000 USD. Рік забудови — 2014.", time: "10:14" },
  { from: "user", text: "А коли можна подивитись?", time: "10:32" },
  { from: "bot", text: "Уточню у власника та повернусь з варіантами часу. Орієнтовно — сьогодні після 18:00 або завтра вранці.", time: "10:33" },
  { from: "user", text: "Окей, давайте на завтра 11:00", time: "10:34" },
  { from: "bot", text: "Записав. Поки що тримайте ще один — вул. Сахарова, 12А, 56 м², ремонт свіжий, 49 500 USD.", time: "10:35" },
];

export const SPARKS = {
  sent: [12, 18, 14, 22, 19, 26, 31, 28, 24, 30, 35, 41, 38, 44],
  replied: [3, 5, 4, 7, 6, 8, 11, 9, 8, 10, 12, 14, 13, 16],
  matches: [4, 6, 5, 8, 7, 9, 12, 10, 8, 11, 13, 15, 14, 18],
  online: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
};
