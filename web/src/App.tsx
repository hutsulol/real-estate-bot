import { useEffect, useState } from "react";
import { Icon, type IconName } from "./components/Icon";
import { TweaksPanel } from "./components/TweaksPanel";
import { LoginScreen } from "./screens/Login";
import { ChatScreen } from "./screens/Chat";
import { ListingsScreen } from "./screens/Listings";
import { ClientsScreen } from "./screens/Clients";
import { ClientDetailScreen } from "./screens/ClientDetail";
import { DashboardScreen } from "./screens/Dashboard";
import { ProfileScreen } from "./screens/Profile";
import type { Theme } from "./types";

type Tab = "chat" | "listings" | "clients" | "dashboard" | "profile";

interface TabDef {
  id: Tab;
  label: string;
  icon: IconName;
  badge?: string;
}

const TABS: TabDef[] = [
  { id: "chat", label: "Чат AI", icon: "chat" },
  { id: "listings", label: "Квартири", icon: "list", badge: "47" },
  { id: "clients", label: "Клієнти", icon: "users", badge: "7" },
  { id: "dashboard", label: "Дашборд", icon: "dash" },
  { id: "profile", label: "Профіль", icon: "user" },
];

export function App() {
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<Tab>("chat");
  const [openClient, setOpenClient] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  if (!authed) {
    return (
      <>
        <LoginScreen onLogin={() => setAuthed(true)} />
        <TweaksPanel theme={theme} onThemeChange={setTheme} />
      </>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">RP</div>
          <div className="col">
            <span className="brand-name">Rieltor Parser</span>
          </div>
        </div>

        <nav className="tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab ${tab === t.id ? "active" : ""}`}
              onClick={() => {
                setTab(t.id);
                setOpenClient(null);
              }}
            >
              <Icon name={t.icon} size={14} />
              {t.label}
              {t.badge && <span className="tab-badge">{t.badge}</span>}
            </button>
          ))}
        </nav>

        <div className="topbar-right">
          <div className="search-pill">
            <Icon name="search" size={13} />
            <span>Пошук...</span>
            <span className="kbd">⌘K</span>
          </div>
          <button className="btn btn-icon btn-ghost" title="Сповіщення">
            <Icon name="bolt" size={15} />
          </button>
          <div className="user-chip" onClick={() => setTab("profile")}>
            <div className="avatar">ДР</div>
            <div className="col" style={{ lineHeight: 1.2 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Данил Р.</span>
              <span className="muted" style={{ fontSize: 10.5 }}>
                Pro · IF
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="page">
        {tab === "chat" && <ChatScreen />}
        {tab === "listings" && <ListingsScreen />}
        {tab === "clients" && !openClient && <ClientsScreen onOpen={(id) => setOpenClient(id)} />}
        {tab === "clients" && openClient && (
          <ClientDetailScreen clientId={openClient} onBack={() => setOpenClient(null)} />
        )}
        {tab === "dashboard" && <DashboardScreen />}
        {tab === "profile" && <ProfileScreen />}
      </div>

      <TweaksPanel theme={theme} onThemeChange={setTheme} />
    </div>
  );
}
