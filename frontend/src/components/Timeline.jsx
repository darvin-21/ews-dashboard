import React from "react";
import { fmt } from "../utils";

// Synthesises a timeline from the assessment + the news items that have a country hint.
// Each event is either:
//   - "Indicator crossed into high risk" (computed from the latest two observations)
//   - A news headline whose country_hint matches the selected country.
export default function Timeline({ assessment, news, country }) {
  const events = [];

  if (assessment) {
    for (const i of assessment.indicators) {
      if (!i.available) continue;
      if (i.bucket_risk != null && i.bucket_risk >= 70) {
        events.push({
          when: i.period,
          source: i.source,
          kind: "indicator",
          title: `${i.name} elevated`,
          detail: `Value ${fmt(i.value)} ${i.unit || ""}, bucket risk ${Math.round(i.bucket_risk)}/100`,
          link: i.source_url,
          tone: "warn",
        });
      } else if (i.direction_of_change === "deteriorating" && Math.abs(i.yoy_change || 0) > 0.0001) {
        events.push({
          when: i.period,
          source: i.source,
          kind: "indicator",
          title: `${i.name} deteriorating`,
          detail: `Change ${fmt(i.yoy_change)} ${i.unit || ""} vs prior period`,
          link: i.source_url,
          tone: "warn",
        });
      }
    }
  }

  for (const n of news || []) {
    if (n.country_hint && country?.iso3 && n.country_hint !== country.iso3) continue;
    events.push({
      when: n.published ? n.published.slice(0, 10) : (n.fetched_at || "").slice(0, 10),
      source: n.source,
      kind: "news",
      title: n.title,
      detail: n.summary?.replace(/<[^>]*>/g, "").slice(0, 180),
      link: n.link,
      tone: "calm",
    });
  }

  events.sort((a, b) => (b.when || "").localeCompare(a.when || ""));
  const top = events.slice(0, 30);

  return (
    <div className="panel">
      <div className="panel-pad pb-2 flex items-baseline justify-between">
        <h2 className="display text-lg">Timeline</h2>
        <span className="text-xs text-ink-500">{top.length} of {events.length}</span>
      </div>
      {top.length === 0 && (
        <p className="px-4 pb-4 text-sm text-ink-500">No timeline events. Try a different country, or refresh data.</p>
      )}
      <ol className="relative border-l border-ink-200 dark:border-ink-700 ml-5 mr-4 mb-4 pt-2">
        {top.map((e, idx) => (
          <li key={idx} className="ml-3 pl-3 pb-3 last:pb-1 relative">
            <span
              className={`absolute -left-1.5 top-1 w-3 h-3 rounded-full border-2 border-white dark:border-ink-800 ${
                e.tone === "warn" ? "bg-amber-500" : "bg-accent"
              }`}
            />
            <div className="text-[10px] text-ink-500 num">{e.when || "—"} · {e.source} · {e.kind}</div>
            <a href={e.link} target="_blank" rel="noreferrer" className="text-sm text-ink-800 dark:text-ink-100 font-medium hover:underline">
              {e.title}
            </a>
            {e.detail && <p className="text-xs text-ink-600 dark:text-ink-300 mt-0.5">{e.detail}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}
