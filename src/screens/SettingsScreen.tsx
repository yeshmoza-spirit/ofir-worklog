import { useMemo, useRef, useState } from "react";
import { Card } from "../components/Card";
import type { RateType, Workplace } from "../types";
import {
  exportBackup,
  getGroups,
  getWorkplaces,
  importBackup,
  saveGroup,
  saveWorkplace,
  setGroupActive,
  setWorkplaceActive,
} from "../services/worklogService";
import { agorotToShekels, shekelsToAgorot } from "../utils/money";
import { downloadFile } from "../utils/exportCsv";

export function SettingsScreen() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedWorkplaceId, setExpandedWorkplaceId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [showNewWorkplace, setShowNewWorkplace] = useState(false);
  const [newWpName, setNewWpName] = useState("");
  const [newWpRate, setNewWpRate] = useState("");
  const [newWpRateType, setNewWpRateType] = useState<RateType>("hourly");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const workplaces = useMemo(() => getWorkplaces(true), [refreshKey]);

  function refresh() {
    setRefreshKey((k) => k + 1);
  }

  function updateRate(wp: Workplace, shekels: string) {
    saveWorkplace({ ...wp, defaultRateAgorot: shekelsToAgorot(Number(shekels)) });
    refresh();
  }

  function updateRateType(wp: Workplace, rateType: RateType) {
    saveWorkplace({ ...wp, rateType });
    refresh();
  }

  function toggleActive(wp: Workplace) {
    setWorkplaceActive(wp.id, !wp.active);
    refresh();
  }

  function addWorkplace() {
    if (!newWpName.trim() || !newWpRate) return;
    saveWorkplace({
      name: newWpName.trim(),
      defaultRateAgorot: shekelsToAgorot(Number(newWpRate)),
      rateType: newWpRateType,
      active: true,
    });
    setNewWpName("");
    setNewWpRate("");
    setShowNewWorkplace(false);
    refresh();
  }

  function addGroup(workplaceId: string) {
    if (!newGroupName.trim()) return;
    saveGroup({ workplaceId, name: newGroupName.trim(), active: true });
    setNewGroupName("");
    refresh();
  }

  function handleExportBackup() {
    const json = exportBackup();
    downloadFile(
      `worklog-backup-${new Date().toISOString().slice(0, 10)}.json`,
      json,
      "application/json;charset=utf-8;"
    );
  }

  function handleImportBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importBackup(String(reader.result));
        refresh();
        alert("הגיבוי יובא בהצלחה");
      } catch {
        alert("קובץ הגיבוי לא תקין");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div className="max-w-xl mx-auto px-4 pt-5 pb-28 space-y-5">
      <h1 className="text-xl font-bold">הגדרות</h1>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-bold">מקומות עבודה</h2>
          <button
            className="text-sm text-[var(--color-primary-dark)] font-medium"
            onClick={() => setShowNewWorkplace((v) => !v)}
          >
            {showNewWorkplace ? "סגירה" : "+ מקום עבודה חדש"}
          </button>
        </div>

        {showNewWorkplace && (
          <Card className="mb-3 space-y-2">
            <input
              className="w-full border border-[var(--color-border)] rounded-xl px-3 py-2.5 min-h-[44px] bg-white"
              placeholder="שם מקום העבודה"
              value={newWpName}
              onChange={(e) => setNewWpName(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                className="w-full border border-[var(--color-border)] rounded-xl px-3 py-2.5 min-h-[44px] bg-white"
                placeholder="תעריף ברירת מחדל (₪)"
                value={newWpRate}
                onChange={(e) => setNewWpRate(e.target.value)}
              />
              <select
                className="w-full border border-[var(--color-border)] rounded-xl px-3 py-2.5 min-h-[44px] bg-white"
                value={newWpRateType}
                onChange={(e) => setNewWpRateType(e.target.value as RateType)}
              >
                <option value="hourly">לפי שעה</option>
                <option value="per_session">מחיר קבוע לשיעור</option>
              </select>
            </div>
            <button
              onClick={addWorkplace}
              className="w-full bg-[var(--color-primary)] text-white rounded-xl py-2.5 font-medium min-h-[44px]"
            >
              הוספה
            </button>
          </Card>
        )}

        <div className="space-y-2">
          {workplaces.map((wp) => {
            const groups = getGroups(wp.id, true);
            const expanded = expandedWorkplaceId === wp.id;
            return (
              <Card key={wp.id} className={!wp.active ? "opacity-50" : ""}>
                <button
                  className="w-full flex items-center justify-between text-right"
                  onClick={() => setExpandedWorkplaceId(expanded ? null : wp.id)}
                >
                  <span className="font-semibold">{wp.name}</span>
                  <span className="text-sm text-[var(--color-text-muted)]">
                    {agorotToShekels(wp.defaultRateAgorot)} ₪{" "}
                    {wp.rateType === "hourly" ? "לשעה" : "לשיעור"}
                  </span>
                </button>

                {expanded && (
                  <div className="mt-3 space-y-3 border-t border-[var(--color-border)] pt-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-[var(--color-text-muted)] mb-1">
                          תעריף ברירת מחדל
                        </label>
                        <input
                          type="number"
                          defaultValue={agorotToShekels(wp.defaultRateAgorot)}
                          onBlur={(e) => updateRate(wp, e.target.value)}
                          className="w-full border border-[var(--color-border)] rounded-xl px-3 py-2 min-h-[44px] bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--color-text-muted)] mb-1">
                          סוג תעריף
                        </label>
                        <select
                          value={wp.rateType}
                          onChange={(e) => updateRateType(wp, e.target.value as RateType)}
                          className="w-full border border-[var(--color-border)] rounded-xl px-3 py-2 min-h-[44px] bg-white"
                        >
                          <option value="hourly">לפי שעה</option>
                          <option value="per_session">מחיר קבוע לשיעור</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-[var(--color-text-muted)] mb-1">
                        קבוצות / כיתות
                      </div>
                      <div className="space-y-1">
                        {groups.map((g) => (
                          <div
                            key={g.id}
                            className="flex items-center justify-between text-sm py-1"
                          >
                            <span className={!g.active ? "line-through text-[var(--color-text-muted)]" : ""}>
                              {g.name}
                            </span>
                            <button
                              className="text-xs text-[var(--color-text-muted)] underline"
                              onClick={() => {
                                setGroupActive(g.id, !g.active);
                                refresh();
                              }}
                            >
                              {g.active ? "השבתה" : "הפעלה"}
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <input
                          className="flex-1 border border-[var(--color-border)] rounded-xl px-3 py-2 min-h-[44px] bg-white text-sm"
                          placeholder="קבוצה חדשה"
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                        />
                        <button
                          onClick={() => addGroup(wp.id)}
                          className="px-3 py-2 min-h-[44px] rounded-xl bg-[var(--color-primary)] text-white text-sm"
                        >
                          הוספה
                        </button>
                      </div>
                    </div>

                    <button
                      className="text-sm text-[var(--color-warning)] underline"
                      onClick={() => toggleActive(wp)}
                    >
                      {wp.active ? "השבתת מקום העבודה" : "הפעלת מקום העבודה"}
                    </button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      <Card>
        <h2 className="text-base font-bold mb-2">גיבוי ושחזור</h2>
        <div className="flex gap-2">
          <button
            onClick={handleExportBackup}
            className="flex-1 border border-[var(--color-border)] rounded-xl py-2.5 font-medium min-h-[44px]"
          >
            ייצוא גיבוי
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 border border-[var(--color-border)] rounded-xl py-2.5 font-medium min-h-[44px]"
          >
            ייבוא גיבוי
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImportBackup}
          />
        </div>
      </Card>

      <Card className="text-center text-xs text-[var(--color-text-muted)]">
        פותח על ידי SPIRIT MEDIA AI
      </Card>
    </div>
  );
}
