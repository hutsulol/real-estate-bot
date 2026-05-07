# Realtor — Hikka userbot

Модуль автоответчика. Читает клиентов из Supabase, пишет им AI-ответы
с учётом нотаток из Obsidian, ведёт переписку как живой риелтор.

## Что делает

- **Рассылка**: каждые N минут сканирует таблицу `clients`, для каждого
  активного находит новые подходящие квартиры из `apartments` (которые
  ещё не были ему отправлены) → пишет первое сообщение по шаблону.
- **Авто-ответы**: при входящем DM от известного клиента генерирует
  ответ через OpenAI с контекстом (критерии + Obsidian-нотатки +
  последние 10 сообщений переписки).
- **Имитация человека**: рандомная задержка перед ответом
  (`delay_min`-`delay_max` минут на клиента), индикатор «typing…»,
  тихие часы (по умолчанию 22-09).
- **Логирование**: каждое сообщение попадает в `chat_messages` →
  фронтенд CRM видит переписку.
- **Avoid double-send**: каждая отправленная клиенту квартира
  записывается в `pinned_listings` — повторно не пришлёт.

## 0. Перед началом — выполни SQL-миграции

В Supabase Dashboard → SQL Editor:

1. `migrations/0001_enrich_apartments.sql` — расширяет квартиры (поверх,
   площадь, опаление и т.д.). Если ещё не делал.
2. `migrations/0002_crm_tables.sql` — создаёт `clients`,
   `chat_messages`, `pinned_listings`. **Этот шаг обязателен для
   модуля.**

## 1. Поставить Hikka на VPS

Самый простой путь — Linux VPS (Ubuntu 22.04, 1 GB RAM хватит,
$5/мес у Hetzner / DigitalOcean / Aeza).

```bash
# Обновляем систему
sudo apt update && sudo apt upgrade -y

# Зависимости
sudo apt install -y python3 python3-pip python3-venv git neofetch \
  libcairo2 libcairo2-dev pkg-config

# Ставим Hikka (официальная установка)
curl -L https://hikka.pw/install | bash
```

Скрипт спросит:
1. Telegram API ID / API Hash → бери здесь: https://my.telegram.org/auth → API development tools
2. Номер телефона → код подтверждения

После запуска Hikka даст ссылку для веб-конфига (порт обычно
`:8080`). Открой её в браузере и заверши логин.

> Альтернативно: Hikka в Docker, на Termux (Android), на личном ПК.
> Документация: https://hikka.pw/

## 2. Загрузить модуль

В любом чате с собой (или Saved Messages) набери:

```
.dlmod https://raw.githubusercontent.com/hutsulol/real-estate-bot/main/userbot/realtor.py
```

Hikka скачает модуль, поставит зависимость `openai` (автоматически по
`# requires:`-комментарию). На вывод увидишь:
```
✅ Module Realtor loaded
```

## 3. Конфиг

```
.config Realtor
```

Появится меню. Заполни:

| Ключ              | Что                                                                |
|-------------------|--------------------------------------------------------------------|
| `supabase_url`    | `https://ixxvfvtdomhenwqhpyqj.supabase.co` (уже стоит)             |
| `supabase_key`    | **service_role key** из Supabase → Settings → API. Анонный не подойдёт — модуль пишет в БД |
| `openai_key`      | OpenAI API key (`sk-…`)                                            |
| `openai_model`    | `gpt-4o-mini` (по умолчанию). Можно `gpt-4o` для качества          |
| `obsidian_path`   | `~/.realtor-obsidian` (куда клонировать vault)                     |
| `obsidian_repo`   | `https://<TOKEN>@github.com/<user>/obsidian-realty-vault.git` (PAT с правом Contents: Read) |
| `scan_interval_min` | 5 — как часто проверять новые матчи                              |
| `active`          | `true` — главный рубильник                                          |

> ⚠️ **Никогда не публикуй `obsidian_repo` URL с токеном** — Hikka
> хранит его в локальной БД на сервере, это нормально, но не
> отправляй его в чаты/гитхаб.

## 4. Pull vault и запуск

```
.realtor_sync     # клонирует Obsidian vault в ~/.realtor-obsidian
.realtor_status   # показывает счётчики
.realtor_start    # включает рассылку (по умолчанию уже on)
```

## 5. Команды

| Команда              | Что делает                                                |
|----------------------|-----------------------------------------------------------|
| `.realtor_status`    | Master switch + кол-во клиентов + счётчики сессии         |
| `.realtor_start`     | Включить рассылку                                          |
| `.realtor_stop`      | Полная пауза (входящие тоже не обрабатываются)            |
| `.realtor_sync`      | `git pull` Obsidian vault'а сейчас                        |
| `.realtor_test @u`   | Найти клиента по @username, отправить ему первое сообщение (dry run) |

## 6. Создание клиентов

Пока фронтенд CRM работает на моках, добавляй клиентов руками через
Supabase Dashboard → Table Editor → `clients`. Минимально:

```
name              "Данил Романчук"
username          "@danylo_r"
description       "Шукає 2к в Центрі, тільки вторинка..."
budget            "до 60 000 USD"
district          "Центр"
rooms             "2"
criteria          {"rooms":2,"district":"центр","max_price":60000,"is_secondary":true,"year_from":2006,"floor_from":2}
auto_enabled      true
initiate          true
delay_min         8
delay_max         15
frequency_seconds 7200
message_template  "Доброго дня, {{name}}! Знайшов {{count}} нових варіантів за вашими критеріями. Скинути в чат?"
```

(`status` = `active` по умолчанию.)

В следующей сессии добавим в фронтенд реальную CRM-форму, чтобы
клиентов можно было создавать через UI.

## 7. Obsidian-нотатки клиента

Модуль читает файлы по пути:

```
<obsidian_path>/clients/<username_без_@>.md
```

Пример: для клиента с `username = "@danylo_r"` создай в репозитории
файл `clients/danylo_r.md`:

```markdown
# Данил Романчук

## Що важливо
- Відповідає лише ввечері (після 19:00)
- Просив не дзвонити, тільки текстом
- Минулого тижня дивився Manhattan, не сподобалось — гучно
- Бюджет можна розтягнути до 65 000 USD, якщо ремонт суперський
- Працює в IT, гнучкий графік
```

Когда клиент напишет — модуль зачитает этот файл и подставит в
системний prompt OpenAI. Ответы будут учитывать контекст.

## 8. Безпечність

- Запускай на VPS, не на домашнем ПК (он спать уходит, бот падает).
- service_role ключ Supabase даёт ПОЛНЫЙ доступ к БД — храни только в
  конфиге Hikka, не пуши в репо.
- Ставь Telegram 2FA, иначе кто-то с твоим OTP'ом может авторизовать
  свой userbot.
- Ограничь доступ к веб-конфигу Hikka файрволлом или поставь свой
  пароль (при первом запуске Hikka попросит).

## 9. Дебаг

Логи Hikka: `tail -f ~/Hikka/hikka.log` (или там где он у тебя
устанавливался; точный путь Hikka скажет при первом запуске).
Все ошибки модуля идут с префиксом `[Realtor]`.

Если AI-ответы не приходят:
- `.realtor_status` — модуль вообще активен?
- Проверь `openai_key` через `.config Realtor` — не пустой ли?
- Проверь что клиент в Supabase имеет `status='active'` и `auto_enabled=true`
- Проверь логи: `[Realtor] OpenAI generation failed: …`
