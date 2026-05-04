import type { ClientStatus } from "../types";

const MAP: Record<ClientStatus, { cls: string; label: string }> = {
  active: { cls: "success", label: "Активний" },
  paused: { cls: "warning", label: "Пауза" },
  closed: { cls: "neutral", label: "Закритий" },
};

export function StatusBadge({ status }: { status: ClientStatus }) {
  const m = MAP[status] ?? MAP.active;
  return (
    <span className={`badge ${m.cls}`}>
      <span className="badge-dot" />
      {m.label}
    </span>
  );
}
