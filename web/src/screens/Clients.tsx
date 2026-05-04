import { Icon } from "../components/Icon";
import { StatusBadge } from "../components/StatusBadge";
import { CLIENTS } from "../lib/mock";

interface ClientsScreenProps {
  onOpen: (id: string) => void;
}

export function ClientsScreen({ onOpen }: ClientsScreenProps) {
  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Клієнти</h1>
          <p className="page-sub">CRM рієлтора · керування авто-спілкуванням Telegram юзербота</p>
        </div>
        <div className="row gap-8">
          <button className="btn btn-sm">
            <Icon name="filter" size={13} /> Фільтри
          </button>
          <button className="btn btn-sm btn-accent">
            <Icon name="plus" size={13} /> Новий клієнт
          </button>
        </div>
      </div>

      <div className="row gap-10" style={{ marginBottom: 14 }}>
        <input className="input" placeholder="Пошук по імені або @username..." style={{ maxWidth: 320 }} />
        <div className="row gap-6">
          <span className="chip active">Усі ({CLIENTS.length})</span>
          <span className="chip">Активні ({CLIENTS.filter((c) => c.status === "active").length})</span>
          <span className="chip">Пауза ({CLIENTS.filter((c) => c.status === "paused").length})</span>
          <span className="chip">Закриті ({CLIENTS.filter((c) => c.status === "closed").length})</span>
        </div>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th style={{ width: "26%" }}>Клієнт</th>
            <th>Критерії</th>
            <th style={{ width: 110 }}>Бюджет</th>
            <th style={{ width: 100, textAlign: "center" }}>Збігів</th>
            <th style={{ width: 130 }}>Авто-чат</th>
            <th style={{ width: 100 }}>Останнє</th>
            <th style={{ width: 110 }}>Статус</th>
            <th style={{ width: 40 }}></th>
          </tr>
        </thead>
        <tbody>
          {CLIENTS.map((c) => (
            <tr key={c.id} onClick={() => onOpen(c.id)}>
              <td>
                <div className="row gap-10">
                  <div className="avatar" style={{ background: "var(--bg-2)", color: "var(--text)" }}>
                    {c.initials}
                  </div>
                  <div>
                    <div className="name">{c.name}</div>
                    <div className="username">{c.username}</div>
                  </div>
                </div>
              </td>
              <td>
                <div
                  style={{ fontSize: 12.5, color: "var(--text-2)", maxWidth: 360, lineHeight: 1.4 }}
                >
                  {c.description}
                </div>
              </td>
              <td className="mono" style={{ fontSize: 12 }}>
                {c.budget}
              </td>
              <td style={{ textAlign: "center", fontWeight: 600, fontFeatureSettings: '"tnum"' }}>
                {c.matches}
              </td>
              <td>
                {c.autoEnabled ? (
                  <span className="badge accent">
                    <span className="badge-dot" />
                    увімк · {c.delay} хв
                  </span>
                ) : (
                  <span className="badge neutral">вимк</span>
                )}
              </td>
              <td className="muted" style={{ fontSize: 12 }}>
                {c.lastMsg}
              </td>
              <td>
                <StatusBadge status={c.status} />
              </td>
              <td>
                <button
                  className="btn btn-icon btn-ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <Icon name="more" size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
