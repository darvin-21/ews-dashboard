import React, { useState } from "react";
import { indicatorTooltip } from "../utils";

function fmtBucket(b) {
  const lo = b.lo <= -1e17 ? "≤" : b.lo;
  const hi = b.hi >= 1e17 ? "" : b.hi;
  if (lo === "≤") return `≤ ${hi}: risk ${b.risk}`;
  if (hi === "") return `> ${lo}: risk ${b.risk}`;
  return `${lo} – ${hi}: risk ${b.risk}`;
}

export default function InfoTip({ code }) {
  const [open, setOpen] = useState(false);
  const meta = indicatorTooltip(code);
  if (!meta) return null;

  return (
    <span className="relative inline-block align-middle ml-1">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-bold text-ink-400 border border-ink-300 hover:text-ink-700 hover:border-ink-700 dark:hover:text-ink-100 dark:hover:border-ink-100 cursor-help"
        aria-label={`About ${meta.name}`}
      >i</button>
      {open && (
        <span
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className="absolute z-50 left-5 top-0 w-72 p-3 rounded-md shadow-xl bg-white dark:bg-ink-800 border border-ink-200 dark:border-ink-700 text-xs leading-relaxed"
        >
          <div className="font-semibold text-sm mb-1">{meta.name}</div>
          {meta.notes && <div className="text-ink-600 dark:text-ink-300 mb-2">{meta.notes}</div>}
          <div className="text-ink-500 mb-1">
            <span className="font-medium">Source:</span> {meta.source}
            {meta.seriesId && <span className="text-[10px] text-ink-400"> · {meta.seriesId}</span>}
          </div>
          <div className="text-ink-500 mb-1">
            <span className="font-medium">Frequency:</span> {meta.frequency} · <span className="font-medium">Unit:</span> {meta.unit}
          </div>
          {meta.directionText && <div className="text-ink-500 mb-2">{meta.directionText}.</div>}
          {meta.buckets?.length > 0 && (
            <>
              <div className="font-medium text-ink-600 dark:text-ink-300 mt-2 mb-1">Risk bands (0–100)</div>
              <ul className="text-[11px] text-ink-500 space-y-0.5">
                {meta.buckets.map((b, idx) => <li key={idx} className="num">{fmtBucket(b)}</li>)}
              </ul>
            </>
          )}
        </span>
      )}
    </span>
  );
}
