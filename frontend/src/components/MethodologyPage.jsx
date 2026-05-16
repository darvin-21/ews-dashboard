import React from "react";

export default function MethodologyPage({ indicatorsCatalog, sourcesSummary }) {
  return (
    <div className="space-y-4">
      <div className="panel panel-pad">
        <h2 className="display text-2xl">Methodology</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-700 dark:text-ink-200">
          The composite risk score is a weighted average of indicator-level bucket risks.
          Every input is a numeric observation pulled from a public data source. Each indicator's
          value is mapped to a 0–100 risk via transparent threshold buckets. The result is intentionally
          a <em>prior</em>, not a forecast — it is meant to be auditable and replaceable.
        </p>
        <ol className="mt-3 space-y-2 text-sm text-ink-700 dark:text-ink-200 list-decimal pl-5">
          <li>Fetch the latest observation per indicator for the selected country.</li>
          <li>Map the value to a bucket risk (0..100) using the indicator's direction (higher- or lower-is-riskier).</li>
          <li>For oil net-exporters, the Brent indicator is partially inverted (high oil → lower fiscal risk).</li>
          <li>Compute a coverage-weighted, freshness-weighted confidence score.</li>
          <li>Take a weighted average of bucket risks. Yield curve & US policy rate are only applied to the US.</li>
        </ol>
        <p className="mt-3 text-xs text-ink-500">
          Bands: <span className="num">0–25 Low</span> · <span className="num">26–50 Moderate</span> ·
          {" "}<span className="num">51–75 High</span> · <span className="num">76–100 Critical</span>.
        </p>
      </div>

      <div className="panel panel-pad">
        <h3 className="display text-lg">Data sources &amp; refresh cadence</h3>
        <div className="mt-2 grid sm:grid-cols-2 gap-3 text-sm">
          <SourceCard
            name="World Bank — WDI"
            url="https://api.worldbank.org/v2"
            cadence="Annual, lagged 3–12 months"
            note="No API key. GDP, CPI, fiscal, external, credit indicators."
          />
          <SourceCard
            name="IMF DataMapper (WEO)"
            url="https://www.imf.org/external/datamapper"
            cadence="Twice yearly (Apr/Oct WEO)"
            note="No API key. Forecast horizon stored but only past/current-year values are scored."
          />
          <SourceCard
            name="ECB Statistical Data Warehouse"
            url="https://data.ecb.europa.eu/"
            cadence="Monthly / quarterly"
            note="SDMX 2.1 JSON. Euro-area aggregates."
          />
          <SourceCard
            name="FRED (St. Louis Fed)"
            url="https://fred.stlouisfed.org/"
            cadence="Daily for market series"
            note="Free key required. Without a key, FRED indicators show 'Data unavailable'."
          />
          <SourceCard
            name="Public RSS — Fed, ECB, BIS, WB, IMF"
            url="https://www.bis.org/list/cbspeeches/index.htm"
            cadence="Every 30 minutes"
            note="Country tagging is heuristic; absence of a tag does not mean global."
          />
          <SourceCard
            name="BIS / OECD"
            url="https://data.bis.org/"
            cadence="Modular TODO connector"
            note="Stub left in repo. Will be wired to specific datasets on demand."
          />
        </div>
      </div>

      <div className="panel panel-pad">
        <h3 className="display text-lg">Indicator catalogue</h3>
        <p className="text-xs text-ink-500 mt-1">
          The buckets below are transparent priors. Edit them in <code className="text-[11px]">backend/data/reference.py</code>.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="text-xs min-w-full">
            <thead>
              <tr className="text-left panel-title border-b border-ink-200 dark:border-ink-700">
                <th className="p-1.5">Code</th>
                <th className="p-1.5">Name</th>
                <th className="p-1.5">Source</th>
                <th className="p-1.5">Series</th>
                <th className="p-1.5">Freq</th>
                <th className="p-1.5">Direction</th>
                <th className="p-1.5">Weight</th>
                <th className="p-1.5">Buckets (lo, hi, risk)</th>
              </tr>
            </thead>
            <tbody>
              {indicatorsCatalog.map((i) => (
                <tr key={i.code} className="border-b border-ink-100 dark:border-ink-700/50 align-top">
                  <td className="p-1.5 num">{i.code}</td>
                  <td className="p-1.5">{i.name}</td>
                  <td className="p-1.5">{i.source}</td>
                  <td className="p-1.5 num text-[10px] break-all">{i.source_series_id}</td>
                  <td className="p-1.5">{i.frequency}</td>
                  <td className="p-1.5">{i.direction.replace(/_/g, " ")}</td>
                  <td className="p-1.5 num">{i.weight}</td>
                  <td className="p-1.5 text-[10px] num">
                    {i.buckets.map((b, idx) => (
                      <span key={idx} className="inline-block mr-1.5">
                        ({b.lo <= -1e17 ? "-∞" : b.lo}, {b.hi >= 1e17 ? "∞" : b.hi}] → {b.risk}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {sourcesSummary && (
        <div className="panel panel-pad">
          <h3 className="display text-lg">Database snapshot</h3>
          <ul className="mt-2 text-sm">
            <li>Indicator observations cached: <span className="num">{sourcesSummary.indicator_observations}</span></li>
            <li>News items cached: <span className="num">{sourcesSummary.news_items}</span></li>
            <li>Last indicator fetch: <span className="num">{sourcesSummary.last_indicator_fetch_at || "—"}</span></li>
            <li>By source:
              <ul className="ml-4">
                {sourcesSummary.by_source.map((s) => (
                  <li key={s.source} className="num text-xs">{s.source}: {s.rows} rows</li>
                ))}
              </ul>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

function SourceCard({ name, url, cadence, note }) {
  return (
    <div className="rounded-md border border-ink-200 dark:border-ink-700 p-3">
      <div className="font-medium">{name}</div>
      <a href={url} target="_blank" rel="noreferrer" className="link-quiet text-xs break-all">{url}</a>
      <div className="text-[11px] text-ink-500 mt-1">Cadence: {cadence}</div>
      <div className="text-[11px] text-ink-600 dark:text-ink-300 mt-0.5">{note}</div>
    </div>
  );
}
