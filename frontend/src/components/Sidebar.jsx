import React from "react";

export default function Sidebar({
  countries, sectors, riskCategories, indicatorsCatalog,
  filters, setFilters,
  onRefresh, refreshing, lastFetchAt,
  dark, setDark,
}) {
  const update = (patch) => setFilters((f) => ({ ...f, ...patch }));

  const visibleIndicators = indicatorsCatalog.filter(
    (i) => !filters.categories?.length || filters.categories.includes(i.category)
  );

  const toggleIndicator = (code) => {
    const set = new Set(filters.indicators || []);
    if (set.has(code)) set.delete(code);
    else set.add(code);
    update({ indicators: [...set] });
  };

  const toggleCategory = (cat) => {
    const set = new Set(filters.categories || []);
    if (set.has(cat)) set.delete(cat);
    else set.add(cat);
    update({ categories: [...set] });
  };

  return (
    <aside className="w-full lg:w-[300px] shrink-0 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto space-y-3 pr-1">
      <div className="panel panel-pad">
        <div className="flex items-baseline justify-between">
          <h1 className="display text-2xl">Early Warning</h1>
          {/* Theme toggle removed: dark mode disabled for this prototype. */}
        </div>
        <p className="mt-1 text-xs text-ink-500 dark:text-ink-400 leading-snug">
          Live sovereign &amp; sector risk built on public macro feeds — <strong>World Bank</strong>,
          <strong> IMF</strong>, <strong>ECB</strong>, <strong>BIS</strong>, <strong>OECD</strong>,
          <strong> FRED</strong>, plus news RSS — refreshed on a schedule. Every score links back to its source.
        </p>
        <p className="mt-2 text-[11px] text-ink-500 dark:text-ink-400 font-medium">
          Prepared by Arvind Sharma
        </p>
      </div>

      <div className="panel panel-pad space-y-3">
        <div>
          <label className="panel-title block mb-1">Country</label>
          <select
            className="w-full bg-ink-50 dark:bg-ink-900 border border-ink-200 dark:border-ink-700 rounded px-2 py-1.5 text-sm"
            value={filters.country}
            onChange={(e) => update({ country: e.target.value })}
          >
            {countries.map((c) => (
              <option key={c.iso3} value={c.iso3}>
                {c.name} ({c.iso3})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="panel-title block mb-1">Sector</label>
          <select
            className="w-full bg-ink-50 dark:bg-ink-900 border border-ink-200 dark:border-ink-700 rounded px-2 py-1.5 text-sm"
            value={filters.sector}
            onChange={(e) => update({ sector: e.target.value })}
          >
            {sectors.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="panel-title block mb-1">
            Time period (annual indicators)
          </label>
          <div className="flex gap-2 items-center">
            <input
              type="number" min="1970" max="2030"
              className="w-1/2 bg-ink-50 dark:bg-ink-900 border border-ink-200 dark:border-ink-700 rounded px-2 py-1.5 text-sm num"
              value={filters.fromYear}
              onChange={(e) => update({ fromYear: Number(e.target.value) })}
            />
            <span className="text-ink-400">→</span>
            <input
              type="number" min="1970" max="2030"
              className="w-1/2 bg-ink-50 dark:bg-ink-900 border border-ink-200 dark:border-ink-700 rounded px-2 py-1.5 text-sm num"
              value={filters.toYear}
              onChange={(e) => update({ toYear: Number(e.target.value) })}
            />
          </div>
        </div>

        <div>
          <label className="panel-title block mb-1">Risk categories</label>
          <div className="flex flex-wrap gap-1.5">
            {riskCategories.map((c) => {
              const active = filters.categories?.includes(c);
              return (
                <button
                  key={c}
                  onClick={() => toggleCategory(c)}
                  className={`text-[11px] px-2 py-0.5 rounded-full border transition ${
                    active
                      ? "bg-ink-800 text-ink-50 border-ink-800 dark:bg-ink-100 dark:text-ink-900 dark:border-ink-100"
                      : "bg-transparent border-ink-300 text-ink-600 hover:border-ink-500 dark:border-ink-600 dark:text-ink-300"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
          {filters.categories?.length > 0 && (
            <button
              onClick={() => update({ categories: [] })}
              className="mt-1 text-[11px] text-ink-500 hover:text-ink-800 dark:hover:text-ink-100"
            >
              Clear categories
            </button>
          )}
        </div>

        <div>
          <label className="panel-title block mb-1">
            Indicators{" "}
            <span className="text-ink-400 normal-case tracking-normal">
              ({filters.indicators?.length || 0}/{visibleIndicators.length})
            </span>
          </label>
          <div className="max-h-60 overflow-y-auto pr-1 space-y-0.5 border border-ink-200 dark:border-ink-700 rounded p-1.5">
            {visibleIndicators.map((i) => {
              const active = filters.indicators?.includes(i.code);
              return (
                <label
                  key={i.code}
                  className="flex items-start gap-2 text-[12px] cursor-pointer hover:bg-ink-100 dark:hover:bg-ink-700 rounded px-1.5 py-1"
                >
                  <input
                    type="checkbox"
                    checked={!!active}
                    onChange={() => toggleIndicator(i.code)}
                    className="mt-0.5"
                  />
                  <span className="flex-1">
                    <span className="block font-medium text-ink-700 dark:text-ink-100">{i.name}</span>
                    <span className="text-[10px] text-ink-400 dark:text-ink-500">{i.source} · {i.frequency}</span>
                  </span>
                </label>
              );
            })}
          </div>
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => update({ indicators: visibleIndicators.map(i => i.code) })}
              className="text-[11px] text-ink-500 hover:text-ink-800 dark:hover:text-ink-100"
            >
              All visible
            </button>
            <button
              onClick={() => update({ indicators: [] })}
              className="text-[11px] text-ink-500 hover:text-ink-800 dark:hover:text-ink-100"
            >
              None (use all)
            </button>
          </div>
        </div>

        <div>
          <label className="panel-title block mb-1">Custom keywords (news)</label>
          <input
            type="text"
            placeholder="e.g. default, downgrade, sanction"
            className="w-full bg-ink-50 dark:bg-ink-900 border border-ink-200 dark:border-ink-700 rounded px-2 py-1.5 text-sm"
            value={filters.keywords}
            onChange={(e) => update({ keywords: e.target.value })}
          />
          <p className="mt-1 text-[10px] text-ink-400">Comma-separated. Filters news feed only.</p>
        </div>
      </div>

      <div className="panel panel-pad space-y-2">
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="w-full text-sm py-1.5 rounded bg-ink-800 text-ink-50 hover:bg-ink-700 disabled:opacity-50 dark:bg-ink-100 dark:text-ink-900 dark:hover:bg-ink-200"
        >
          {refreshing ? "Refreshing…" : "Refresh data now"}
        </button>
        <p className="text-[10px] text-ink-500 dark:text-ink-400 leading-snug">
          Last indicator fetch: <span className="num">{lastFetchAt || "—"}</span>
          <br />
          Refresh runs automatically on a schedule. Annual sources update ~once/year; news every 30 min.
        </p>
      </div>
    </aside>
  );
}
