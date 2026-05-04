import { useEffect, useState } from "react";
import { Icon } from "../components/Icon";
import { ListingCard } from "../components/ListingCard";
import { SourceChip } from "../components/SourceChip";
import { getAllListings, listingToView } from "../lib/api";
import type { ListingView, Source } from "../types";

type SortBy = "fresh" | "price" | "area";

export function ListingsScreen() {
  const [sources, setSources] = useState<Record<Source, boolean>>({ ria: true, lun: true, olx: true });
  const [sort, setSort] = useState<SortBy>("fresh");
  const [items, setItems] = useState<ListingView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await getAllListings({ limit: 100 });
      setItems(results.map(listingToView));
    } catch (e) {
      setError("Не вдалось завантажити дані. Перевірте, що бекенд запущено на http://localhost:3000.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = items.filter((l) => sources[l.source]);
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "price") return a.price - b.price;
    return 0;
  });

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Квартири</h1>
          <p className="page-sub">Результати парсингу за останні 24 години · Івано-Франківськ</p>
        </div>
        <div className="row gap-8">
          <button className="btn btn-sm" onClick={() => void load()} disabled={loading}>
            <Icon name="sync" size={13} /> Оновити
          </button>
          <button className="btn btn-sm btn-accent">
            <Icon name="bolt" size={13} /> Запустити парсер
          </button>
        </div>
      </div>

      <div className="filters-row">
        <span
          className="muted mono"
          style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.05em" }}
        >
          Джерела
        </span>
        <div className="source-chips">
          {(["ria", "lun", "olx"] as Source[]).map((s) => (
            <SourceChip
              key={s}
              src={s}
              active={sources[s]}
              onClick={() => setSources((p) => ({ ...p, [s]: !p[s] }))}
            />
          ))}
        </div>
        <div style={{ width: 1, height: 22, background: "var(--border)" }} />
        <div className="filter">
          <span className="k">Кімнат:</span>
          <span className="v">всі</span>
        </div>
        <div className="filter">
          <span className="k">Район:</span>
          <span className="v">всі</span>
        </div>
        <div className="filter">
          <span className="k">Ціна:</span>
          <span className="v">до 100 000 USD</span>
        </div>
        <div className="filter">
          <span className="k">Поверх:</span>
          <span className="v">2-9</span>
        </div>
        <div className="filter">
          <span className="k">Рік:</span>
          <span className="v">від 1985</span>
        </div>
        <div style={{ marginLeft: "auto" }} className="row gap-8">
          <span className="muted" style={{ fontSize: 12 }}>
            Сорт.:
          </span>
          <select
            className="select"
            style={{ width: 160, padding: "5px 10px", fontSize: 12 }}
            value={sort}
            onChange={(e) => setSort(e.target.value as SortBy)}
          >
            <option value="fresh">Найсвіжіші</option>
            <option value="price">За ціною</option>
            <option value="area">За площею</option>
          </select>
        </div>
      </div>

      <div className="row" style={{ marginBottom: 12, fontSize: 12, color: "var(--text-3)" }}>
        Показано <b style={{ color: "var(--text)" }}>&nbsp;{sorted.length}&nbsp;</b> з {items.length}{" "}
        оголошень
      </div>

      {error && (
        <div className="empty">
          <h3>Помилка з'єднання</h3>
          <p>{error}</p>
        </div>
      )}
      {!error && loading && (
        <div className="empty">
          <h3>Завантаження…</h3>
          <p>Тягнемо результати з бекенду</p>
        </div>
      )}
      {!error && !loading && sorted.length === 0 && (
        <div className="empty">
          <h3>Поки порожньо</h3>
          <p>Запустіть парсер, або змініть фільтри джерел</p>
        </div>
      )}

      <div className="listings-grid">
        {sorted.map((l) => (
          <ListingCard key={l.id} data={l} />
        ))}
      </div>
    </div>
  );
}
