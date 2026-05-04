import { useState } from "react";
import { Icon, type IconName } from "../components/Icon";

type Section = "security" | "obsidian" | "telegram" | "billing";

const SECTIONS: { id: Section; label: string; icon: IconName }[] = [
  { id: "security", label: "Безпека · MAC", icon: "shield" },
  { id: "obsidian", label: "Obsidian · GitHub", icon: "obs" },
  { id: "telegram", label: "Telegram юзербот", icon: "tg" },
  { id: "billing", label: "Тариф та ліміти", icon: "key" },
];

export function ProfileScreen() {
  const [section, setSection] = useState<Section>("security");

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="row gap-14">
          <div className="avatar avatar-lg">ДР</div>
          <div>
            <h1 className="page-title">Данил Романчук</h1>
            <div className="row gap-10" style={{ marginTop: 4 }}>
              <span className="muted" style={{ fontSize: 13 }}>
                d.romanchuk@if.realty
              </span>
              <span className="badge success">
                <span className="badge-dot" />
                рієлтор
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="profile-grid">
        <nav className="profile-nav">
          {SECTIONS.map((s) => (
            <div
              key={s.id}
              className={`profile-nav-item ${section === s.id ? "active" : ""}`}
              onClick={() => setSection(s.id)}
            >
              <Icon name={s.icon} size={14} className="muted" />
              {s.label}
            </div>
          ))}
        </nav>

        <div>
          {section === "security" && <SecuritySection />}
          {section === "obsidian" && <ObsidianSection />}
          {section === "telegram" && <TelegramSection />}
          {section === "billing" && <BillingSection />}
        </div>
      </div>
    </div>
  );
}

