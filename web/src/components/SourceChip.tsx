import type { Source } from "../types";

const LABELS: Record<Source, string> = { ria: "DOM.RIA", lun: "LUN", olx: "OLX" };

interface SourceChipProps {
  src: Source;
  active: boolean;
  onClick: () => void;
}

export function SourceChip({ src, active, onClick }: SourceChipProps) {
  return (
    <button className={`chip ${active ? "active" : ""}`} onClick={onClick}>
      <span
        className="badge-dot"
        style={{ background: active ? "var(--bg)" : "var(--text-3)" }}
      />
      {LABELS[src]}
    </button>
  );
}
