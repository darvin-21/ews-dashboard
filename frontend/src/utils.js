// Utility helpers: risk band styling, number formatting, CSV export, PDF print.

export function bandFor(score) {
  if (score == null || Number.isNaN(score)) return "unknown";
  if (score <= 40) return "low";
  if (score <= 70) return "moderate";
  if (score <= 90) return "high";
  return "critical";
}

export const BAND_LABELS = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
  critical: "Critical",
  unknown: "Unknown",
};

export function bandChipClass(band) {
  return `chip chip-risk-${band}`;
}

export function bandColor(band) {
  switch (band) {
    case "low": return "#10b981";
    case "moderate": return "#f59e0b";
    case "high": return "#ef4444";
    case "critical": return "#7c2d12";
    default: return "#6b7280";
  }
}

export function fmt(v, decimals = 2) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  if (Math.abs(v) >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return Number(v).toFixed(decimals);
}

export function fmtPct(v, decimals = 2) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return Number(v).toFixed(decimals) + "%";
}

export function exportCsv(filename, rows) {
  if (!rows || !rows.length) return;
  const keys = Object.keys(rows[0]);
  const lines = [keys.join(",")];
  for (const row of rows) {
    lines.push(
      keys
        .map((k) => {
          const v = row[k];
          if (v === null || v === undefined) return "";
          const s = String(v).replace(/"/g, '""');
          return /[",\n]/.test(s) ? `"${s}"` : s;
        })
        .join(",")
    );
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function printPdf() {
  // Browser print dialog → "Save as PDF" is the simplest, dependency-free route.
  window.print();
}

export function timeAgo(iso) {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const s = Math.round(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

// ---------- Indicator metadata cache (populated by App.jsx on load) ----------
let _indicatorMetaCache = {};
export function setIndicatorMetaCache(items) {
  _indicatorMetaCache = {};
  for (const i of items || []) _indicatorMetaCache[i.code] = i;
}
export function getIndicatorMeta(code) {
  return _indicatorMetaCache[code] || null;
}

const DIRECTION_LABEL = {
  higher_is_riskier: "Higher values signal more risk",
  lower_is_riskier: "Lower values signal more risk",
};
const SOURCE_LABEL = {
  WORLD_BANK: "World Bank WDI", IMF: "IMF DataMapper",
  FRED: "FRED (St. Louis Fed)", ECB: "ECB Data Warehouse",
  BIS: "BIS Statistics", OECD: "OECD Data",
};

export function indicatorTooltip(code) {
  const m = getIndicatorMeta(code);
  if (!m) return null;
  return {
    name: m.name,
    notes: m.notes || "",
    source: SOURCE_LABEL[m.source] || m.source,
    sourceCode: m.source,
    frequency: m.frequency,
    unit: m.unit,
    directionText: DIRECTION_LABEL[m.direction] || "",
    buckets: m.buckets || [],
    seriesId: m.source_series_id,
  };
}
