import React from "react";
import InfoTip from "./InfoTip";
import { bandColor, BAND_LABELS, fmt } from "../utils";

function MiniGauge({ score, band }) {
  const s = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;
  const size = 90, r = 38, cx = size / 2, cy = size / 2 + 6;
  const start = Math.PI, end = 0;
  const arc = (from, to) => {
    const x1 = cx + r * Math.cos(from), y1 = cy - r * Math.sin(from);
    const x2 = cx + r * Math.cos(to),   y2 = cy - r * Math.sin(to);
    return `M ${x1} ${y1} A ${r} ${r} 0 0 ${to < from ? 1 : 0} ${x2} ${y2}`;
  };
  const valueAngle = start - (s / 100) * Math.PI;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[110px]">
      <path d={arc(start, end)} stroke="currentColor" strokeOpacity="0.12" strokeWidth="8" fill="none" strokeLinecap="round" />
      <path d={arc(start, valueAngle)} stroke={bandColor(band)} strokeWidth="8" fill="none" strokeLinecap="round" />
      <text x={cx} y={cy - 2} textAnchor="middle" className="num"
            style={{ fontSize: 18, fontWeight: 600, fill: "currentColor" }}>{fmt(score, 1)}</text>
      <text x={cx} y={cy + 12} textAnchor="middle"
            style={{ fontSize: 8, fill: "currentColor", opacity: 0.6, letterSpacing: 1 }}>/ 100</text>
    </svg>
  );
}

export default function ComparisonView({
  countries, selected, setSelected, result, loading, sectorLabel,
}) {
  const canAdd = selected.length < 4;
  const remaining = countries.filter((c) => !selected.includes(c.iso3));

  const toggleCountry = (iso3) => {
    if (selected.includes(iso3)) setSelected(selected.filter((c) => c !== iso3));
    else if (canAdd) setSelected([...selected, iso3]);
  };

  // Build comparison rows: collect all indicators present in any assessment
  const items = result?.items || [];
  const indicatorMap = new Map();
  for (const a of items) {
    for (const s of a.indicators) {
      if (!indicatorMap.has(s.code)) indicatorMap.set(s.code, { code: s.code, name: s.name, unit: s.unit, source: s.source });
    }
  }
  const rows = Array.from(indicatorMap.values());

  // For each indicator, find the riskiest cell (highest bucket_risk available)
  const cellByCountryCode = new Map();
  for (const a of items) {
    for (const s of a.indicators) {
      cellByCountryCode.set(`${a.country_iso3}|${s.code}`, s);
    }
  }

  return (
    <>
      <div className="panel panel-pad">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <h2 className="display text-xl">Compare countries</h2>
          <span className="text-xs text-ink-500">Sector: {sectorLabel} · {selected.length}/4 selected</span>
        </div>
        <p className="text-xs text-ink-500 mt-1 leading-snug">
          Pick 2–4 economies. The dashboard runs them through the same scoring model and surfaces the
          biggest gaps, the riskiest single indicator, and a written reality-check at the top.
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {selected.map((iso3) => {
            const c = countries.find((x) => x.iso3 === iso3);
            return (
              <button key={iso3} onClick={() => toggleCountry(iso3)}
                      className="text-xs px-2.5 py-1 rounded-full bg-ink-800 text-ink-50 hover:bg-ink-700 dark:bg-ink-100 dark:text-ink-900"
                      title="Click to remove">
                {c?.name || iso3} ×
              </button>
            );
          })}
          {selected.length === 0 && (
            <span className="text-xs text-ink-400 italic">No countries selected yet — pick from the list below.</span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto">
          {remaining.map((c) => (
            <button key={c.iso3} onClick={() => toggleCountry(c.iso3)} disabled={!canAdd}
                    className={`text-xs px-2.5 py-1 rounded-full border ${
                      canAdd ? "border-ink-300 hover:border-ink-500" : "border-ink-200 text-ink-400 cursor-not-allowed"
                    }`}>
              + {c.name}
            </button>
          ))}
        </div>
      </div>

      {selected.length < 2 && (
        <div className="panel panel-pad text-sm text-ink-500 italic">
          Select at least 2 countries to begin the comparison.
        </div>
      )}

      {loading && (
        <div className="panel panel-pad text-sm text-ink-500">Computing comparison…</div>
      )}

      {result?.commentary && (
        <div className="panel panel-pad bg-amber-50/40 dark:bg-amber-900/10 border-l-4 border-amber-500">
          <span className="text-xs uppercase tracking-wider font-semibold text-amber-700 dark:text-amber-300">
            Reality check
          </span>
          <p className="mt-2 text-sm leading-relaxed text-ink-700 dark:text-ink-200">
            {result.commentary}
          </p>
        </div>
      )}

      {items.length >= 2 && (
        <div className="panel panel-pad">
          <h3 className="display text-lg mb-3">Composite scores</h3>
          <div className={`grid grid-cols-2 md:grid-cols-${Math.min(items.length, 4)} gap-3`}>
            {items.map((a) => (
              <div key={a.country_iso3} className="text-center p-3 border border-ink-200 dark:border-ink-700 rounded">
                <div className="text-xs uppercase tracking-wider text-ink-500">{a.country_iso3}</div>
                <MiniGauge score={a.composite_score} band={a.band} />
                <div className="text-xs mt-1"><span className={`chip chip-risk-${a.band}`}>{BAND_LABELS[a.band]}</span></div>
                <div className="text-[10px] text-ink-500 mt-1">
                  {a.warning_signals.length} warning · {a.deteriorating.length} deteriorating
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {items.length >= 2 && rows.length > 0 && (
        <div className="panel panel-pad overflow-x-auto">
          <h3 className="display text-lg mb-3">Indicator-by-indicator</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-ink-500 border-b border-ink-200 dark:border-ink-700">
                <th className="py-2 pr-3 font-medium">Indicator</th>
                {items.map((a) => (
                  <th key={a.country_iso3} className="py-2 px-2 font-medium text-center">{a.country_iso3}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                // determine which cell has highest risk for color emphasis
                let maxRisk = -1, maxIso = null;
                items.forEach((a) => {
                  const s = cellByCountryCode.get(`${a.country_iso3}|${r.code}`);
                  if (s && s.available && s.bucket_risk != null && s.bucket_risk > maxRisk) {
                    maxRisk = s.bucket_risk;
                    maxIso = a.country_iso3;
                  }
                });
                return (
                  <tr key={r.code} className="border-b border-ink-100 dark:border-ink-800">
                    <td className="py-2 pr-3">
                      <div className="font-medium">{r.name}<InfoTip code={r.code} /></div>
                      <div className="text-[10px] text-ink-500">{r.source}</div>
                    </td>
                    {items.map((a) => {
                      const s = cellByCountryCode.get(`${a.country_iso3}|${r.code}`);
                      if (!s || !s.available) {
                        return <td key={a.country_iso3} className="py-2 px-2 text-center text-ink-400 italic">—</td>;
                      }
                      const isMax = a.country_iso3 === maxIso && items.length > 1;
                      return (
                        <td key={a.country_iso3} className={`py-2 px-2 text-center ${
                          isMax ? "bg-red-50 dark:bg-red-900/20 font-semibold" : ""
                        }`}>
                          <div className="num">{typeof s.value === "number" ? s.value.toFixed(2) : s.value}</div>
                          <div className="text-[10px] text-ink-500">{s.unit} · risk {s.bucket_risk ?? "—"}</div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-[10px] text-ink-500 italic">
            Highlighted cell in each row = country with the highest bucket-risk for that indicator.
          </p>
        </div>
      )}
    </>
  );
}
