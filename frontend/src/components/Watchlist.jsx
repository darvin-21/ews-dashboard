import React, { useEffect, useState } from "react";
import { api } from "../api";
import { bandColor, BAND_LABELS } from "../utils";

const STORAGE_KEY = "ews_watchlist_v1";

function loadStored() {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(v) ? v.slice(0, 5) : [];
  } catch { return []; }
}
function saveStored(list) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {} }

export default function Watchlist({ currentCountry, sector }) {
  const [pinned, setPinned] = useState(loadStored());
  const [assessments, setAssessments] = useState({});
  useEffect(() => {
    if (!pinned.length) { setAssessments({}); return; }
    Promise.all(pinned.map(iso =>
      api.assess({ country: iso, sector }).catch(() => null)
    )).then(rows => {
      const m = {};
      pinned.forEach((iso, i) => { if (rows[i]) m[iso] = rows[i]; });
      setAssessments(m);
    });
  }, [pinned.join(","), sector]);
  const isPinned = currentCountry && pinned.includes(currentCountry);
  const togglePin = () => {
    if (!currentCountry) return;
    let next;
    if (isPinned) next = pinned.filter(c => c !== currentCountry);
    else if (pinned.length < 5) next = [...pinned, currentCountry];
    else return;
    setPinned(next); saveStored(next);
  };
  return (
    <div className="panel panel-pad">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h3 className="display text-lg">Watchlist</h3>
        {currentCountry && (
          <button onClick={togglePin}
                  className={`text-xs px-2 py-1 rounded border ${isPinned ? "border-amber-500 bg-amber-50 text-amber-700" : "border-ink-300 hover:border-ink-500"}`}>
            {isPinned ? "★ Pinned" : `☆ Pin ${currentCountry}`} {!isPinned && `(${pinned.length}/5)`}
          </button>
        )}
      </div>
      {pinned.length === 0 ? (
        <p className="mt-2 text-xs text-ink-500 italic">Pin up to 5 countries to track their composite scores at a glance.</p>
      ) : (
        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {pinned.map(iso => {
            const a = assessments[iso];
            return (
              <div key={iso} className="border border-ink-200 dark:border-ink-700 rounded p-2 text-center">
                <div className="text-[10px] text-ink-400 uppercase">{iso}</div>
                {a ? (
                  <>
                    <div className="text-lg font-semibold num" style={{ color: bandColor(a.band) }}>{a.composite_score.toFixed(1)}</div>
                    <div className="text-[10px]"><span className={`chip chip-risk-${a.band}`}>{BAND_LABELS[a.band]}</span></div>
                  </>
                ) : <div className="text-[10px] text-ink-500">loading…</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
