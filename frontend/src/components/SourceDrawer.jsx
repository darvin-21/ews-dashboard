import React from "react";
import { fmt } from "../utils";

export default function SourceDrawer({ open, onClose, indicator, country }) {
  if (!open || !indicator) return null;
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-ink-900/40" onClick={onClose} />
      <div className="ml-auto h-full w-full max-w-[420px] bg-white dark:bg-ink-800 shadow-xl p-5 overflow-y-auto">
        <div className="flex items-start justify-between">
          <div>
            <div className="panel-title">Source & methodology</div>
            <h3 className="display text-xl mt-1">{indicator.name}</h3>
          </div>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-900 dark:hover:text-ink-100">✕</button>
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-y-2 gap-x-3 text-sm">
          <dt className="text-ink-500">Country</dt>
          <dd className="col-span-2 num">{country?.name} ({country?.iso3})</dd>

          <dt className="text-ink-500">Latest value</dt>
          <dd className="col-span-2 num">
            {indicator.value != null
              ? `${fmt(indicator.value)} ${indicator.unit || ""}`
              : <span className="italic text-ink-500">Data unavailable</span>}
          </dd>

          <dt className="text-ink-500">Period</dt>
          <dd className="col-span-2 num">{indicator.period || "—"}</dd>

          <dt className="text-ink-500">Direction</dt>
          <dd className="col-span-2">{indicator.direction}</dd>

          <dt className="text-ink-500">Direction of change</dt>
          <dd className="col-span-2">{indicator.direction_of_change || "—"}{" "}
            {indicator.yoy_change != null && <span className="num text-ink-500">({fmt(indicator.yoy_change)})</span>}
          </dd>

          <dt className="text-ink-500">Bucket risk</dt>
          <dd className="col-span-2 num">{indicator.bucket_risk != null ? `${fmt(indicator.bucket_risk, 0)} / 100` : "—"}</dd>

          <dt className="text-ink-500">Weight used</dt>
          <dd className="col-span-2 num">{fmt(indicator.weight_used)}</dd>

          <dt className="text-ink-500">Confidence</dt>
          <dd className="col-span-2 num">{Math.round((indicator.confidence || 0) * 100)}%</dd>

          <dt className="text-ink-500">Source</dt>
          <dd className="col-span-2">{indicator.source}</dd>

          <dt className="text-ink-500">Source series ID</dt>
          <dd className="col-span-2 num text-[12px] break-all">{indicator.source_series_id}</dd>

          <dt className="text-ink-500">Source link</dt>
          <dd className="col-span-2">
            <a href={indicator.source_url} target="_blank" rel="noreferrer" className="link-quiet break-all">
              {indicator.source_url}
            </a>
          </dd>
        </dl>

        {indicator.notes && (
          <div className="mt-4 rounded-md border border-ink-200 dark:border-ink-700 p-3 text-xs text-ink-600 dark:text-ink-300">
            <div className="panel-title mb-1">Methodology note</div>
            {indicator.notes}
          </div>
        )}

        {!indicator.available && indicator.unavailability_reason && (
          <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-3 text-xs text-amber-900 dark:text-amber-200">
            <div className="font-medium mb-1">Why is this unavailable?</div>
            {indicator.unavailability_reason}
          </div>
        )}
      </div>
    </div>
  );
}
