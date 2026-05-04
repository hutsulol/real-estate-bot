import type { ListingView } from "../types";
import { Icon } from "./Icon";

interface ListingCardProps {
  data: ListingView;
  onPin?: () => void;
}

function formatArea(d: ListingView): string | null {
  if (d.area && d.areaLiving && d.areaKitchen) {
    return `${d.area} / ${d.areaLiving} / ${d.areaKitchen} м²`;
  }
  if (d.area) return `${d.area} м²`;
  return null;
}

export function ListingCard({ data, onPin }: ListingCardProps) {
  const subtitle = data.complex && data.complex !== "—" ? data.complex : data.street;
  const titleParts = [
    data.rooms ? `${data.rooms}к` : null,
    formatArea(data),
    subtitle,
  ].filter(Boolean);
  const title = titleParts.length ? titleParts.join(" · ") : data.title;

  const dealBadge = data.dealType === "rent" ? "оренда" : data.dealType === "sale" ? "продаж" : null;

  return (
    <div className="listing">
      <div className="listing-h">
        <div>
          <div className="listing-price">
            {data.price.toLocaleString("uk-UA")}{" "}
            <span className="ccy">{data.currency}</span>
          </div>
          <div className="row gap-6" style={{ marginTop: 4 }}>
            {dealBadge && <span className="badge neutral">{dealBadge}</span>}
            {data.deal === "🔥 выгодно" && <span className="badge success">🔥 вигідно</span>}
            {data.deal === "дорого" && <span className="badge warning">дорого</span>}
            {data.posted && (
              <span className="muted" style={{ fontSize: 11.5 }}>
                {data.posted}
              </span>
            )}
          </div>
        </div>
        <span className={`listing-source ${data.source}`}>{data.source}</span>
      </div>

      {title && <div className="listing-title">{title}</div>}

      <div className="listing-meta">
        {data.district && (
          <>
            <div className="k">Район</div>
            <div>{data.district}</div>
          </>
        )}
        {data.complex && data.complex !== "—" && (
          <>
            <div className="k">ЖК</div>
            <div>{data.complex}</div>
          </>
        )}
        {data.street && (
          <>
            <div className="k">Адреса</div>
            <div>{data.street}</div>
          </>
        )}
        {data.floor != null && (
          <>
            <div className="k">Поверх</div>
            <div>{data.floors != null ? `${data.floor} / ${data.floors}` : data.floor}</div>
          </>
        )}
        {(data.area || data.areaLiving || data.areaKitchen) && (
          <>
            <div className="k">Площа</div>
            <div>{formatArea(data)}</div>
          </>
        )}
        {data.walls && (
          <>
            <div className="k">Стіни</div>
            <div>{data.walls}</div>
          </>
        )}
        {data.heating && (
          <>
            <div className="k">Опалення</div>
            <div>{data.heating}</div>
          </>
        )}
        {data.yearBuilt && (
          <>
            <div className="k">Рік</div>
            <div>{data.yearBuilt}</div>
          </>
        )}
        {data.hasRepair != null && (
          <>
            <div className="k">Ремонт</div>
            <div>{data.hasRepair ? "є" : "немає"}</div>
          </>
        )}
        {data.isSecondary != null && (
          <>
            <div className="k">Тип</div>
            <div>{data.isSecondary ? "вторинка" : "новобудова"}</div>
          </>
        )}
      </div>

      <div className="listing-foot">
        <button className="btn btn-sm btn-ghost" onClick={onPin}>
          <Icon name="pin" size={13} /> До клієнта
        </button>
        {data.link ? (
          <a
            href={data.link}
            target="_blank"
            rel="noreferrer"
            className="btn btn-sm btn-ghost"
            style={{ marginLeft: "auto" }}
          >
            <Icon name="ext" size={13} /> Оригінал
          </a>
        ) : (
          <button className="btn btn-sm btn-ghost" style={{ marginLeft: "auto" }}>
            <Icon name="ext" size={13} /> Оригінал
          </button>
        )}
      </div>
    </div>
  );
}
