import { useState } from "react";
import { Icon } from "../components/Icon";

interface LoginScreenProps {
  onLogin: () => void;
}

type Step = "idle" | "checking" | "granted" | "denied";

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState("d.romanchuk@if.realty");
  const [password, setPassword] = useState("••••••••••");
  const [step, setStep] = useState<Step>("idle");
  const [showPwd, setShowPwd] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("checking");
    setTimeout(() => setStep("granted"), 1400);
    setTimeout(() => onLogin(), 2400);
  };

  return (
    <div className="login-wrap">
      <div className="login-left">
        <div className="login-card">
          <div className="brand" style={{ marginBottom: 36 }}>
            <div className="brand-mark">RP</div>
            <div className="col">
              <span className="brand-name">Rieltor Parser</span>
              <span className="brand-sub">Івано-Франківськ</span>
            </div>
          </div>

          <h1 className="login-h">Вхід для рієлторів</h1>
          <p className="login-sub">Доступ за whitelist. Перевіримо ваш пристрій автоматично.</p>

          <form onSubmit={submit}>
            <div className="field">
              <label className="label">E-mail</label>
              <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label className="label">Пароль</label>
              <div style={{ position: "relative" }}>
                <input
                  className="input"
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingRight: 38 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="btn btn-ghost btn-icon"
                  style={{ position: "absolute", right: 4, top: 4 }}
                >
                  <Icon name="eye" size={14} />
                </button>
              </div>
            </div>

            <div
              style={{
                marginTop: 18,
                padding: "10px 12px",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 12,
                color: "var(--text-2)",
              }}
            >
              <Icon name="shield" size={14} className="muted" />
              <div className="flex-1">
                <div style={{ fontWeight: 500, color: "var(--text)" }}>Перевірка пристрою</div>
                <div className="muted mono" style={{ fontSize: 11, marginTop: 2 }}>
                  MAC: A4:83:E7:1C:9F:22
                </div>
              </div>
              {step === "idle" && <span className="badge neutral">очікує</span>}
              {step === "checking" && (
                <span className="badge warning">
                  <span className="badge-dot" />
                  перевірка
                </span>
              )}
              {step === "granted" && (
                <span className="badge success">
                  <Icon name="check" size={11} /> дозволено
                </span>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: "100%", marginTop: 18 }}
              disabled={step === "checking" || step === "granted"}
            >
              {step === "checking" ? "Перевіряємо..." : step === "granted" ? "Вхід виконано" : "Увійти"}
            </button>
          </form>

          <div style={{ marginTop: 24, fontSize: 12, color: "var(--text-3)", textAlign: "center" }}>
            Не маєте доступу? <a href="#">Запит до адміністратора</a>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="device-card">
          <div className="row gap-10" style={{ marginBottom: 14 }}>
            <Icon name="shield" size={16} />
            <div className="col flex-1">
              <div style={{ fontSize: 13, fontWeight: 600 }}>Whitelist пристроїв</div>
              <div className="muted" style={{ fontSize: 11.5 }}>
                Доступ дозволено лише з 2-х MAC-адрес
              </div>
            </div>
            <span className="badge success">
              <span className="badge-dot" />
              онлайн
            </span>
          </div>

          <div className="mac-row">
            <div className="mac-icon">
              <Icon name="mac" size={16} />
            </div>
            <div className="mac-info">
              <div className="n">
                Робочий ноутбук{" "}
                <span className="muted" style={{ fontSize: 11, fontWeight: 400 }}>
                  · основний
                </span>
              </div>
              <div className="a">A4:83:E7:1C:9F:22</div>
            </div>
            <div className="dot" />
          </div>
          <div className="mac-row">
            <div className="mac-icon">
              <Icon name="mac" size={16} />
            </div>
            <div className="mac-info">
              <div className="n">
                Домашній ПК{" "}
                <span className="muted" style={{ fontSize: 11, fontWeight: 400 }}>
                  · запасний
                </span>
              </div>
              <div className="a">B8:27:EB:54:11:8C</div>
            </div>
            <div className="dot warn" style={{ opacity: 0.6 }} />
          </div>

          <div
            style={{
              marginTop: 14,
              padding: "10px 12px",
              background: "var(--bg-2)",
              borderRadius: "var(--radius-sm)",
              fontSize: 11.5,
              color: "var(--text-3)",
            }}
          >
            Зміна MAC-адреси запасного пристрою доступна в профілі. Основну адресу змінює лише
            адміністратор.
          </div>
        </div>
      </div>
    </div>
  );
}
