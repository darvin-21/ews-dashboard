import React, { useEffect, useState } from "react";
import { api } from "../api";
import { timeAgo } from "../utils";

export default function ReferencesPage({ assessment, country, sector }) {
  const [log, setLog] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api.sourcesLog({ limit: 200 })
      .then((d) => setLog(d.items))
      .catch((e) => setErr(e.message));
  }, []);

  return (
    <div className="space-y-4">
      <div className="panel panel-pad">
        <h2 className="display text-2xl">References &amp; source log</h2>
        <p className="mt-1 text-sm text-ink-500">
          Every indicator and every API call is tracked here for audit.
        </p>
      </div>

      {assessment && (
        <div className="panel">
          <div className="panel-pad pb-2">
            <h3 className="display text-lg">Indicators in current assessment</h3>
            <p className="text-xs text-ink-500">
              {country?.name} · {sector?.name} · computed {new Date(assessment.computed_at).toLocaleString()}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[800px]">
              <thead>
                <tr className="text-left panel-title border-y border-ink-200 dark:border-ink-700">
                  <th className="p-1.5">Indicator</th>
                  <th className="p-1.5">Value</th>
                  <th className="p-1.5">Period</th>
                  <th className="p-1.5">Source</th>
                  <th className="p-1.5">Series ID</th>
                  <th className="p-1.5">Reference URL</th>
                </tr>
              </thead>
              <tbody>
                {assessment.indicators.map((i) => (
                  <tr key={i.code} className="border-b border-ink-100 dark:border-ink-700/50">
                    <td className="p-1.5">{i.name}</td>
                    <td className="p-1.5 num">{i.value != null ? `${i.value.toFixed(2)} ${i.unit || ""}` : "—"}</td>
                    <td className="p-1.5 num">{i.period || "—"}</td>
                    <td className="p-1.5">{i.source}</td>
                    <td className="p-1.5 num text-[10px] break-all">{i.source_series_id}</td>
                    <td className="p-1.5 break-all">
                      <a href={i.source_url} target="_blank" rel="noreferrer" className="link-quiet">{i.source_url}</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-pad pb-2">
          <h3 className="display text-lg">Fetch audit log</h3>
          <p className="text-xs text-ink-500">
            Last 200 fetch attempts across all connectors.
          </p>
        </div>
        {err && <p className="px-4 pb-4 text-sm text-red-600">{err}</p>}
        {!log && !err && <p className="px-4 pb-4 text-sm text-ink-500">Loading…</p>}
        {log && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[800px]">
              <thead>
                <tr className="text-left panel-title border-y border-ink-200 dark:border-ink-700">
                  <th className="p-1.5">When</th>
                  <th className="p-1.5">Source</th>
                  <th className="p-1.5">Target</th>
                  <th className="p-1.5">OK</th>
                  <th className="p-1.5">Rows</th>
                  <th className="p-1.5">Error</th>
                </tr>
              </thead>
              <tbody>
                {log.map((r) => (
                  <tr key={r.id} className="border-b border-ink-100 dark:border-ink-700/50">
                    <td className="p-1.5 num">{timeAgo(r.started_at)}</td>
                    <td className="p-1.5">{r.source}</td>
                    <td className="p-1.5 num">{r.target}</td>
                    <td className="p-1.5">
                      {r.ok ? <span className="text-emerald-600">✓</span> : <span className="text-red-600">✕</span>}
                    </td>
                    <td className="p-1.5 num">{r.rows_written}</td>
                    <td className="p-1.5 text-red-600 text-[10px]">{r.error || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
