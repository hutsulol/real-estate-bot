import { useState } from "react";
import { Icon } from "../components/Icon";
import { ListingCard } from "../components/ListingCard";
import { StatusBadge } from "../components/StatusBadge";
import { CLIENTS, MOCK_LISTINGS, TG_HISTORY } from "../lib/mock";

interface ClientDetailScreenProps {
  clientId: string;
  onBack: () => void;
}

export function ClientDetailScreen({ clientId, onBack }: ClientDetailScreenProps) {
  const client = CLIENTS.find((c) => c.id === clientId) ?? CLIENTS[0];
  const [auto, setAuto] = useState(client.autoEnabled);
  const [initiate, setInitiate] = useState(client.initiate);
  const [delay, setDelay] = useState(client.delay);

  return (
    <div className="page-content">
      <div className="row gap-8" style={{ marginBottom: 14 }}>
        <button className="btn btn-sm btn-ghost" onClick={onBack}>
          <Icon name="back" size={13} /> Усі клієнти
        </button>
        <span className="muted" style={{ fontSize: 12 }}>
          / {client.name}
        </span>
      </div>

      <div className="page-header" style={{ marginBottom: 18 }}>
        <div className="row gap-14">
          <div className="avatar avatar-lg">{client.initials}</div>
          <div>
            <h1 className="page-title">{client.name}</h1>
            <div className="row gap-10" style={{ marginTop: 4 }}>
              <span className="username mono" style={{ fontSize: 13 }}>
                {client.username}
              </span>
              <StatusBadge status={client.status} />
              <span className="muted" style={{ fontSize: 12 }}>
                · у CRM з 14.03.2026
              </span>
            </div>
          </div>
        </div>
        <div className="row gap-8">
          <button className="btn btn-sm">
            {auto ? (
              <>
                <Icon name="pause" size={12} /> Пауза
              </>
            ) : (
              <>
                <Icon name="play" size={12} /> Старт
              </>
            )}
          </button>
          <button className="btn btn-sm">
            <Icon name="tg" size={13} /> Відкрити в TG
          </button>
          <button className="btn btn-sm btn-danger">
            <Icon name="trash" size={13} />
          </button>
        </div>
      </div>

      <div className="client-detail">
        <div className="detail-main">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Опис та критерії пошуку</h3>
              <span className="muted" style={{ fontSize: 11.5, marginLeft: "auto" }}>
                Передається AI-агенту як контекст
              </span>
            </div>
            <div className="card-body">
              <div className="field">
                <label className="label">Інструкція агенту</label>
                <textarea className="textarea" defaultValue={client.description} style={{ minHeight: 70 }} />
                <div className="helper">
                  Цей текст потрапить у пам'ять Obsidian і використовується у кожному діалозі бота з
                  клієнтом.
                </div>
              </div>

              <div className="divider" />

              <div className="criteria-grid">
                <div className="field">
                  <label className="label">Район</label>
                  <input className="input" defaultValue={client.district} />
                </div>
                <div className="field">
                  <label className="label">Кімнат</label>
                  <input className="input" defaultValue={client.rooms} />
                </div>
                <div className="field">
                  <label className="label">Бюджет</label>
                  <input className="input" defaultValue={client.budget} />
                </div>
                <div className="field">
                  <label className="label">Рік забудови — від</label>
                  <input className="input mono" defaultValue={client.criteria.yearFrom} />
                </div>
                <div className="field">
                  <label className="label">Поверх — від</label>
                  <input className="input mono" defaultValue={client.criteria.floorFrom} />
                </div>
                <div className="field">
                  <label className="label">Опалення</label>
                  <input className="input" defaultValue={client.criteria.heating} />
                </div>
              </div>

              <div className="divider" />

              <div className="row gap-14" style={{ flexWrap: "wrap" }}>
                <div className="row-toggle" style={{ padding: 0, border: 0, gap: 12 }}>
                  <div className={`toggle ${client.criteria.secondary ? "on" : ""}`} />
                  <div>
                    <div className="lbl">Тільки вторинка</div>
                  </div>
                </div>
                <div className="row-toggle" style={{ padding: 0, border: 0, gap: 12 }}>
                  <div className={`toggle ${client.criteria.repaired ? "on" : ""}`} />
                  <div>
                    <div className="lbl">Тільки з ремонтом</div>
                  </div>
                </div>
                <div className="row-toggle" style={{ padding: 0, border: 0, gap: 12 }}>
                  <div className="toggle" />
                  <div>
                    <div className="lbl">Без посередників</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Налаштування авто-спілкування</h3>
              <div className="row gap-8" style={{ marginLeft: "auto" }}>
                <span className="muted" style={{ fontSize: 12 }}>
                  {auto ? "Активне" : "Вимкнено"}
                </span>
                <div className={`toggle ${auto ? "on" : ""}`} onClick={() => setAuto((a) => !a)} />
              </div>
            </div>
            <div className="card-body">
              <div className="row-toggle">
                <div>
                  <div className="lbl">Писати першим</div>
                  <div className="sub">
                    Бот ініціюватиме повідомлення, якщо знайде нове підходяще оголошення
                  </div>
                </div>
                <div
                  className={`toggle ${initiate ? "on" : ""}`}
                  onClick={() => setInitiate((i) => !i)}
                />
              </div>

              <div className="row-toggle">
                <div className="flex-1">
                  <div className="lbl">Затримка перед відповіддю</div>
                  <div className="sub">Імітує живу комунікацію — щоб не виглядало як бот</div>
                </div>
                <div className="row gap-10">
                  <input
                    type="range"
                    min="1"
                    max="60"
                    value={delay}
                    onChange={(e) => setDelay(+e.target.value)}
                    style={{ width: 140 }}
                  />
                  <span className="mono" style={{ fontSize: 12, minWidth: 48, textAlign: "right" }}>
                    {delay} хв
                  </span>
                </div>
              </div>

              <div className="row-toggle">
                <div>
                  <div className="lbl">Періодичність повідомлень</div>
                  <div className="sub">Як часто бот пише, якщо клієнт не відповідає</div>
                </div>
                <select className="select" defaultValue={client.frequency} style={{ width: 200 }}>
                  <option>1 раз / 2 год</option>
                  <option>2 рази / день</option>
                  <option>1 раз / день</option>
                  <option>1 раз / 2 дні</option>
                  <option>1 раз / тиждень</option>
                </select>
              </div>

              <div className="row-toggle" style={{ borderBottom: 0, paddingBottom: 0 }}>
                <div>
                  <div className="lbl">Пауза в неробочий час</div>
                  <div className="sub">Не писати з 22:00 до 09:00</div>
                </div>
                <div className="toggle on" />
              </div>

              <div className="divider" />

              <div className="field">
                <label className="label">Шаблон першого повідомлення</label>
                <textarea
                  className="textarea"
                  defaultValue={`Доброго дня, ${client.name.split(" ")[0]}! Знайшов {{count}} нових варіантів за вашими критеріями. Скинути в чат?`}
                />
                <div className="helper">
                  Підтримуються змінні: {"{{name}}"}, {"{{count}}"}, {"{{district}}"}, {"{{price}}"}
                </div>
              </div>
            </div>
            <div className="card-footer">
              <button className="btn btn-sm">Перевірити в пісочниці</button>
              <button className="btn btn-sm btn-accent" style={{ marginLeft: "auto" }}>
                Зберегти
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Підібрані квартири</h3>
              <span className="badge accent" style={{ marginLeft: "auto" }}>
                {client.matches} нових
              </span>
            </div>
            <div
              className="card-body"
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
            >
              {MOCK_LISTINGS.slice(0, 4).map((l) => (
                <ListingCard key={l.id} data={l} />
              ))}
            </div>
          </div>
        </div>

        <aside className="detail-side">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Метрики бота</h3>
            </div>
            <div
              className="card-body"
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}
            >
              <div>
                <div className="muted" style={{ fontSize: 11 }}>
                  Надіслано
                </div>
                <div style={{ fontSize: 20, fontWeight: 600, fontFeatureSettings: '"tnum"' }}>
                  {client.metrics.sent}
                </div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: 11 }}>
                  Прочитано
                </div>
                <div style={{ fontSize: 20, fontWeight: 600, fontFeatureSettings: '"tnum"' }}>
                  {client.metrics.read}
                </div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: 11 }}>
                  Відповів
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    fontFeatureSettings: '"tnum"',
                    color: "var(--accent)",
                  }}
                >
                  {client.metrics.replied}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Історія переписки</h3>
              <span className="muted" style={{ fontSize: 11, marginLeft: "auto" }}>
                Telegram
              </span>
            </div>
            <div className="card-body" style={{ padding: 14 }}>
              {TG_HISTORY.map((m, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: m.from === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <div className={`tg-message ${m.from === "user" ? "out" : ""}`}>{m.text}</div>
                  <div className="tg-time">{m.time}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Obsidian-нотатки</h3>
              <span className="badge success" style={{ marginLeft: "auto" }}>
                <span className="badge-dot" />
                синк ok
              </span>
            </div>
            <div className="card-body" style={{ fontSize: 12.5, color: "var(--text-2)" }}>
              <div className="mono muted" style={{ fontSize: 11 }}>
                clients/{client.username.replace("@", "")}.md
              </div>
              <div className="divider" style={{ margin: "10px 0" }} />
              <div style={{ lineHeight: 1.55 }}>
                <b style={{ color: "var(--text)" }}>Що важливо:</b>
                <br />— Відповідає лише ввечері (після 19:00)
                <br />— Просив не дзвонити, тільки текстом
                <br />— Минулого тижня дивився Manhattan, не сподобалось — гучно
                <br />— Бюджет можна розтягнути до 65 000, якщо ремонт суперський
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
