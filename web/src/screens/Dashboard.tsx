import { Icon, type IconName } from "../components/Icon";
import { Sparkline } from "../components/Sparkline";
import { CLIENTS, SPARKS } from "../lib/mock";

interface ActivityItem {
  time: string;
  who: string;
  what: string;
  icon: IconName;
}

interface ParserRow {
  src: string;
  parsed: number;
  fresh: number;
  latency: string;
  status: "ok" | "warn";
}

const TODAY_ACTIVITY: ActivityItem[] = [
  { time: "16:42", who: "Данил Романчук", what: "відповів у Telegram", icon: "tg" },
  { time: "16:31", who: "AI-агент", what: "знайшов 3 нових збіги для @maria_gn", icon: "bolt" },
  { time: "16:18", who: "Парсер", what: "оновлено DOM.RIA — 14 нових оголошень", icon: "sync" },
  { time: "15:55", who: "Юлія Ткач", what: "прочитала повідомлення", icon: "eye" },
  { time: "15:40", who: "Парсер", what: "оновлено LUN — 8 нових оголошень", icon: "sync" },
  { time: "15:21", who: "AI-агент", what: "написав першим клієнту @nataliya_s", icon: "tg" },
  { time: "14:58", who: "Парсер", what: "оновлено OLX — 21 нове оголошення", icon: "sync" },
];

const PARSER_ROWS: ParserRow[] = [
  { src: "DOM.RIA", parsed: 247, fresh: 47, latency: "1.4 c", status: "ok" },
  { src: "LUN", parsed: 158, fresh: 23, latency: "0.9 c", status: "ok" },
  { src: "OLX", parsed: 312, fresh: 31, latency: "2.1 c", status: "warn" },
];

export function DashboardScreen() {
  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Дашборд</h1>
          <p className="page-sub">Метрики юзербота та активність парсера за сьогодні</p>
        </div>
        <div className="row gap-8">
          <div className="row gap-6 muted" style={{ fontSize: 12 }}>
            <span className="dot" /> Бот онлайн
          </div>
          <button className="btn btn-sm">Експорт CSV</button>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric">
          <div className="k">Надіслано</div>
          <div className="v">523</div>
          <div className="delta up">
            <Icon name="arrow-up" size={11} /> +18% до вчора
          </div>
          <div className="spark">
            <Sparkline data={SPARKS.sent} color="var(--accent)" />
          </div>
        </div>
        <div className="metric">
          <div className="k">Відповідей</div>
          <div className="v">147</div>
          <div className="delta up">
            <Icon name="arrow-up" size={11} /> +9% до вчора
          </div>
          <div className="spark">
            <Sparkline data={SPARKS.replied} color="oklch(0.58 0.12 150)" />
          </div>
        </div>
        <div className="metric">
          <div className="k">Нових збігів</div>
          <div className="v">38</div>
          <div className="delta up">
            <Icon name="arrow-up" size={11} /> +4 до вчора
          </div>
          <div className="spark">
            <Sparkline data={SPARKS.matches} color="oklch(0.72 0.13 75)" />
          </div>
        </div>
        <div className="metric">
          <div className="k">Конверсія</div>
          <div className="v">28.1%</div>
          <div className="delta down">
            <Icon name="arrow-down" size={11} /> -1.2% до вчора
          </div>
          <div className="spark">
            <Sparkline
              data={[28, 30, 31, 29, 32, 30, 28, 27, 29, 30, 28, 27, 28, 28]}
              color="oklch(0.55 0.16 25)"
            />
          </div>
        </div>
      </div>

      <div className="dash-grid">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Парсер по джерелах</h3>
            <span className="muted" style={{ fontSize: 11.5, marginLeft: "auto" }}>
              Останні 24 години
            </span>
          </div>
          <div className="card-body">
            {PARSER_ROWS.map((r) => (
              <div
                key={r.src}
                style={{
                  display: "grid",
                  gridTemplateColumns: "100px 1fr 80px 80px 80px 60px",
                  gap: 14,
                  alignItems: "center",
                  padding: "12px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div className="row gap-8">
                  <div className={`listing-source ${r.src.toLowerCase().replace(".", "")}`}>
                    {r.src.split(".")[0].toLowerCase()}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      height: 6,
                      background: "var(--bg-2)",
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${(r.parsed / 320) * 100}%`,
                        height: "100%",
                        background: r.status === "ok" ? "var(--accent)" : "var(--warning)",
                      }}
                    />
                  </div>
                </div>
                <div className="mono" style={{ fontSize: 12, fontFeatureSettings: '"tnum"' }}>
                  {r.parsed}
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 12,
                    fontFeatureSettings: '"tnum"',
                    color: "var(--accent)",
                  }}
                >
                  +{r.fresh}
                </div>
                <div className="muted mono" style={{ fontSize: 11.5 }}>
                  {r.latency}
                </div>
                <div>
                  {r.status === "ok" ? (
                    <span className="badge success">
                      <span className="badge-dot" />
                      ok
                    </span>
                  ) : (
                    <span className="badge warning">
                      <span className="badge-dot" />
                      slow
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="card-footer">
            <span className="muted" style={{ fontSize: 12 }}>
              Наступний запуск через{" "}
              <b className="mono" style={{ color: "var(--text)" }}>
                4 хв 12 с
              </b>
            </span>
            <button className="btn btn-sm" style={{ marginLeft: "auto" }}>
              <Icon name="bolt" size={13} /> Запустити зараз
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Топ клієнтів за активністю</h3>
          </div>
          <div className="card-body" style={{ padding: 8 }}>
            {CLIENTS.filter((c) => c.status === "active")
              .slice(0, 5)
              .map((c, i) => (
                <div
                  key={c.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 10px",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  <div className="muted mono" style={{ fontSize: 11, width: 14 }}>
                    {i + 1}
                  </div>
                  <div
                    className="avatar"
                    style={{ background: "var(--bg-2)", color: "var(--text)", fontSize: 11 }}
                  >
                    {c.initials}
                  </div>
                  <div className="flex-1" style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                    <div className="muted" style={{ fontSize: 11 }}>
                      {c.metrics.replied} відповідей · {c.matches} збігів
                    </div>
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: 12,
                      color: "var(--accent)",
                      fontFeatureSettings: '"tnum"',
                    }}
                  >
                    {Math.round((c.metrics.replied / c.metrics.sent) * 100)}%
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-header">
          <h3 className="card-title">Стрічка активності</h3>
        </div>
        <div className="card-body" style={{ padding: "8px 14px" }}>
          {TODAY_ACTIVITY.map((a, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "60px 28px 1fr",
                gap: 12,
                alignItems: "center",
                padding: "10px 0",
                borderBottom: i < TODAY_ACTIVITY.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <div className="muted mono" style={{ fontSize: 11.5 }}>
                {a.time}
              </div>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: "var(--bg-2)",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--text-2)",
                }}
              >
                <Icon name={a.icon} size={13} />
              </div>
              <div style={{ fontSize: 13 }}>
                <b style={{ fontWeight: 600 }}>{a.who}</b> <span className="muted">{a.what}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
