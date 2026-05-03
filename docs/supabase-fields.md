# Supabase: поля, які очікує поточний uploader

`upload.js` зараз надсилає в таблицю `apartments` такі поля:

1. `id` (int8, primary key)
2. `title` (text)
3. `price` (int4)
4. `location` (text)
5. `link` (text)
6. `area_total` (numeric)
7. `area_kitchen` (numeric)
8. `rooms` (int4)
9. `floor` (int4)
10. `floors_total` (int4)
11. `currency` (text)

## SQL для нової таблиці (якщо ще порожня)

```sql
create table if not exists public.apartments (
  id bigint primary key,
  title text,
  price integer,
  location text,
  link text,
  created_at timestamp default now(),
  area_total numeric,
  area_kitchen numeric,
  rooms integer,
  floor integer,
  floors_total integer,
  currency text
);
```

## SQL, щоб додати відсутні колонки в існуючу таблицю

```sql
alter table public.apartments add column if not exists title text;
alter table public.apartments add column if not exists price integer;
alter table public.apartments add column if not exists location text;
alter table public.apartments add column if not exists link text;
alter table public.apartments add column if not exists area_total numeric;
alter table public.apartments add column if not exists area_kitchen numeric;
alter table public.apartments add column if not exists rooms integer;
alter table public.apartments add column if not exists floor integer;
alter table public.apartments add column if not exists floors_total integer;
alter table public.apartments add column if not exists currency text;
```

## Важливо

- `upload.js` НЕ відправляє `deal_type`.
- `district/street/location` вхідних даних мапляться в `location`.
- `floor_count` мапиться в `floors_total`.
