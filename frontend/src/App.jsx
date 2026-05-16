import React, { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import Sidebar from "./components/Sidebar";
import RiskSummary from "./components/RiskSummary";
import {
  WarningSignals, MovementPanel, FullIndicatorTable,
} from "./components/IndicatorPanels";
import TrendChart from "./components/TrendChart";
import Heatmap from "./components/Heatmap";
import NewsFeed from "./components/NewsFeed";
import SourceDrawer from "./components/SourceDrawer";
import MethodologyPage from "./components/MethodologyPage";
import ReferencesPage from "./components/ReferencesPage";
import Timeline from "./components/Timeline";
import { exportCsv, printPdf } from "./utils";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "indicators", label: "Indicators & charts" },
  { id: "heatmap", label: "Heatmap" },
  { id: "news", label: "News & timeline" },
  { id: "references", label: "References" },
  { id: "methodology", label: "Methodology" },
];

export default function App() {
  // Theme
  // Light-only for now; dark theme needs more polish.
  const [dark, setDark] = useState(false);
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, [dark]);

  // Catalog
  const [countries, setCountries] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [riskCategories, setRiskCategories] = useState([]);
  const [indicatorsCatalog, setIndicatorsCatalog] = useState([]);
  const [sourcesSummary, setSourcesSummary] = useState(null);

  // Filters
  const currentYear = new Date().getFullYear();
  const [filters, setFilters] = useState({
    country: "USA",
    sector: "macro",
    fromYear: 2000,
    toYear: currentYear,
    indicators: [],
    categories: [],
    keywords: "",
  });

  // Assessment + news
  const [assessment, setAssessment] = useState(null);
  const [newsItems, setNewsItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("overview");

  // Source drawer
  const [drawerInd, setDrawerInd] = useState(null);

  useEffect(() => {
    Promise.all([
      api.countries(), api.sectors(), api.riskCategories(),
      api.indicators(), api.sourcesSummary(),
    ])
      .then(([c, s, r, i, summary]) => {
        setCountries(c.items);
        setSectors(s.items);
        setRiskCategories(r.items);
        setIndicatorsCatalog(i.items);
        setSourcesSummary(summary);
      })
      .catch(console.error);
  }, []);

  // Recompute assessment when filters change
  useEffect(() => {
    if (!countries.length) return;
    api.assess({
      country: filters.country,
      sector: filters.sector,
      indicators: filters.indicators?.length ? filters.indicators : undefined,
    })
      .then(setAssessment)
      .catch(console.error);
  }, [filters.country, filters.sector, filters.indicators.join(","), countries.length]);

  // News fetch (shared for timeline + feed)
  useEffect(() => {
    const kw = filters.keywords.split(",").map(s => s.trim()).filter(Boolean);
    api.news({ country: filters.country, keywords: kw, limit: 50 })
      .then((d) => setNewsItems(d.items))
      .catch(console.error);
  }, [filters.country, filters.keywords]);

  const country = useMemo(
    () => countries.find((c) => c.iso3 === filters.country),
    [countries, filters.country]
  );
  const sector = useMemo(
    () => sectors.find((s) => s.code === filters.sector),
    [sectors, filters.sector]
  );

  // Indicators to chart: respect selection, else show macro defaults
  const chartIndicators = useMemo(() => {
    const codes = filters.indicators?.length
      ? filters.indicators
      : ["gdp_growth", "inflation_cpi", "gov_debt_gdp", "fiscal_balance_gdp",
         "current_account_gdp", "credit_to_gdp", "unemployment", "reserves_months_imports"];
    return codes
      .map((c) => indicatorsCatalog.find((i) => i.code === c))
      .filter(Boolean);
  }, [filters.indicators, indicatorsCatalog]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await api.refresh();
      // brief delay so background job can write some rows before refetching
      setTimeout(async () => {
        try {
          const [a, n, sum] = await Promise.all([
            api.assess({ country: filters.country, sector: filters.sector,
                         indicators: filters.indicators?.length ? filters.indicators : undefined }),
            api.news({ country: filters.country, limit: 50 }),
            api.sourcesSummary(),
          ]);
          setAssessment(a); setNewsItems(n.items); setSourcesSummary(sum);
        } finally { setRefreshing(false); }
      }, 5000);
    } catch (e) {
      console.error(e); setRefreshing(false);
    }
  };

  const onExportCsv = () => {
    if (!assessment) return;
    exportCsv(
      `ews_${filters.country}_${filters.sector}_${new Date().toISOString().slice(0, 10)}.csv`,
      assessment.indicators.map((i) => ({
        code: i.code, name: i.name, category: i.category,
        source: i.source, source_series_id: i.source_series_id,
        period: i.period ?? "", value: i.value ?? "", unit: i.unit ?? "",
        direction: i.direction, direction_of_change: i.direction_of_change ?? "",
        bucket_risk: i.bucket_risk ?? "", weight_used: i.weight_used,
        confidence: i.confidence, source_url: i.source_url,
        available: i.available, unavailability_reason: i.unavailability_reason ?? "",
      }))
    );
  };

  return (
    <div className="min-h-screen text-sm">
      <div className="mx-auto max-w-[1480px] p-3 lg:p-6 flex flex-col lg:flex-row gap-4 lg:gap-6">
        <Sidebar
          countries={countries}
          sectors={sectors}
          riskCategories={riskCategories}
          indicatorsCatalog={indicatorsCatalog}
          filters={filters}
          setFilters={setFilters}
          onRefresh={onRefresh}
          refreshing={refreshing}
          lastFetchAt={sourcesSummary?.last_indicator_fetch_at}
          dark={dark} setDark={setDark}
        />

        <main className="flex-1 min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
            <nav className="flex flex-wrap gap-1.5">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`text-xs px-2.5 py-1.5 rounded-md border transition ${
                    tab === t.id
                      ? "bg-ink-800 text-ink-50 border-ink-800 dark:bg-ink-100 dark:text-ink-900 dark:border-ink-100"
                      : "bg-transparent border-ink-300 text-ink-600 hover:border-ink-500 dark:border-ink-600 dark:text-ink-300"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
            <div className="flex gap-2">
              <button onClick={onExportCsv} className="text-xs px-2.5 py-1.5 rounded-md border border-ink-300 dark:border-ink-600 hover:border-ink-500">
                Export CSV
              </button>
              <button onClick={printPdf} className="text-xs px-2.5 py-1.5 rounded-md border border-ink-300 dark:border-ink-600 hover:border-ink-500">
                Print / PDF
              </button>
            </div>
          </div>

          {tab === "overview" && (
            <>
              <RiskSummary assessment={assessment} country={country} sector={sector} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <WarningSignals assessment={assessment} onPickSource={setDrawerInd} />
                <div className="grid grid-cols-1 gap-4">
                  <MovementPanel title="Deteriorating indicators" kind="deteriorating" assessment={assessment} onPickSource={setDrawerInd} />
                  <MovementPanel title="Improving indicators" kind="improving" assessment={assessment} onPickSource={setDrawerInd} />
                </div>
              </div>
              <FullIndicatorTable assessment={assessment} onPickSource={setDrawerInd} />
            </>
          )}

          {tab === "indicators" && country && (
            <>
              <div className="panel panel-pad">
                <h2 className="display text-xl">Indicator trends — {country.name}</h2>
                <p className="text-xs text-ink-500 mt-1">
                  Time period filter ({filters.fromYear}–{filters.toYear}) applies to annual series.
                  Daily / monthly indicators show their full cached history.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {chartIndicators.map((i) => (
                  <TrendChart
                    key={i.code}
                    country={country}
                    indicator={i}
                    fromYear={filters.fromYear}
                    toYear={filters.toYear}
                  />
                ))}
              </div>
            </>
          )}

          {tab === "heatmap" && (
            <Heatmap countries={countries} indicatorsCatalog={indicatorsCatalog} selectedCodes={filters.indicators} />
          )}

          {tab === "news" && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-3">
                <NewsFeed country={country} keywords={filters.keywords} />
              </div>
              <div className="lg:col-span-2">
                <Timeline assessment={assessment} news={newsItems} country={country} />
              </div>
            </div>
          )}

          {tab === "references" && (
            <ReferencesPage assessment={assessment} country={country} sector={sector} />
          )}

          {tab === "methodology" && (
            <MethodologyPage indicatorsCatalog={indicatorsCatalog} sourcesSummary={sourcesSummary} />
          )}

          <footer className="text-[10px] text-ink-400 text-center py-4 leading-relaxed">
            Live public-data prototype — pulls macro indicators from World Bank, IMF, ECB, BIS, OECD &amp; FRED
            and news from public RSS feeds, refreshed automatically (annual sources once/year, news every 30 min).
            Every score links back to its source. Not investment advice.
            <br/>Built with FastAPI + React + SQLite · Prepared by Arvind Sharma.
          </footer>
        </main>
      </div>

      <SourceDrawer
        open={!!drawerInd}
        onClose={() => setDrawerInd(null)}
        indicator={drawerInd}
        country={country}
      />
    </div>
  );
}
