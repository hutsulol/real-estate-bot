# real-estate-bot

## 1) Старт роботи (команди)

```bash
npm install
```

### Запуск парсерів

```bash
npm run parse:olx      # OLX -> data.json
npm run clean:olx      # очистка OLX -> clean-data.json
npm run parse:lun      # LUN -> data-lun.json
npm run recon:lun      # перевірка / recon LUN
npm run sync:lun       # синхронізація LUN
npm run sync:lun:watch # sync у watch-режимі
```

### Завантаження у Supabase

```bash
npm run upload:supabase
```

### Пайплайни

```bash
npm run pipeline:olx   # parse OLX + clean + upload
npm run pipeline:lun   # parse LUN + upload
```

### Інше

```bash
npm run bot:telegram
npm run start:bot
npm run start
```

---

## 2) ENV для міграції на новий Supabase

Створи `.env` в корені проекту:

```env
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_TABLE=apartments

# який файл відправляти в Supabase:
# для LUN: data-lun.json
# для OLX після enrich: final-data.json (або інший)
OUTPUT_DATA_FILE=data-lun.json

# опціонально для LUN
LUN_MAX_PAGES=5
```

> Якщо в `.env` порожньо — `upload.js` тепер явно впаде з підказкою, які змінні треба додати.

---

## 3) Команди для “відкриття файлів”

### VS Code

```bash
code .
code olx-parser.js
code lun-parser.js
code upload.js
code clean-data.js
```

### PowerShell (просто відкрити/переглянути)

```powershell
notepad .\olx-parser.js
notepad .\lun-parser.js
notepad .\upload.js
notepad .\clean-data.js
Get-Content .\olx-parser.js
Get-Content .\lun-parser.js
```

---

## 4) Потік для вашого кейсу (LUN -> фільтрація поверхів -> Supabase)

1. Парсимо LUN:
   ```bash
   npm run parse:lun
   ```
2. Перевіряємо, що в `data-lun.json` є поля `floor`, `floor_count`, `area_total`.
3. Ставимо `OUTPUT_DATA_FILE=data-lun.json` у `.env`.
4. Завантажуємо:
   ```bash
   npm run upload:supabase
   ```

`upload.js` вже відправляє `floor`, `floor_count`, `area_total`, `district`, `street`, `deal_type`, `source` у Supabase.
