import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { bandColor } from "../utils";

export default function ConstellationView({ sector }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.constellation({ sector }).then(setData).catch(console.error);
  }, [sector]);

  const W = 760, H = 460, M = 50;
  const points = data?.points || [];
  return (
    <div className="panel panel-pad">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h3 className="display text-lg">Risk constellation</h3>
        <span className="text-xs text-ink-500">x = composite risk · y = data confidence · bubble size = # warnings</span>
      </div>
      <p className="text-xs text-ink-500 mt-1 leading-snug">
        Each dot is a country in the <strong>{sector}</strong> sector. Move right = riskier.
        Move up = more data coverage. Bigger bubble = more warning signals firing.
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-3" style={{ background: "var(--tw-bg-opacity, 1) rgb(250 250 247 / 0.5)" }}>
        {/* axes */}
        <line x1={M} y1={H - M} x2={W - M} y2={H - M} stroke="currentColor" strokeOpacity="0.2" />
        <line x1={M} y1={M} x2={M} y2={H - M} stroke="currentColor" strokeOpacity="0.2" />
        {/* gridlines for risk bands at 40/70/90 */}
        {[40, 70, 90].map(v => {
          const x = M + (v / 100) * (W - 2 * M);
          return (
            <g key={v}>
              <line x1={x} y1={M} x2={x} y2={H - M} stroke="currentColor" strokeOpacity="0.08" strokeDasharray="4 4" />
              <text x={x} y={H - M + 16} textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.5">{v}</text>
            </g>
          );
        })}
        <text x={W / 2} y={H - 12} textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.7">Composite risk →</text>
        <text x={14} y={H / 2} textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.7" transform={`rotate(-90 14 ${H / 2})`}>Confidence →</text>
        {/* dots */}
        {points.map(p => {
          const x = M + (Math.max(0, Math.min(100, p.score)) / 100) * (W - 2 * M);
          const y = (H - M) - (Math.max(0, Math.min(100, p.confidence)) / 100) * (H - 2 * M);
          const r = 6 + Math.min(p.warnings || 0, 10) * 1.6;
          return (
            <g key={p.iso3}>
              <circle cx={x} cy={y} r={r} fill={bandColor(p.band)} fillOpacity="0.7" stroke={bandColor(p.band)} strokeWidth="1.5" />
              <text x={x} y={y + r + 11} textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.8">{p.iso3}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
