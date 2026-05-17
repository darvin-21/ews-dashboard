import React, { useEffect, useState } from "react";
import { api } from "../api";
import { bandColor, bandFor, fmt } from "../utils";

export default function Heatmap({ countries, indicatorsCatalog, selectedCodes }) {
  const [cells, setCells] = useState(null);
  const [err, setErr] = useState(null);

  // Limit dimensions for legibility
  const visIso3s = countries.slice(0, 14).map((c) => c.iso3);
  const visCodes = (selectedCodes && selectedCodes.length
    ? selectedCodes
    : indicatorsCatalog
        .filter((i) => ["macro", "fiscal", "external", "credit", "real_economy"].includes(i.category))
        .map((i) => i.code)
  ).slice(0, 10);

  useEffect(() => {
    let cancelled = false;
    setCells(null); setErr(null);
    api.heatmap({ countries: visIso3s, codes: visCodes })
      .then((d) => { if (!cancelled) setCells(d.cells); })
      .catch((e) => { if (!cancelled) setErr(e.message); });
    return () => { cancelled = true; };
  }, [visIso3s.join(","), visCodes.join(",")]);

  if (err) return <div className="panel panel-pad text-sm text-red-600">Error: {err}</div>;
  if (!cells) return <div className="panel panel-pad text-sm text-ink-500">Loading heatmap…</div>;

  // Build lookup
  const lookup = new Map();
  cells.forEach((c) => lookup.set(`${c.country}|${c.code}`, c));

  const codeNames = visCodes.map((c) => {
    const ind = indicatorsCatalog.find((i) => i.code === c);
    return { code: c, name: ind?.name || c };
  });

  return (
    <div className="panel panel-pad overflow-x-auto">
      <div className="flex items-baseline justify-between mb-2">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="display text-lg">Risk heatmap</h2>
        <div className="flex items-center gap-2 text-xs">
          <label className="text-ink-500">As of:</label>
          <input type="range" min="2000" max={currentYear} step="1" value={asOfYear}
                 onChange={(e) => setAsOfYear(Number(e.target.value))}
                 className="accent-amber-600 w-48" />
          <span className="num font-semibold w-12 text-right">{asOfYear}</span>
        </div>
      </div>
      <h2 style={{display:"none"}}>Risk heatmap</h2>
        <span className="text-xs text-ink-500">{visIso3s.length} countries × {visCodes.length} indicators</span>
      </div>
      <table className="text-xs min-w-full">
        <thead>
          <tr>
            <th className="text-left p-1.5 panel-title sticky left-0 bg-white dark:bg-ink-800">Country</th>
            {codeNames.map((c) => (
              <th key={c.code} className="text-left p-1.5 panel-title whitespace-nowrap">
                <span title={c.name}>{c.code}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visIso3s.map((iso) => {
            const country = countries.find((c) => c.iso3 === iso);
            return (
              <tr key={iso} className="border-t border-ink-100 dark:border-ink-700">
                <td className="p-1.5 font-medium sticky left-0 bg-white dark:bg-ink-800 whitespace-nowrap">
                  {country?.name} <span className="text-ink-400 num">({iso})</span>
                </td>
                {visCodes.map((code) => {
                  const cell = lookup.get(`${iso}|${code}`);
                  if (!cell || !cell.available) {
                    return (
                      <td key={code} className="p-1 align-middle">
                        <div className="w-full h-7 rounded bg-ink-100/60 dark:bg-ink-700/40 grid place-items-center text-[10px] text-ink-400">
                          n/a
                        </div>
                      </td>
                    );
                  }
                  const band = bandFor(cell.risk);
                  const color = bandColor(band);
                  return (
                    <td key={code} className="p-1">
                      <a
                        href={cell.source_url}
                        target="_blank"
                        rel="noreferrer"
                        title={`${cell.value != null ? fmt(cell.value) : "n/a"} (${cell.period}) — risk ${Math.round(cell.risk)} — ${cell.source}`}
                        className="block w-full h-7 rounded text-center num text-[10px] grid place-items-center text-white"
                        style={{ background: color, opacity: 0.4 + 0.6 * (cell.risk / 100) }}
                      >
                        {fmt(cell.value)}
                      </a>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-ink-500">
        <span>Risk colour</span>
        {["low", "moderate", "high", "critical"].map((b) => (
          <span key={b} className="inline-flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded" style={{ background: bandColor(b) }} />
            {b}
          </span>
        ))}
        <span className="ml-auto">Cells link to the underlying source.</span>
      </div>
    </div>
  );
}
