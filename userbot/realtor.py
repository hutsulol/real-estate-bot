# meta developer: @hutsulol
# meta banner: https://placehold.co/600x200?text=Realtor
# meta pic: https://placehold.co/100?text=R
# requires: openai

"""
Realtor — Hikka userbot module.

Reads clients from Supabase. For each active client:
  1. Periodically scans `apartments` for new matches → sends a templated
     DM ("Знайшов 3 нових варіантів…") with realistic delays / quiet hours.
  2. Watches inbound DMs from known clients → generates a reply via
     OpenAI with full context (criteria + Obsidian note + recent chat).
     Imitates a human: random delay, "typing…" action, short replies.
  3. Logs every message to `chat_messages` so the frontend CRM stays
     in sync.

Setup:
  .config Realtor    → fill supabase_url, supabase_key, openai_key,
                        obsidian_repo (https URL incl. PAT) and verify
                        defaults.
  .realtor_sync      → clones / pulls the Obsidian vault.
  .realtor_start     → enables the master switch.

Commands:
  .realtor_status     prints master switch + counts
  .realtor_start      master ON
  .realtor_stop       master OFF
  .realtor_sync       git clone / git pull the Obsidian vault
  .realtor_test <id>  send the templated message to one client (dry run)
"""

import asyncio
import json
import os
import random
import subprocess
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

import aiohttp
from telethon.tl.types import Message

# Hikka injects these at load time.
from .. import loader, utils  # noqa: F401  (loader/utils may be globals at runtime)

import openai


