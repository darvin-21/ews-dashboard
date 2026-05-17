import React, { useMemo, useState } from "react";
import { bandColor, bandFor, BAND_LABELS, fmt } from "../utils";

// Find the top N most-weighted indicators that are available in the assessment.
function topWeighted(assessment, n = 3) {
  const all = (assessment?.indicators || []).filter(s => s.available && s.weight_used > 0 && s.bucket_risk != null);
  all.sort((a, b) => (b.weight_used || 0) - (a.weight_used || 0));
  return all.slice(0, n);
}

// Recompute composite from indicator scores, optionally with overrides.
function recompose(indicators, overrides) {
  let wsum = 0, sum = 0;
  for (const s of indicators) {
    if (!s.available || s.bucket_risk == null || !s.weight_used) continue;
    const risk = overrides[s.code] != null ? overrides[s.code] : s.bucket_risk;
    sum += risk * s.weight_used;
    wsum += s.weight_used;
  }
  return wsum > 0 ? sum / wsum : 0;
}

export default function SensitivityPanel({ assessment }) {
  const top = useMemo(() => topWeighted(assessment, 3), [assessment]);
  const [overrides, setOverrides] = useState({});
  if (!assessment || top.length === 0) return null;
  const newScore = recompose(assessment.indicators, overrides);
  const newBand = bandFor(newScore);
  const baseScore = assessment.composite_score;
  const delta = newScore - baseScore;

  return (
    <div className="panel panel-pad">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h3 className="display text-lg">Sensitivity — what if?</h3>
        <span className="text-xs text-ink-500">Drag the sliders to see how the composite score moves</span>
      </div>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          {top.map((s) => {
            const v = overrides[s.code] != null ? overrides[s.code] : s.bucket_risk;
            return (
              <div key={s.code}>
                <div className="flex justify-between text-xs">
                  <span className="font-medium">{s.name}</span>
                  <span className="num text-ink-500">risk: <span className="font-semibold">{v.toFixed(0)}</span> / 100 (baseline {s.bucket_risk.toFixed(0)})</span>
                </div>
                <input type="range" min="0" max="100" step="1" value={v}
                  onChange={(e) => setOverrides({ ...overrides, [s.code]: Number(e.target.value) })}
                  className="w-full accent-amber-600" />
              </div>
            );
          })}
          <button onClick={() => setOverrides({})}
                  className="text-[11px] underline text-ink-500 hover:text-ink-800">Reset sliders</button>
        </div>
        <div className="text-center self-center">
          <div className="text-xs uppercase tracking-wider text-ink-500">Simulated score</div>
          <div className="text-4xl font-semibold num" style={{ color: bandColor(newBand) }}>{fmt(newScore, 1)}</div>
          <div className="text-xs mt-1"><span className={`chip chip-risk-${newBand}`}>{BAND_LABELS[newBand]}</span></div>
          <div className="text-[11px] text-ink-500 mt-2">
            Δ vs baseline: <span className={`num font-semibold ${delta >= 0 ? "text-red-600" : "text-emerald-600"}`}>
              {delta >= 0 ? "+" : ""}{delta.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
