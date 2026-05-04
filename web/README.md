# Rieltor Parser — Web (frontend)

Vite + React + TypeScript-фронт для real-estate-bot. Дизайн з Claude Design.

## Як запустити (dev)

Потрібен Node.js 18+ (у вас вже встановлено для бекенду).

```bash
# Термінал 1 — бекенд
cd ..          # перейти в корінь репо
node server.js # http://localhost:3000

# Термінал 2 — фронт
cd web
npm install    # один раз
npm run dev    # http://localhost:5173
```

Відкрийте `http://localhost:5173` в браузері.

> ⚠️ **Не відкривайте `index.html` напряму** — Vite потрібен для
> компіляції TypeScript. Браузер бачитиме порожню сторінку.

На екрані логіну будь-який пароль → авто-перевірка MAC → вхід.

## Як зібрати продакшн

```bash
npm run build    # → dist/
npm run preview  # перегляд збірки локально
```

Папка `dist/` — статика, її можна задеплоїти на Vercel / Netlify /
будь-який static host.

## Налаштування бекенду

Дев-проксі вже сконфігуровано (`vite.config.ts`):
- `/api/search?q=...` → `http://localhost:3000/search?q=...`

Для прод-збірки виставіть бекенд URL у `.env` поруч з `package.json`:

```
VITE_API_BASE=https://your-backend.com
```

(Зверніть увагу: замість `/api/search` фронт зробить запит на
`${VITE_API_BASE}/search`.)

## Що інтегровано з бекендом

| Екран | Дані | Endpoint |
|---|---|---|
| Чат AI | Реальні | `GET /search?q=<prompt>` |
| Квартири | Реальні | `GET /search?q=квартира івано-франківськ` |
| Логін | **Mock** | — (etap 2: `/auth`) |
| Клієнти, картка клієнта | **Mock** | — (etap 2: `/clients`) |
| Дашборд | **Mock** | — (etap 2: `/metrics`) |
| Профіль · MAC, Obsidian, TG, тариф | **Mock** | — (etap 2) |

## Структура

```
web/
├── index.html          # Vite entry
├── vite.config.ts      # dev-проксі /api → :3000
├── tsconfig.json
├── package.json
└── src/
    ├── main.tsx        # bootstraping
    ├── App.tsx         # шелл + табы
    ├── styles.css      # дизайн-токени, всі стилі
    ├── types.ts        # TS-типи
    ├── lib/
    │   ├── api.ts      # клієнт до бекенду
    │   └── mock.ts     # моки для нереалізованих частин
    ├── components/
    │   ├── Icon.tsx
    │   ├── Sparkline.tsx
    │   ├── ListingCard.tsx
    │   ├── SourceChip.tsx
    │   ├── StatusBadge.tsx
    │   └── TweaksPanel.tsx
    └── screens/
        ├── Login.tsx
        ├── Chat.tsx
        ├── Listings.tsx
        ├── Clients.tsx
        ├── ClientDetail.tsx
        ├── Dashboard.tsx
        └── Profile.tsx
```
