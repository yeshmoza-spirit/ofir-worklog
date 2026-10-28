import { Card } from "./Card";

export function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "muted";
}) {
  return (
    <Card className="flex-1 text-center">
      <div className="text-sm text-[var(--color-text-muted)] mb-1">{label}</div>
      <div
        className={`text-xl font-bold ${
          tone === "muted" ? "text-[var(--color-warning)]" : "text-[var(--color-text)]"
        }`}
      >
        {value}
      </div>
    </Card>
  );
}
