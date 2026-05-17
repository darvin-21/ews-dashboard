import React, { useEffect, useState } from "react";
import { api } from "../api";
import { bandColor, BAND_LABELS } from "../utils";

export default function PeersCard({ country, sector }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!country) return;
    setLoading(true);
    api.peers({ country, sector, topN: 3 })
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { console.error(e); setLoading(false); });
  }, [country, sector]);
  if (loading) return <div className="panel panel-pad text-sm text-ink-500">Computing peer fingerprint…</div>;
  if (!data || !data.peers?.length) return null;
  return (
    <div className="panel panel-pad">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h3 className="display text-lg">Closest peers</h3>
        <span className="text-xs text-ink-500">Countries whose 16-indicator pattern most resembles {data.country_name}</span>
      </div>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
        {data.peers.map((p, i) => (
          <div key={p.country_iso3} className="border border-ink-200 dark:border-ink-700 rounded p-3">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-[10px] text-ink-400">#{i + 1}</div>
                <div className="font-medium">{p.country_name}</div>
              </div>
              <div className="text-right">
                <div className="text-lg num font-semibold" style={{ color: bandColor(p.band) }}>{p.composite_score.toFixed(1)}</div>
                <div className="text-[10px] text-ink-500">{BAND_LABELS[p.band]}</div>
              </div>
            </div>
            <div className="mt-2 text-[10px] text-ink-500">
              Risk-pattern distance: <span className="num">{p.distance}</span> (lower = closer)
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
