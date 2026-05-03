# real-estate-bot

## Швидкий старт

```bash
npm install
cp .env.example .env
```

Потім відкрий `.env` і встав свої ключі.

## Приклад `.env` (Supabase)

```env
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_TABLE=apartments
OUTPUT_DATA_FILE=data-lun.json
```

`upload.js` також приймає альтернативні назви змінних:

```env
SUPABASE_PROJECT_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_KEY=YOUR_SUPABASE_ANON_KEY
```

## Приклад `.env` (Firebase — якщо потрібно для іншого сервісу)

```env
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=1234567890
FIREBASE_APP_ID=1:1234567890:web:abcdef123456
```

> Важливо: поточний `upload.js` завантажує в **Supabase**, не у Firebase.

## Команди

```bash
npm run parse:olx
npm run clean:olx
npm run parse:lun
npm run upload:supabase
npm run pipeline:olx
npm run pipeline:lun
```

## Відкриття файлів

```bash
code olx-parser.js
code lun-parser.js
code upload.js
code clean-data.js
```

PowerShell:

```powershell
notepad .\olx-parser.js
notepad .\lun-parser.js
notepad .\upload.js
notepad .\clean-data.js
```
