import { useState, type ReactNode } from "react";
import type { Theme } from "../types";

interface TweaksPanelProps {
  theme: Theme;
  onThemeChange: (t: Theme) => void;
}

export function TweaksPanel({ theme, onThemeChange }: TweaksPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Tweaks"
        className="twk-trigger"
        aria-label="Open tweaks"
      >
        ⚙
      </button>
      {open && (
        <div className="twk-panel">
          <div className="twk-hd">
            <b>Tweaks</b>
            <button
              className="twk-x"
              type="button"
              aria-label="Close tweaks"
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
          </div>
          <div className="twk-body">
            <div className="twk-sect">Тема інтерфейсу</div>
            <div className="twk-row">
              <div className="twk-seg" role="radiogroup">
                <div
                  className="twk-seg-thumb"
                  style={{
                    left: `calc(2px + ${theme === "dark" ? 1 : 0} * (100% - 4px) / 2)`,
                    width: `calc((100% - 4px) / 2)`,
                  }}
                />
                <button
                  type="button"
                  role="radio"
                  aria-checked={theme === "light"}
                  onClick={() => onThemeChange("light")}
                >
                  Світла
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={theme === "dark"}
                  onClick={() => onThemeChange("dark")}
                >
                  Темна
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
