import React from "react";
import { bandChipClass, bandColor, BAND_LABELS, fmt } from "../utils";

function Gauge({ score, band }) {
  const s = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;
  const size = 140;
  const r = 60;
  const cx = size / 2;
  const cy = size / 2 + 8;
  const start = Math.PI; // 180deg
  const end = 0; // 0deg
  const arc = (from, to) => {
    const x1 = cx + r * Math.cos(from);
    const y1 = cy - r * Math.sin(from);
    const x2 = cx + r * Math.cos(to);
    const y2 = cy - r * Math.sin(to);
    const large = Math.abs(to - from) > Math.PI ? 1 : 0;
    const sweep = to < from ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} ${sweep} ${x2} ${y2}`;
  };
  // background full half-arc
  const bgPath = arc(start, end);
  // value: scale 0..100 across PI..0
  const valueAngle = start - (s / 100) * Math.PI;
  const valuePath = arc(start, valueAngle);
  const color = bandColor(band);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[180px]">
      <path d={bgPath} stroke="currentColor" strokeOpacity="0.12" strokeWidth="10" fill="none" strokeLinecap="round" />
      <path d={valuePath} stroke={color} strokeWidth="10" fill="none" strokeLinecap="round" />
      <text x={cx} y={cy - 4} textAnchor="middle" className="num"
            style={{ fontSize: 28, fontWeight: 600, fill: "currentColor" }}>
        {fmt(score, 1)}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle"
            style={{ fontSize: 10, fill: "currentColor", opacity: 0.6, letterSpacing: 1 }}>
        / 100
      </text>
    </svg>
  );
}

export default function RiskSummary({ assessment, country, sector }) {
  if (!assessment) {
    return (
      <div className="panel panel-pad">
        <div className="panel-title">Risk score</div>
        <p className="mt-2 text-sm text-ink-500">Loading…</p>
      </div>
    );
  }

  const a = assessment;
  const available = a.indicators.filter((i) => i.available).length;

  return (
    <div className="panel panel-pad">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="panel-title">Composite risk score</div>
          <div className="display text-3xl mt-1">
            {country?.name} <span className="text-ink-400">·</span> {sector?.name}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-ink-500 dark:text-ink-400">
            <span>Computed {new Date(a.computed_at).toLocaleString()}</span>
            <span>·</span>
            <span>Confidence {Math.round(a.composite_confidence * 100)}%</span>
            <span>·</span>
            <span>{available}/{a.indicators.length} indicators with data</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Gauge score={a.composite_score} band={a.band} />
          <span className={bandChipClass(a.band) + " text-sm px-3 py-1"}>
            {BAND_LABELS[a.band]} risk
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <Kpi label="Warning signals" value={a.warning_signals.length} tone={a.warning_signals.length ? "warn" : "calm"} />
        <Kpi label="Deteriorating" value={a.deteriorating.length} tone="warn" />
        <Kpi label="Improving" value={a.improving.length} tone="good" />
        <Kpi label="Coverage" value={`${Math.round((available / Math.max(1, a.indicators.length)) * 100)}%`} />
      </div>
    </div>
  );
}

function Kpi({ label, value, tone }) {
  const toneCls = {
    warn: "text-amber-700 dark:text-amber-300",
    good: "text-emerald-700 dark:text-emerald-300",
    calm: "text-ink-700 dark:text-ink-100",
  }[tone] || "text-ink-700 dark:text-ink-100";
  return (
    <div className="rounded-md border border-ink-200 dark:border-ink-700 p-3">
      <div className="panel-title">{label}</div>
      <div className={`mt-1 display text-2xl ${toneCls}`}>{value}</div>
    </div>
  );
}