function SecuritySection() {
  const logs = [
    { dt: "сьогодні 14:22", dev: "MacBook Pro", ip: "94.137.182.4", ok: true },
    { dt: "сьогодні 09:08", dev: "MacBook Pro", ip: "94.137.182.4", ok: true },
    { dt: "вчора 19:42", dev: "Домашній ПК", ip: "176.36.50.198", ok: true },
    { dt: "30.04 22:11", dev: "Невідомий пристрій", ip: "185.2.94.10", ok: false },
  ];
  return (
    <>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">MAC-адреси пристроїв</h3>
          <span className="badge accent" style={{ marginLeft: "auto" }}>
            2 з 2 використано
          </span>
        </div>
        <div className="card-body">
          <p className="muted" style={{ fontSize: 12.5, marginTop: 0 }}>
            Доступ до системи дозволено лише з 2-х пристроїв за whitelist. Основну адресу змінює
            адміністратор, запасну ви можете оновити самостійно.
          </p>
          <div style={{ marginTop: 16 }}>
            <div className="mac-row">
              <div className="mac-icon">
                <Icon name="mac" size={16} />
              </div>
              <div className="mac-info">
                <div className="n">
                  MacBook Pro · робочий{" "}
                  <span className="muted" style={{ fontWeight: 400, fontSize: 11.5 }}>
                    · основний
                  </span>
                </div>
                <div className="a">A4:83:E7:1C:9F:22 · IF, домашня мережа</div>
              </div>
              <span className="badge success">
                <span className="badge-dot" />
                поточний
              </span>
              <button className="btn btn-sm" disabled style={{ opacity: 0.5 }}>
                Змінює адмін
              </button>
            </div>
            <div className="mac-row">
              <div className="mac-icon">
                <Icon name="mac" size={16} />
              </div>
              <div className="mac-info">
                <div className="n">
                  Домашній ПК{" "}
                  <span className="muted" style={{ fontWeight: 400, fontSize: 11.5 }}>
                    · запасний
                  </span>
                </div>
                <div className="a">B8:27:EB:54:11:8C · востаннє вхід 02.05.2026</div>
              </div>
              <button className="btn btn-sm">Змінити</button>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-header">
          <h3 className="card-title">Пароль</h3>
        </div>
        <div className="card-body">
          <div className="row gap-12">
            <div className="flex-1">
              <div style={{ fontSize: 13, fontWeight: 500 }}>Останні зміни — 14.03.2026</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                Пароль видається адміністратором. Можна змінити лише після підтвердження.
              </div>
            </div>
            <button className="btn btn-sm">
              <Icon name="key" size={13} /> Запросити зміну
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-header">
          <h3 className="card-title">Журнал входів</h3>
        </div>
        <div className="card-body" style={{ padding: "4px 18px 14px" }}>
          {logs.map((l, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "180px 1fr 160px 80px",
                gap: 12,
                alignItems: "center",
                padding: "10px 0",
                borderBottom: i < logs.length - 1 ? "1px solid var(--border)" : 0,
                fontSize: 12.5,
              }}
            >
              <div className="muted">{l.dt}</div>
              <div>{l.dev}</div>
              <div className="mono muted" style={{ fontSize: 12 }}>
                {l.ip}
              </div>
              <div>
                {l.ok ? (
                  <span className="badge success">
                    <span className="badge-dot" />
                    успіх
                  </span>
                ) : (
                  <span className="badge danger">
                    <span className="badge-dot" />
                    блок
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function ObsidianSection() {
  const changes = [
    { f: "clients/danylo_r.md", t: "10 хв тому", d: "+12 рядків" },
    { f: "districts/centr.md", t: "годину тому", d: "+4 рядки" },
    { f: "clients/maria_gn.md", t: "3 год тому", d: "оновлено критерії" },
    { f: "templates/first-message.md", t: "вчора", d: "новий файл" },
  ];
  return (
    <>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Підключення Obsidian через GitHub</h3>
          <span className="badge success" style={{ marginLeft: "auto" }}>
            <span className="badge-dot" />
            синхронізовано
          </span>
        </div>
        <div className="card-body">
          <p className="muted" style={{ fontSize: 12.5, marginTop: 0, maxWidth: 540 }}>
            AI-агент використовує ваш Obsidian-vault як довготривалу пам'ять. Підключіть приватний
            GitHub-репозиторій, де лежать ваші нотатки — агент читає їх перед кожним діалогом з
            клієнтом.
          </p>
          <div style={{ marginTop: 16 }}>
            <label className="label">GitHub репозиторій</label>
            <div className="repo-input">
              <span className="pre">github.com/</span>
              <input defaultValue="d-romanchuk/obsidian-realty-vault" />
            </div>
            <div className="helper">Доступ через GitHub App. Потрібні права на читання репозиторію.</div>
          </div>
          <div className="divider" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14 }}>
            <div>
              <div className="muted" style={{ fontSize: 11 }}>
                Гілка
              </div>
              <div className="mono" style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>
                main
              </div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 11 }}>
                Файлів у vault
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>847 .md</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 11 }}>
                Останній синк
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>4 хв тому</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 11 }}>
                Розмір
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>12.4 MB</div>
            </div>
          </div>
        </div>
        <div className="card-footer">
          <span className="muted mono" style={{ fontSize: 11.5 }}>
            Авто-синк кожні 5 хв
          </span>
          <button className="btn btn-sm" style={{ marginLeft: "auto" }}>
            <Icon name="sync" size={13} /> Синхронізувати
          </button>
          <button className="btn btn-sm">
            <Icon name="github" size={13} /> Відкрити репо
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-header">
          <h3 className="card-title">Останні зміни у vault</h3>
        </div>
        <div className="card-body" style={{ padding: "4px 18px 14px" }}>
          {changes.map((c, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 140px 120px",
                gap: 12,
                alignItems: "center",
                padding: "10px 0",
                borderBottom: i < changes.length - 1 ? "1px solid var(--border)" : 0,
                fontSize: 12.5,
              }}
            >
              <div className="mono">{c.f}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {c.t}
              </div>
              <div style={{ color: "var(--success)", fontSize: 12 }}>{c.d}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function TelegramSection() {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Telegram юзербот</h3>
        <span className="badge success" style={{ marginLeft: "auto" }}>
          <span className="badge-dot" />
          онлайн
        </span>
      </div>
      <div className="card-body">
        <div className="row gap-12">
          <div className="avatar avatar-lg" style={{ background: "oklch(0.55 0.12 230)" }}>
            ДР
          </div>
          <div className="flex-1">
            <div style={{ fontSize: 14, fontWeight: 600 }}>Данил Романчук</div>
            <div className="muted mono" style={{ fontSize: 12 }}>
              @danylo_r · ID 482918374
            </div>
          </div>
          <button className="btn btn-sm">
            <Icon name="x" size={13} /> Відключити
          </button>
        </div>

        <div className="divider" />

        <div className="criteria-grid">
          <div className="field">
            <label className="label">API ID</label>
            <input className="input mono" defaultValue="2487291" readOnly />
          </div>
          <div className="field">
            <label className="label">API Hash</label>
            <input className="input mono" type="password" defaultValue="••••••••••••••••" readOnly />
          </div>
        </div>

        <div className="divider" />

        <div className="row-toggle">
          <div>
            <div className="lbl">Глобальна пауза автообщення</div>
            <div className="sub">
              Зупиняє відправку всім клієнтам, не вимикаючи їхні налаштування
            </div>
          </div>
          <div className="toggle" />
        </div>
        <div className="row-toggle" style={{ borderBottom: 0 }}>
          <div>
            <div className="lbl">Сповіщення про відповіді</div>
            <div className="sub">Push, коли клієнт відповідає в Telegram</div>
          </div>
          <div className="toggle on" />
        </div>
      </div>
    </div>
  );
}

function BillingSection() {
  const items = [
    { k: "Клієнтів", v: "7 / 25" },
    { k: "Запитів до AI / день", v: "184 / 500" },
    { k: "Парсингів / день", v: "47 / 100" },
  ];
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Тариф «Pro»</h3>
        <span className="badge accent" style={{ marginLeft: "auto" }}>
          активний до 14.06.2026
        </span>
      </div>
      <div className="card-body">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          {items.map((m) => (
            <div
              key={m.k}
              style={{
                padding: 14,
                background: "var(--surface-2)",
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="muted" style={{ fontSize: 11.5 }}>
                {m.k}
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  marginTop: 4,
                  fontFeatureSettings: '"tnum"',
                }}
              >
                {m.v}
              </div>
            </div>
          ))}
        </div>
        <div className="divider" />
        <div className="row gap-10">
          <div className="flex-1">
            <div style={{ fontSize: 13, fontWeight: 500 }}>Наступне списання — 14.06.2026</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
              49 USD / місяць · картка •• 4242
            </div>
          </div>
          <button className="btn btn-sm">Керувати</button>
        </div>
      </div>
    </div>
  );
}
