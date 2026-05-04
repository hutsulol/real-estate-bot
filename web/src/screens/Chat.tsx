import { useEffect, useRef, useState } from "react";
import { Icon } from "../components/Icon";
import { ListingCard } from "../components/ListingCard";
import { SourceChip } from "../components/SourceChip";
import { listingToView, searchListings } from "../lib/api";
import { CHAT_HISTORY } from "../lib/mock";
import type { ChatMessage, ListingView, Source } from "../types";

interface ChatScreenProps {
  onPinTo?: (l: ListingView) => void;
}

const QUICK_PROMPTS = [
  { k: "1к до 35 000 USD", v: "будь-який район, будь-який стан" },
  { k: "Оренда від власника", v: "Каскад або Центр, до 18 000 UAH" },
  { k: "Новобудова 2020+", v: "Manhattan, Family Plaza, Up Hills" },
  { k: "Терміновий продаж", v: "знижено за останні 3 дні" },
];

export function ChatScreen({ onPinTo }: ChatScreenProps) {
  const [activeChat, setActiveChat] = useState("c1");
  const [sources, setSources] = useState<Record<Source, boolean>>({ ria: true, lun: true, olx: true });
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [thinking, setThinking] = useState(false);
  const streamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight;
  }, [messages, thinking]);

  const send = async (text?: string) => {
    const q = (text ?? draft).trim();
    if (!q) return;
    const userMsg: ChatMessage = { role: "user", text: q };
    setMessages((m) => [...m, userMsg]);
    setDraft("");
    setThinking(true);
    try {
      const results = await searchListings(q);
      const views = results.map(listingToView);
      const aiText = views.length
        ? `Знайшов ${views.length} варіантів за вашим запитом. Ось топ:`
        : "За цим запитом нічого не знайшов. Спробуйте змінити критерії.";
      setMessages((m) => [
        ...m,
        {
          role: "ai",
          text: aiText,
          tools: views.length
            ? [
                { src: "DOM.RIA", count: Math.ceil(views.length * 0.4), ok: true },
                { src: "LUN", count: Math.ceil(views.length * 0.3), ok: true },
                { src: "OLX", count: Math.ceil(views.length * 0.3), ok: true },
              ]
            : undefined,
          listings: views.slice(0, 6),
        },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "ai",
          text:
            "Не вдалось зв'язатись з парсером. Перевірте, що бекенд запущено: `node server.js` на http://localhost:3000.",
        },
      ]);
    } finally {
      setThinking(false);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="chat-shell">
      <aside className="chat-sidebar">
        <div className="chat-sidebar-h">
          <h3>Чати</h3>
          <button className="btn btn-icon btn-ghost" title="Новий чат">
            <Icon name="plus" size={14} />
          </button>
        </div>
        <div style={{ padding: "0 14px 10px" }}>
          <button className="btn" style={{ width: "100%", justifyContent: "flex-start", gap: 8 }}>
            <Icon name="plus" size={13} /> Новий пошук
          </button>
        </div>
        <div className="chat-list">
          {CHAT_HISTORY.map((c) => (
            <div
              key={c.id}
              className={`chat-list-item ${activeChat === c.id ? "active" : ""}`}
              onClick={() => setActiveChat(c.id)}
            >
              <span className="t">{c.title}</span>
              <span className="s">{c.sub}</span>
            </div>
          ))}
        </div>
        <div
          style={{
            padding: "12px 14px",
            borderTop: "1px solid var(--border)",
            fontSize: 11.5,
            color: "var(--text-3)",
          }}
        >
          <div className="row gap-6">
            <span className="dot" /> Парсер активний
          </div>
          <div className="muted" style={{ marginTop: 4 }}>
            3 джерела · оновлено 12 хв тому
          </div>
        </div>
      </aside>

      <main className="chat-main">
        <div className="chat-toolbar">
          <div className="row gap-8">
            <span className="muted" style={{ fontSize: 12 }}>
              Джерела:
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
          </div>
          <div style={{ marginLeft: "auto" }} className="row gap-8">
            <button className="btn btn-sm btn-ghost">
              <Icon name="filter" size={13} /> Фільтри
            </button>
            <button className="btn btn-sm">
              <Icon name="pin" size={13} /> Прикріпити до клієнта
            </button>
          </div>
        </div>

        <div className="chat-stream" ref={streamRef}>
          <div className="chat-inner">
            {messages.map((m, i) => (
              <Msg key={i} m={m} onPinTo={onPinTo} />
            ))}
            {thinking && (
              <div className="msg">
                <div className="msg-avatar ai">RP</div>
                <div className="msg-body">
                  <div className="msg-name">
                    AI-агент <span className="t">аналізує запит</span>
                  </div>
                  <div className="thinking">
                    <span className="dots">
                      <span />
                      <span />
                      <span />
                    </span>
                    Парсинг джерел та фільтрація...
                  </div>
                </div>
              </div>
            )}
            {messages.length < 1 && (
              <div style={{ marginTop: 24 }}>
                <div className="muted" style={{ fontSize: 12, marginBottom: 8, textAlign: "center" }}>
                  Швидкі промпти
                </div>
                <div className="quick-grid">
                  {QUICK_PROMPTS.map((q, i) => (
                    <button
                      key={i}
                      className="quick-card"
                      onClick={() => void send(`${q.k}, ${q.v}`)}
                    >
                      <div className="qk">{q.k}</div>
                      <div className="qv">{q.v}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="composer">
          <div className="composer-inner">
            <textarea
              placeholder="Опишіть, які квартири шукаємо… (наприклад: 3к, Каскад, до 70 000 USD, з ремонтом)"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKey}
              rows={1}
            />
            <div className="composer-row">
              <button className="btn btn-sm btn-ghost">
                <Icon name="plus" size={13} /> Контекст
              </button>
              <button className="btn btn-sm btn-ghost">
                <Icon name="filter" size={13} /> Фільтр
              </button>
              <span className="muted mono" style={{ marginLeft: "auto", fontSize: 11 }}>
                Enter — відправити
              </span>
              <button
                className="btn btn-accent btn-sm"
                onClick={() => void send()}
                disabled={!draft.trim()}
              >
                <Icon name="send" size={13} /> Запустити
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Msg({ m, onPinTo }: { m: ChatMessage; onPinTo?: (l: ListingView) => void }) {
  if (m.role === "user") {
    return (
      <div className="msg">
        <div className="msg-avatar user">ДР</div>
        <div className="msg-body">
          <div className="msg-name">
            Данил Романчук <span className="t">щойно</span>
          </div>
          <div className="msg-content">
            <p>{m.text}</p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="msg">
      <div className="msg-avatar ai">RP</div>
      <div className="msg-body">
        <div className="msg-name">
          AI-агент <span className="t">парсер v2.4</span>
        </div>
        <div className="msg-content">
          <p>{m.text}</p>
          {m.tools?.map((t, i) => (
            <div key={i} className="tool-call">
              <Icon name="sync" size={13} className="muted" />
              <span className="lbl">parse_source</span>
              <span className="src">→ {t.src}</span>
              <span className="muted">· {t.count} оголошень</span>
              <span className="tool-status">
                <Icon name="check" size={11} /> ok
              </span>
            </div>
          ))}
          {m.listings && m.listings.length > 0 && (
            <div className="listing-grid">
              {m.listings.map((l) => (
                <ListingCard key={l.id} data={l} onPin={() => onPinTo?.(l)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
