import React, { useEffect, useMemo, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
  Outlet,
} from "react-router-dom";

/* ====================== Error Boundary ====================== */
class PageBoundary extends React.Component {
  constructor(p){ super(p); this.state = { hasError: false, err: null }; }
  static getDerivedStateFromError(err){ return { hasError: true, err }; }
  componentDidCatch(err, info){ console.error("Page error:", err, info); window.__lastPageError = {err, info}; }
  render(){
    if (this.state.hasError) {
      const message = this.state.err?.message || String(this.state.err || "Unknown error");
      const stack = (this.state.err && this.state.err.stack) ? String(this.state.err.stack).split("\n").slice(0,6).join("\n") : "";
      return (
        <div className="p-6 border rounded-xl bg-rose-50 text-rose-700 text-sm space-y-2">
          <div className="font-semibold">Terjadi error saat menampilkan halaman.</div>
          <div><b>Pesan:</b> <code>{message}</code></div>
          {stack && <pre className="text-xs whitespace-pre-wrap bg-white/60 p-3 rounded border">{stack}</pre>}
          <div className="text-slate-600">Detail lengkap ada di Console (window.__lastPageError).</div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ====================== Utils Tanggal ====================== */
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const parseDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};
const todayYMD = () => new Date().toISOString().slice(0, 10);
const addYears = (date, years) => {
  const d = parseDate(date);
  if (!d) return null;
  const c = new Date(d);
  c.setFullYear(c.getFullYear() + years);
  return c;
};
const ymd = (d) => {
  const dt = parseDate(d);
  return dt ? dt.toISOString().slice(0, 10) : "";
};
const human = (d) => {
  const dt = parseDate(d);
  return dt ? dt.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-";
};
const daysUntil = (d) => {
  const dt = parseDate(d);
  if (!dt) return null;
  return Math.ceil((dt - new Date()) / MS_PER_DAY);
};
const withinNextDays = (d, days) => {
  const n = daysUntil(d);
  return typeof n === "number" && n >= 0 && n <= days;
};

/* ====================== Storage (localStorage) ====================== */
const LS_KEY = "asnRowsV1";
const loadRows = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};
const saveRows = (rows) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(rows)); } catch {}
};

/* ====================== Context ====================== */
const AppCtx = React.createContext(null);
const useApp = () => React.useContext(AppCtx);

/* ====================== App ====================== */
export default function App() {
  const [rows, setRows] = useState(() => loadRows());

  useEffect(() => { saveRows(rows); }, [rows]);

  const notif = useMemo(() => {
    try {
      const soon = [], overdue = [];
      const src = Array.isArray(rows) ? rows : [];
      src.forEach((row) => {
        const items = [];
        if (row.jadwalKgbBerikutnya) items.push({ jenis: "Kenaikan Gaji Berikutnya", tanggal: row.jadwalKgbBerikutnya });
        if (row.jadwalPangkatBerikutnya) items.push({ jenis: "Kenaikan Pangkat Berikutnya", tanggal: row.jadwalPangkatBerikutnya });
        items.forEach(it => {
          const dt = parseDate(it.tanggal);
          if (!dt) return;
          if (withinNextDays(dt, 90)) soon.push({ ...row, ...it });
          else if (dt < new Date()) overdue.push({ ...row, ...it });
        });
      });
      const byDate = (a, b) => (parseDate(a.tanggal)?.getTime() ?? 0) - (parseDate(b.tanggal)?.getTime() ?? 0);
      return { soon: soon.sort(byDate), overdue: overdue.sort(byDate) };
    } catch {
      return { soon: [], overdue: [] };
    }
  }, [rows]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <PageBoundary>
            <Shell>
              <AppCtx.Provider value={{ rows, setRows, notif }}>
                <Outlet />
              </AppCtx.Provider>
            </Shell>
          </PageBoundary>
        }>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<PanelDashboard />} />
          <Route path="notifikasi" element={<PanelNotifikasi />} />
          <Route path="input" element={<FormInput />} />
          <Route path="data" element={<TabelData />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

/* ====================== Shell (Layout + Nav) ====================== */
function Shell({ children }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const LinkBtn = ({ to, label }) => (
    <button
      onClick={() => navigate(to)}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${pathname.startsWith(to) ? "bg-indigo-600 text-white border-indigo-600" : "bg-white hover:bg-slate-50"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="sticky top-0 z-40 backdrop-blur bg-white/75 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white grid place-content-center font-bold">A</div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold leading-tight">Monitoring Kenaikan Gaji & Pangkat Berikutnya (ASN)</h1>
            <
