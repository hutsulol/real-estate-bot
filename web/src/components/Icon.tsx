import type { ReactElement } from "react";

export type IconName =
  | "chat" | "list" | "users" | "dash" | "user" | "search" | "send" | "plus"
  | "check" | "x" | "ext" | "pin" | "filter" | "tg" | "github" | "mac" | "obs"
  | "bolt" | "trash" | "key" | "eye" | "logo" | "ria" | "lun" | "olx"
  | "pause" | "play" | "more" | "arrow-up" | "arrow-down" | "back"
  | "sun" | "moon" | "sync" | "shield" | "heart";

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

export function Icon({ name, size = 16, className = "" }: IconProps): ReactElement | null {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };
  switch (name) {
    case "chat": return <svg {...props}><path d="M21 12a8 8 0 1 1-3.4-6.55L21 4v5h-5"/><path d="M8 11h8M8 14h5"/></svg>;
    case "list": return <svg {...props}><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>;
    case "users": return <svg {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case "dash": return <svg {...props}><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>;
    case "user": return <svg {...props}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>;
    case "search": return <svg {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case "send": return <svg {...props}><path d="m4 12 16-8-6 16-2-7-8-1Z"/></svg>;
    case "plus": return <svg {...props}><path d="M12 5v14M5 12h14"/></svg>;
    case "check": return <svg {...props}><path d="m4 12 5 5L20 6"/></svg>;
    case "x": return <svg {...props}><path d="M6 6l12 12M18 6 6 18"/></svg>;
    case "ext": return <svg {...props}><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg>;
    case "pin": return <svg {...props}><path d="M12 2v6"/><path d="M5 8h14l-2 6H7L5 8Z"/><path d="M12 14v8"/></svg>;
    case "filter": return <svg {...props}><path d="M3 5h18M6 12h12M10 19h4"/></svg>;
    case "tg": return <svg {...props}><path d="M22 2 2 11l6 2 2 7 4-5 6 5L22 2Z"/></svg>;
    case "github": return <svg {...props}><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 6.77 5.07 5.07 0 0 0 19.91 3S18.73 2.65 16 4.5a13.38 13.38 0 0 0-7 0C6.27 2.65 5.09 3 5.09 3A5.07 5.07 0 0 0 5 6.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 20.13V24"/></svg>;
    case "mac": return <svg {...props}><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>;
    case "obs": return <svg {...props}><path d="M14 2 6 12l6 4 6-3-2-7-2-4Z"/><path d="M6 12 4 19l8 3 4-2"/></svg>;
    case "bolt": return <svg {...props}><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z"/></svg>;
    case "trash": return <svg {...props}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>;
    case "key": return <svg {...props}><circle cx="8" cy="15" r="4"/><path d="m11 12 9-9 3 3-3 3 2 2-3 3-2-2-3 3"/></svg>;
    case "eye": return <svg {...props}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>;
    case "logo": return <svg {...props}><path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-9Z"/></svg>;
    case "ria": return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/></svg>;
    case "lun": return <svg {...props}><path d="M21 12a9 9 0 1 1-9-9c0 5 4 9 9 9Z"/></svg>;
    case "olx": return <svg {...props}><path d="M4 6h6v12H4zM14 6l6 12M20 6l-6 12"/></svg>;
    case "pause": return <svg {...props}><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>;
    case "play": return <svg {...props}><path d="M6 4v16l14-8L6 4Z"/></svg>;
    case "more": return <svg {...props}><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>;
    case "arrow-up": return <svg {...props}><path d="M12 19V5M5 12l7-7 7 7"/></svg>;
    case "arrow-down": return <svg {...props}><path d="M12 5v14M5 12l7 7 7-7"/></svg>;
    case "back": return <svg {...props}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>;
    case "sun": return <svg {...props}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/></svg>;
    case "moon": return <svg {...props}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>;
    case "sync": return <svg {...props}><path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 12a9 9 0 0 1 15-6.7L21 8M3 21v-5h5M21 3v5h-5"/></svg>;
    case "shield": return <svg {...props}><path d="M12 2 4 5v7c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V5l-8-3Z"/></svg>;
    case "heart": return <svg {...props}><path d="M20.8 4.6a5.5 5.5 0 0 0-8.8 1.4 5.5 5.5 0 0 0-8.8-1.4C-1 9 12 21 12 21s13-12 8.8-16.4Z"/></svg>;
    default: return null;
  }
}
