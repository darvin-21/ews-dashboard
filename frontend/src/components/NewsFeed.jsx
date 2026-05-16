import React, { useEffect, useState } from "react";
import { api } from "../api";
import { timeAgo } from "../utils";

export default function NewsFeed({ country, keywords }) {
  const [items, setItems] = useState(null);
  const [err, setErr] = useState(null);

  const kwList = keywords
    ? keywords.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  useEffect(() => {
    let cancelled = false;
    setItems(null); setErr(null);
    api.news({ country: country.iso3, keywords: kwList, limit: 30 })
      .then((d) => { if (!cancelled) setItems(d.items); })
      .catch((e) => { if (!cancelled) setErr(e.message); });
    return () => { cancelled = true; };
  }, [country.iso3, kwList.join("|")]);

  return (
    <div className="panel">
      <div className="panel-pad pb-2 flex items-baseline justify-between">
        <h2 className="display text-lg">News &amp; public intelligence feed</h2>
        <span className="text-xs text-ink-500">Fed · ECB · BIS · World Bank · IMF</span>
      </div>
      {err && <p className="px-4 pb-4 text-sm text-red-600">Error: {err}</p>}
      {!items && !err && <p className="px-4 pb-4 text-sm text-ink-500">Loading…</p>}
      {items && items.length === 0 && (
        <p className="px-4 pb-4 text-sm text-ink-500">
          No items matched. RSS feeds refresh every 30 minutes; the country hint is heuristic, so
          items without a clear country tag are included as global context.
        </p>
      )}
      {items && items.length > 0 && (
        <ul className="divide-y divide-ink-100 dark:divide-ink-700 max-h-[640px] overflow-y-auto">
          {items.map((n) => (
            <li key={n.id} className="px-4 py-2.5 hover:bg-ink-50 dark:hover:bg-ink-900/40">
              <a href={n.link} target="_blank" rel="noreferrer" className="block">
                <div className="flex items-start gap-2 justify-between">
                  <div className="text-sm font-medium text-ink-800 dark:text-ink-100 leading-snug">
                    {n.title}
                  </div>
                  <span className="text-[10px] whitespace-nowrap text-ink-400">{timeAgo(n.published || n.fetched_at)}</span>
                </div>
                <div className="mt-0.5 text-[10px] text-ink-500 dark:text-ink-400 flex flex-wrap gap-2">
                  <span>{n.source}</span>
                  {n.country_hint && <span>· hint: {n.country_hint}</span>}
                  <span>· {n.link.replace(/^https?:\/\//, "").split("/")[0]}</span>
                </div>
                {n.summary && (
                  <p className="mt-1 text-xs text-ink-600 dark:text-ink-300 line-clamp-2">
                    {n.summary.replace(/<[^>]*>/g, "")}
                  </p>
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