@loader.tds
class RealtorMod(loader.Module):
    """AI-realtor autoresponder. Supabase + Obsidian + OpenAI."""

    strings = {
        "name": "Realtor",
        "no_config": "<b>❌ Заповніть конфіг через .config Realtor</b>",
        "started": "<b>✅ Realtor увімкнено</b>",
        "stopped": "<b>⏸ Realtor вимкнено</b>",
        "status": (
            "<b>Realtor</b>\n"
            "Master switch: <code>{state}</code>\n"
            "Клієнтів: <b>{total}</b> (активних: <b>{active}</b>)\n"
            "Надіслано за сесію: <b>{sent}</b>\n"
            "Отримано за сесію: <b>{received}</b>\n"
            "Vault: <code>{vault}</code>"
        ),
        "vault_pulled": "<b>📚 Obsidian vault оновлено</b>",
        "vault_failed": "<b>❌ git помилка:</b> <code>{}</code>",
        "test_done": "<b>✉️ Тестове повідомлення надіслано:</b>\n<code>{}</code>",
        "test_no_client": "<b>❌ Клієнта не знайдено</b>",
    }

    def __init__(self):
        self.config = loader.ModuleConfig(
            loader.ConfigValue(
                "supabase_url",
                "https://ixxvfvtdomhenwqhpyqj.supabase.co",
                "Supabase project URL",
            ),
            loader.ConfigValue(
                "supabase_key",
                "",
                "Supabase service_role key (НЕ anon — для запису в БД)",
                validator=loader.validators.Hidden(),
            ),
            loader.ConfigValue(
                "openai_key",
                "",
                "OpenAI API key (sk-…)",
                validator=loader.validators.Hidden(),
            ),
            loader.ConfigValue(
                "openai_model",
                "gpt-4o-mini",
                "OpenAI модель для генерації відповідей",
            ),
            loader.ConfigValue(
                "obsidian_path",
                "~/.realtor-obsidian",
                "Локальний шлях, куди клонується Obsidian vault",
            ),
            loader.ConfigValue(
                "obsidian_repo",
                "",
                "GitHub repo з Obsidian vault'ом, https URL з токеном",
                validator=loader.validators.Hidden(),
            ),
            loader.ConfigValue(
                "scan_interval_min",
                5,
                "Як часто сканувати клієнтів (хв)",
                validator=loader.validators.Integer(minimum=1, maximum=180),
            ),
            loader.ConfigValue(
                "active",
                True,
                "Master switch — без нього модуль нічого не робить",
                validator=loader.validators.Boolean(),
            ),
        )
        self._task = None
        self._stop = asyncio.Event()
        self._stats = {"msgs_sent": 0, "msgs_received": 0}
        self._client = None
        self._db = None

    async def client_ready(self, client, db):
        self._client = client
        self._db = db
        self._stop.clear()
        # Best-effort vault pull on load — don't block startup if it fails.
        try:
            await self._pull_vault()
        except Exception as e:
            print(f"[Realtor] vault pull on init failed: {e}")
        self._task = asyncio.create_task(self._scan_loop())

    async def on_unload(self):
        self._stop.set()
        if self._task:
            self._task.cancel()

    # ════════════════════════════ commands ══════════════════════════════
    async def realtor_statuscmd(self, message: Message):
        """Show master switch and client counts"""
        try:
            clients = await self._sb_get("clients", "select=id,status")
        except Exception as e:
            await utils.answer(message, f"<b>❌ Supabase error:</b> <code>{e}</code>")
            return
        active = sum(1 for c in clients if c.get("status") == "active")
        await utils.answer(
            message,
            self.strings["status"].format(
                state="active" if self.config["active"] else "paused",
                total=len(clients),
                active=active,
                sent=self._stats["msgs_sent"],
                received=self._stats["msgs_received"],
                vault=os.path.expanduser(self.config["obsidian_path"]),
            ),
        )

    async def realtor_startcmd(self, message: Message):
        """Enable master switch"""
        self.config["active"] = True
        await utils.answer(message, self.strings["started"])

    async def realtor_stopcmd(self, message: Message):
        """Disable master switch"""
        self.config["active"] = False
        await utils.answer(message, self.strings["stopped"])

    async def realtor_synccmd(self, message: Message):
        """Pull Obsidian vault now"""
        ok, out = await self._pull_vault(return_output=True)
        if ok:
            await utils.answer(message, self.strings["vault_pulled"])
        else:
            await utils.answer(message, self.strings["vault_failed"].format(out[:300]))

    async def realtor_testcmd(self, message: Message):
        """<client_id|@username> — send templated message to one client (dry run)"""
        arg = utils.get_args_raw(message).strip()
        if not arg:
            await utils.answer(message, "<b>Usage:</b> <code>.realtor_test @username</code>")
            return
        client = await self._find_client(arg, None)
        if not client:
            await utils.answer(message, self.strings["test_no_client"])
            return
        listings = await self._find_new_matches(client)
        if not listings:
            await utils.answer(message, "<b>ℹ️ Немає нових збігів для цього клієнта</b>")
            return
        text = self._render_template(client["message_template"], client, listings)
        try:
            entity = await self._resolve_entity(client)
            await self._client.send_message(entity, text)
            await self._log_message(client["id"], "out", text, ai=False)
            await self._mark_listings_notified(client["id"], [l["id"] for l in listings])
            await utils.answer(message, self.strings["test_done"].format(text[:200]))
        except Exception as e:
            await utils.answer(message, f"<b>❌ send failed:</b> <code>{e}</code>")

    # ════════════════════════════ watcher ═══════════════════════════════
    @loader.watcher(only_pm=True, no_commands=True)
    async def on_inbound_pm(self, message: Message):
        """Inbound PM from a known client → AI reply."""
        if not self.config["active"]:
            return
        if getattr(message, "out", False):
            return  # only inbound
        sender = await message.get_sender()
        if not sender or getattr(sender, "bot", False):
            return

        username = "@" + sender.username if sender.username else None
        client = await self._find_client(username, sender.id)
        if not client:
            return  # stranger — out of scope
        if client["status"] != "active" or not client["auto_enabled"]:
            return

        text = (message.raw_text or "").strip()
        if not text:
            return

        await self._log_message(
            client["id"], "in", text, tg_message_id=message.id
        )
        self._stats["msgs_received"] += 1

        # Cache telegram_id for future runs (so we don't depend on @username).
        if not client.get("telegram_id"):
            try:
                await self._sb_patch(
                    f"clients?id=eq.{client['id']}", {"telegram_id": sender.id}
                )
            except Exception as e:
                print(f"[Realtor] patch telegram_id failed: {e}")

        # Generate reply
        try:
            reply = await self._generate_reply(client, text)
        except Exception as e:
            print(f"[Realtor] OpenAI generation failed: {e}")
            return
        if not reply:
            return

        # Human-like delay: clamped random in client.delay_min..delay_max minutes.
        d_min = max(0, int(client.get("delay_min") or 1))
        d_max = max(d_min, int(client.get("delay_max") or d_min))
        delay = random.uniform(d_min * 60, d_max * 60)
        delay = max(15.0, min(delay, 30 * 60))  # hard clamp 15s..30min
        await asyncio.sleep(delay)

        # "typing…" action while we "compose" the reply
        try:
            async with self._client.action(message.chat_id, "typing"):
                await asyncio.sleep(min(15.0, max(2.0, len(reply) * 0.04)))
                sent = await self._client.send_message(message.chat_id, reply)
        except Exception as e:
            print(f"[Realtor] send failed: {e}")
            return

        await self._log_message(
            client["id"], "out", reply, tg_message_id=sent.id, ai=True
        )
        self._stats["msgs_sent"] += 1
        try:
            await self._sb_patch(
                f"clients?id=eq.{client['id']}",
                {"last_outbound_at": _iso_now()},
            )
        except Exception:
            pass

    # ════════════════════════════ scan loop ═════════════════════════════
    async def _scan_loop(self):
        while not self._stop.is_set():
            try:
                if self.config["active"]:
                    await self._scan_clients()
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[Realtor] scan loop error: {e}")
            try:
                await asyncio.wait_for(
                    self._stop.wait(),
                    timeout=int(self.config["scan_interval_min"]) * 60,
                )
                break  # _stop set → exit
            except asyncio.TimeoutError:
                pass  # tick again

    async def _scan_clients(self):
        clients = await self._sb_get(
            "clients",
            "select=*&status=eq.active&auto_enabled=eq.true&initiate=eq.true",
        )
        for c in clients:
            try:
                await self._maybe_message_client(c)
            except Exception as e:
                print(f"[Realtor] client {c.get('username')}: {e}")

    async def _maybe_message_client(self, client: dict):
        # Quiet hours from per-client config (falls back to module config below).
        qs = int(client.get("quiet_start") or 22)
        qe = int(client.get("quiet_end") or 9)
        h = datetime.now().hour
        if qs > qe:  # wraps midnight
            if h >= qs or h < qe:
                return
        elif qs <= h < qe:
            return

        # Frequency: at least N seconds since the last outbound.
        last = client.get("last_outbound_at")
        if last:
            try:
                last_dt = datetime.fromisoformat(last.replace("Z", "+00:00"))
                age = (datetime.now(timezone.utc) - last_dt).total_seconds()
                if age < int(client.get("frequency_seconds") or 7200):
                    return
            except Exception:
                pass

        listings = await self._find_new_matches(client)
        if not listings:
            return
        text = self._render_template(
            client.get("message_template")
            or "Доброго дня, {{name}}! Знайшов {{count}} нових варіантів.",
            client,
            listings,
        )

        try:
            entity = await self._resolve_entity(client)
        except Exception as e:
            print(f"[Realtor] cannot resolve {client.get('username')}: {e}")
            return

        sent = await self._client.send_message(entity, text)
        await self._log_message(
            client["id"], "out", text, tg_message_id=sent.id, ai=False
        )
        await self._mark_listings_notified(client["id"], [l["id"] for l in listings])
        await self._sb_patch(
            f"clients?id=eq.{client['id']}",
            {"last_outbound_at": _iso_now()},
        )
        self._stats["msgs_sent"] += 1

    # ════════════════════════════ Supabase REST ═════════════════════════
    def _sb_headers(self, prefer: str = ""):
        h = {
            "apikey": self.config["supabase_key"],
            "Authorization": f"Bearer {self.config['supabase_key']}",
            "Content-Type": "application/json",
        }
        if prefer:
            h["Prefer"] = prefer
        return h

    async def _sb_get(self, table: str, query: str = ""):
        url = f"{self.config['supabase_url']}/rest/v1/{table}"
        if query:
            url += "?" + query
        async with aiohttp.ClientSession() as s:
            async with s.get(url, headers=self._sb_headers()) as r:
                r.raise_for_status()
                return await r.json()

    async def _sb_post(self, table: str, data):
        url = f"{self.config['supabase_url']}/rest/v1/{table}"
        async with aiohttp.ClientSession() as s:
            async with s.post(
                url, headers=self._sb_headers("return=minimal"), json=data
            ) as r:
                if r.status >= 300:
                    body = await r.text()
                    raise RuntimeError(f"POST {table} {r.status}: {body[:200]}")

    async def _sb_patch(self, path: str, data):
        url = f"{self.config['supabase_url']}/rest/v1/{path}"
        async with aiohttp.ClientSession() as s:
            async with s.patch(
                url, headers=self._sb_headers("return=minimal"), json=data
            ) as r:
                if r.status >= 300:
                    body = await r.text()
                    raise RuntimeError(f"PATCH {path} {r.status}: {body[:200]}")

    # ════════════════════════════ data helpers ══════════════════════════
    async def _find_client(self, username, tg_id):
        if username:
            uname = username if username.startswith("@") else "@" + username
            rows = await self._sb_get(
                "clients",
                f"select=*&username=eq.{urllib.parse.quote(uname)}&limit=1",
            )
            if rows:
                return rows[0]
        if tg_id:
            rows = await self._sb_get(
                "clients", f"select=*&telegram_id=eq.{tg_id}&limit=1"
            )
            if rows:
                return rows[0]
        return None

    async def _find_new_matches(self, client: dict, max_n: int = 5):
        criteria = client.get("criteria") or {}
        params = ["select=*"]
        if criteria.get("rooms"):
            params.append(f"rooms=eq.{int(criteria['rooms'])}")
        if criteria.get("district"):
            params.append(
                f"district=ilike.{urllib.parse.quote('*' + criteria['district'] + '*')}"
            )
        if criteria.get("max_price"):
            params.append(f"price=lte.{criteria['max_price']}")
        if criteria.get("year_from"):
            params.append(f"year_built=gte.{criteria['year_from']}")
        if criteria.get("floor_from"):
            params.append(f"floor=gte.{criteria['floor_from']}")
        if criteria.get("deal_type"):
            params.append(f"deal_type=eq.{criteria['deal_type']}")
        if criteria.get("heating"):
            params.append(
                f"heating=ilike.{urllib.parse.quote('*' + criteria['heating'] + '*')}"
            )
        if criteria.get("walls"):
            params.append(
                f"walls=ilike.{urllib.parse.quote('*' + criteria['walls'] + '*')}"
            )
        if criteria.get("has_repair") is True:
            params.append("has_repair=eq.true")
        if criteria.get("has_repair") is False:
            params.append("has_repair=eq.false")
        if criteria.get("is_secondary") is True:
            params.append("is_secondary=eq.true")
        if criteria.get("is_secondary") is False:
            params.append("is_secondary=eq.false")
        params.append("order=price.asc&limit=20")
        rows = await self._sb_get("apartments", "&".join(params))

        sent = await self._sb_get(
            "pinned_listings",
            f"select=listing_id&client_id=eq.{client['id']}",
        )
        sent_ids = {r["listing_id"] for r in sent}
        return [r for r in rows if r["id"] not in sent_ids][:max_n]

    async def _mark_listings_notified(self, client_id, listing_ids):
        if not listing_ids:
            return
        rows = [
            {
                "client_id": client_id,
                "listing_id": lid,
                "notified_at": _iso_now(),
            }
            for lid in listing_ids
        ]
        try:
            await self._sb_post("pinned_listings", rows)
        except Exception as e:
            # Likely conflict on (client_id, listing_id) — fine, ignore.
            print(f"[Realtor] pin notify conflict (ok): {e}")

    async def _log_message(
        self, client_id, direction, text, tg_message_id=None, ai=False
    ):
        row = {
            "client_id": client_id,
            "direction": direction,
            "text": text,
            "tg_message_id": tg_message_id,
            "ai_generated": ai,
        }
        if direction == "out":
            row["sent_at"] = _iso_now()
        else:
            row["received_at"] = _iso_now()
        try:
            await self._sb_post("chat_messages", row)
        except Exception as e:
            print(f"[Realtor] log_message failed: {e}")

    async def _resolve_entity(self, client):
        if client.get("telegram_id"):
            try:
                return await self._client.get_entity(int(client["telegram_id"]))
            except Exception:
                pass
        if client.get("username"):
            return await self._client.get_entity(client["username"])
        raise RuntimeError("no username and no telegram_id")

    def _render_template(self, template, client, listings):
        first_name = (client.get("name") or "").split()[0] if client.get("name") else ""
        return (
            (template or "")
            .replace("{{name}}", first_name)
            .replace("{{count}}", str(len(listings)))
            .replace("{{district}}", client.get("district") or "")
            .replace("{{price}}", client.get("budget") or "")
        )

    # ════════════════════════════ OpenAI ════════════════════════════════
    async def _generate_reply(self, client, user_message):
        oai = openai.AsyncOpenAI(api_key=self.config["openai_key"])

        notes = self._read_obsidian_note(
            (client.get("username") or "").lstrip("@")
        )
        recent = await self._sb_get(
            "chat_messages",
            f"select=direction,text&client_id=eq.{client['id']}"
            f"&order=created_at.desc&limit=10",
        )
        recent.reverse()
        history = [
            {
                "role": "user" if m["direction"] == "in" else "assistant",
                "content": m["text"],
            }
            for m in recent
        ]

        system = (
            "Ти — ріелтор з Івано-Франківська. Ім'я: Данил.\n"
            "Спілкуєшся у Telegram українською мовою як жива людина — "
            "коротко, без формальностей.\n\n"
            f"Клієнт: {client.get('name') or '?'}\n"
            f"Бюджет: {client.get('budget') or '?'}\n"
            f"Опис: {client.get('description') or '?'}\n"
            f"Критерії: {json.dumps(client.get('criteria') or {}, ensure_ascii=False)}\n\n"
            f"Нотатки про клієнта (Obsidian):\n{notes}\n\n"
            "Правила:\n"
            "— 1-3 короткі речення на повідомлення.\n"
            "— Без масової кількості емодзі. 0-1 емодзі.\n"
            "— Якщо клієнт уточнює про конкретну квартиру — відповідай "
            "конкретно. Якщо немає даних — кажи «уточню у власника, "
            "відпишу за пів години».\n"
            "— Не вигадуй ціни/адреси, яких не було в листуванні.\n"
            "— Питай зустрічне коротке питання, коли доречно "
            "(найкращий час показу, який поверх важливий і т.д.).\n"
        )

        messages = [
            {"role": "system", "content": system},
            *history,
            {"role": "user", "content": user_message},
        ]

        r = await oai.chat.completions.create(
            model=self.config["openai_model"],
            messages=messages,
            temperature=0.7,
            max_tokens=200,
        )
        return (r.choices[0].message.content or "").strip()

    # ════════════════════════════ Obsidian ══════════════════════════════
    def _read_obsidian_note(self, username):
        if not username:
            return "(no username)"
        base = Path(os.path.expanduser(self.config["obsidian_path"]))
        candidates = [
            base / "clients" / f"{username}.md",
            base / f"{username}.md",
        ]
        for p in candidates:
            if p.exists():
                try:
                    text = p.read_text(encoding="utf-8")
                    return text[:4000]  # cap to fit context
                except Exception as e:
                    return f"(read error: {e})"
        return "(no notes)"

    async def _pull_vault(self, return_output=False):
        path = os.path.expanduser(self.config["obsidian_path"])
        repo = self.config["obsidian_repo"]
        if not repo:
            return (False, "obsidian_repo is empty") if return_output else False

        cmd = (
            ["git", "clone", "--depth", "1", repo, path]
            if not Path(path).exists()
            else ["git", "-C", path, "pull", "--ff-only"]
        )

        try:
            p = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await p.communicate()
            output = (stdout + stderr).decode("utf-8", errors="ignore")
            ok = p.returncode == 0
            return (ok, output) if return_output else ok
        except Exception as e:
            return (False, str(e)) if return_output else False


def _iso_now():
    return datetime.now(timezone.utc).isoformat()
