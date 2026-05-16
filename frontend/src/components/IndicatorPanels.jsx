import React from "react";
import { fmt } from "../utils";

function arrow(dir) {
  if (dir === "deteriorating") return <span className="text-amber-600 dark:text-amber-400">▲</span>;
  if (dir === "improving") return <span className="text-emerald-600 dark:text-emerald-400">▼</span>;
  return <span className="text-ink-400">•</span>;
}

function IndicatorRow({ ind, onPickSource }) {
  const v = ind.value != null ? `${fmt(ind.value)}${ind.unit ? " " + ind.unit : ""}` : "—";
  return (
    <div className="grid grid-cols-12 gap-2 items-center px-3 py-2 border-b border-ink-100 dark:border-ink-700 last:border-b-0 text-sm">
      <div className="col-span-5">
        <div className="font-medium text-ink-700 dark:text-ink-100">{ind.name}</div>
        <div className="text-[10px] text-ink-400">{ind.category} · {ind.source}</div>
      </div>
      <div className="col-span-2 num">{v}</div>
      <div className="col-span-2 num text-ink-500">{ind.period || "—"}</div>
      <div className="col-span-1 text-center">{arrow(ind.direction_of_change)}</div>
      <div className="col-span-1 num text-right">
        {ind.bucket_risk != null ? fmt(ind.bucket_risk, 0) : "—"}
      </div>
      <div className="col-span-1 text-right">
        <button
          onClick={() => onPickSource(ind)}
          className="text-[10px] underline decoration-ink-300 hover:text-accent"
          title="Inspect source"
        >
          src
        </button>
      </div>
    </div>
  );
}

export function WarningSignals({ assessment, onPickSource }) {
  if (!assessment) return null;
  const items = assessment.indicators
    .filter((i) => i.available && i.bucket_risk != null && i.bucket_risk >= 70)
    .sort((a, b) => b.bucket_risk - a.bucket_risk);
  return (
    <div className="panel">
      <div className="panel-pad pb-2 flex items-center justify-between">
        <h2 className="display text-lg">Key warning signals</h2>
        <span className="text-xs text-ink-500">{items.length} flagged</span>
      </div>
      {items.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-ink-500">
          No indicators in the high/critical range right now.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-12 gap-2 px-3 py-1.5 panel-title border-y border-ink-100 dark:border-ink-700">
            <div className="col-span-5">Indicator</div>
            <div className="col-span-2">Value</div>
            <div className="col-span-2">Period</div>
            <div className="col-span-1 text-center">Δ</div>
            <div className="col-span-1 text-right">Risk</div>
            <div className="col-span-1 text-right">Src</div>
          </div>
          {items.map((i) => (<IndicatorRow key={i.code} ind={i} onPickSource={onPickSource} />))}
        </>
      )}
    </div>
  );
}

export function MovementPanel({ title, assessment, kind, onPickSource }) {
  if (!assessment) return null;
  const items = assessment.indicators.filter((i) => i.direction_of_change === kind);
  return (
    <div className="panel">
      <div className="panel-pad pb-2 flex items-center justify-between">
        <h2 className="display text-lg">{title}</h2>
        <span className="text-xs text-ink-500">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-ink-500">None.</p>
      ) : (
        <>
          <div className="grid grid-cols-12 gap-2 px-3 py-1.5 panel-title border-y border-ink-100 dark:border-ink-700">
            <div className="col-span-5">Indicator</div>
            <div className="col-span-2">Value</div>
            <div className="col-span-2">Period</div>
            <div className="col-span-1 text-center">Δ</div>
            <div className="col-span-1 text-right">Risk</div>
            <div className="col-span-1 text-right">Src</div>
          </div>
          {items.map((i) => (<IndicatorRow key={i.code} ind={i} onPickSource={onPickSource} />))}
        </>
      )}
    </div>
  );
}

export function FullIndicatorTable({ assessment, onPickSource }) {
  if (!assessment) return null;
  const items = [...assessment.indicators].sort((a, b) => {
    if (a.available !== b.available) return b.available - a.available;
    return (b.bucket_risk || 0) - (a.bucket_risk || 0);
  });
  return (
    <div className="panel">
      <div className="panel-pad pb-2 flex items-center justify-between">
        <h2 className="display text-lg">All indicators</h2>
        <span className="text-xs text-ink-500">{items.length} total</span>
      </div>
      <div className="grid grid-cols-12 gap-2 px-3 py-1.5 panel-title border-y border-ink-100 dark:border-ink-700">
        <div className="col-span-5">Indicator</div>
        <div className="col-span-2">Value</div>
        <div className="col-span-2">Period</div>
        <div className="col-span-1 text-center">Δ</div>
        <div className="col-span-1 text-right">Risk</div>
        <div className="col-span-1 text-right">Src</div>
      </div>
      {items.map((i) =>
        i.available ? (
          <IndicatorRow key={i.code} ind={i} onPickSource={onPickSource} />
        ) : (
          <div key={i.code} className="grid grid-cols-12 gap-2 items-center px-3 py-2 border-b border-ink-100 dark:border-ink-700 last:border-b-0 text-sm bg-ink-50/40 dark:bg-ink-900/40">
            <div className="col-span-5">
              <div className="text-ink-500 dark:text-ink-400">{i.name}</div>
              <div className="text-[10px] text-ink-400">{i.source}</div>
            </div>
            <div className="col-span-6 text-sm text-ink-500 italic">
              Data unavailable — {i.unavailability_reason || "no observation"}
            </div>
            <div className="col-span-1 text-right">
              <button onClick={() => onPickSource(i)} className="text-[10px] underline decoration-ink-300 hover:text-accent">src</button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
