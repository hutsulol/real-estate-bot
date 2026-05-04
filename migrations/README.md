# Migrations

SQL для розширення схеми Supabase. Запускайте по порядку.

## Як виконати

1. Відкрийте Supabase Dashboard → проект `ixxvfvtdomhenwqhpyqj`
2. SQL Editor → New query
3. Скопіюйте вміст файлу `0001_…sql` → Run
4. Після успіху — запустіть локально один раз:
   ```bash
   node enrich-existing.js
   ```
   Скрипт пройде по всіх квартирах у БД, дістане з `title` поля
   (поверх, площа, опалення, стіни, рік, ремонт, ЖК, вулиця…) і
   заллє в нові колонки. Безпечний — оновлює лише `null` поля.

## Файли

- `0001_enrich_apartments.sql` — додає колонки floor, total_floors,
  area_*, walls, heating, year_built, has_repair, is_secondary,
  source, posted_at, updated_at + індекси.
