import React, { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { api } from "../api";
import { fmt } from "../utils";

export default function TrendChart({ country, indicator, fromYear, toYear }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setData(null); setErr(null);
    api.series({ country: country.iso3, code: indicator.code, from: fromYear, to: toYear })
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setErr(e.message); });
    return () => { cancelled = true; };
  }, [country.iso3, indicator.code, fromYear, toYear]);

  if (err) return <div className="panel panel-pad text-sm text-red-600">Error: {err}</div>;
  if (!data) return <div className="panel panel-pad text-sm text-ink-500">Loading {indicator.name}…</div>;

  if (!data.available) {
    return (
      <div className="panel panel-pad">
        <div className="flex items-baseline justify-between">
          <h3 className="display text-base">{indicator.name}</h3>
          <span className="text-[10px] text-ink-400">{indicator.source}</span>
        </div>
        <p className="text-sm text-ink-500 italic mt-2">
          Data unavailable. {data.unavailability_reason}
        </p>
      </div>
    );
  }

  const series = data.points
    .filter((p) => p.value != null)
    .map((p) => ({ x: p.period, y: p.value }));

  const latestPoint = data.points[data.points.length - 1];

  return (
    <div className="panel panel-pad">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h3 className="display text-base">{indicator.name}</h3>
          <p className="text-[11px] text-ink-500">
            {indicator.source} · {data.indicator.frequency} · {data.indicator.category}
          </p>
        </div>
        {latestPoint && (
          <div className="text-right">
            <div className="num text-lg">{fmt(latestPoint.value)} <span className="text-[10px] text-ink-500">{latestPoint.unit}</span></div>
            <div className="text-[10px] text-ink-400">latest {latestPoint.period}</div>
          </div>
        )}
      </div>
      <div className="h-44 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="currentColor" strokeOpacity={0.08} vertical={false} />
            <XAxis dataKey="x" tick={{ fontSize: 10, fill: "currentColor", fillOpacity: 0.6 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: "currentColor", fillOpacity: 0.6 }} width={40} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 4 }}
              labelFormatter={(l) => `Period ${l}`}
              formatter={(v) => [fmt(v), indicator.name]}
            />
            <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.15} />
            <Line type="monotone" dataKey="y" stroke="#0891b2" strokeWidth={1.75} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 text-[10px] text-ink-400 truncate">
        Source:{" "}
        <a href={latestPoint?.source_url} target="_blank" rel="noreferrer" className="link-quiet">
          {latestPoint?.source} · {data.indicator.code}
        </a>
        {" · "}
        fetched {latestPoint ? new Date(latestPoint.fetched_at).toLocaleString() : "—"}
      </div>
    </div>
  );
}
