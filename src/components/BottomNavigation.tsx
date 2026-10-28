export type ScreenKey = "report" | "month" | "settings";

const TABS: { key: ScreenKey; label: string; icon: string }[] = [
  { key: "report", label: "דיווח", icon: "📝" },
  { key: "month", label: "החודש שלי", icon: "📅" },
  { key: "settings", label: "הגדרות", icon: "⚙️" },
];

export function BottomNavigation({
  active,
  onChange,
}: {
  active: ScreenKey;
  onChange: (key: ScreenKey) => void;
}) {
  return (
    <nav
      className="no-print fixed bottom-0 inset-x-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex justify-around pb-[env(safe-area-inset-bottom)] z-20"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
    >
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2.5 min-h-[56px] text-xs font-medium transition-colors ${
            active === tab.key
              ? "text-[var(--color-primary-dark)]"
              : "text-[var(--color-text-muted)]"
          }`}
        >
          <span className="text-xl leading-none">{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
