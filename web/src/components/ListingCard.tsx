import type { ListingView } from "../types";
import { Icon } from "./Icon";

interface ListingCardProps {
  data: ListingView;
  onPin?: () => void;
}

export function ListingCard({ data, onPin }: ListingCardProps) {
  const subtitle = data.complex && data.complex !== "—" ? data.complex : data.street;
  const title =
    data.title ??
    [
      data.rooms ? `${data.rooms}к` : null,
      data.area ? `${data.area} м²` : null,
      subtitle,
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    <div className="listing">
      <div className="listing-h">
        <div>
          <div className="listing-price">
            {data.price.toLocaleString("uk-UA")}{" "}
            <span className="ccy">{data.currency}</span>
          </div>
          {data.posted && (
            <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
              {data.posted}
            </div>
          )}
        </div>
        <span className={`listing-source ${data.source}`}>{data.source}</span>
      </div>
      <div className="listing-title">{title}</div>
      <div className="listing-meta">
        {data.district && (
          <>
            <div className="k">Район</div>
            <div>{data.district}</div>
          </>
        )}
        {data.street && (
          <>
            <div className="k">Адреса</div>
            <div>{data.street}</div>
          </>
        )}
        {data.floor && data.floors && (
          <>
            <div className="k">Поверх</div>
            <div>
              {data.floor} / {data.floors}
            </div>
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
        {data.deal && (
          <>
            <div className="k">Оцінка</div>
            <div>{data.deal}</div>
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
