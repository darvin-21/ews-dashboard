// All API calls. Uses Vite proxy in dev; for production builds we read
// VITE_API_BASE if set (e.g. https://ews-backend.onrender.com), otherwise
// use same-origin (when frontend is served by FastAPI or via a /api proxy).
const BASE = import.meta.env.VITE_API_BASE || "";

async function get(path, params) {
  // If BASE is an absolute URL use it directly; otherwise resolve against current origin.
  const base = BASE && /^https?:\/\//.test(BASE) ? BASE : window.location.origin + BASE;
  const url = new URL(path, base);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (Array.isArray(v)) v.forEach((x) => url.searchParams.append(k, x));
      else if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
    }
  }
  const r = await fetch(url.toString());
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

async function post(path) {
  const base = BASE && /^https?:\/\//.test(BASE) ? BASE : window.location.origin + BASE;
  const r = await fetch(new URL(path, base).toString(), { method: "POST" });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

export const api = {
  countries: () => get("/api/filters/countries"),
  sectors: () => get("/api/filters/sectors"),
  riskCategories: () => get("/api/filters/risk-categories"),
  indicators: () => get("/api/filters/indicators"),
  series: ({ country, code, from, to }) =>
    get("/api/indicators/series", { country, code, from, to }),
  heatmap: ({ countries, codes, toYear }) =>
    get("/api/indicators/heatmap", { countries, codes, to_year: toYear }),
  assess: ({ country, sector, indicators, toYear }) =>
    get("/api/risk/assess", { country, sector, indicators, to_year: toYear }),
  news: ({ country, keywords, limit }) =>
    get("/api/news/feed", { country, keywords, limit }),
  sourcesLog: ({ limit }) => get("/api/sources/log", { limit }),
  sourcesSummary: () => get("/api/sources/summary"),
  refresh: () => post("/api/admin/refresh"),
  peers: ({ country, sector, topN }) =>
    get("/api/peers", { country, sector, top_n: topN }),
  constellation: ({ sector }) =>
    get("/api/constellation", { sector }),
  compare: ({ countries, sector, toYear }) =>
    get("/api/compare", { countries: countries.join(","), sector, to_year: toYear }),
};
