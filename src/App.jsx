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
      className={\`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm \${pathname.startsWith(to) ? "bg-indigo-600 text-white border-indigo-600" : "bg-white hover:bg-slate-50"}\`}
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
            <p className="text-xs text-slate-500 -mt-0.5">Pantau otomatis & simpan offline (localStorage).</p>
          </div>
          <button
            onClick={() => navigate("/notifikasi")}
            className={\`px-3 py-1.5 rounded-lg border text-sm \${pathname.startsWith("/notifikasi") ? "bg-indigo-600 text-white border-indigo-600" : "bg-white hover:bg-slate-50"}\`}
          >
            🔔 Notifikasi
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-3 overflow-x-auto">
          <div className="flex items-center gap-2">
            <LinkBtn to="/dashboard" label="Dashboard" />
            <LinkBtn to="/notifikasi" label="Notifikasi" />
            <LinkBtn to="/input" label="Input Data Pegawai" />
            <LinkBtn to="/data" label="Tampilkan Data Pegawai" />
          </div>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
}

/* ====================== Form Input ====================== */
function FormInput() {
  const { setRows } = useApp();
  const [form, setForm] = useState({
    nama: "", nip: "", telp: "", telegramChatId: "",
    tmtPns: "", riwayatTmtKgb: "", riwayatTmtPangkat: "",
    jadwalKgbBerikutnya: "", jadwalPangkatBerikutnya: "",
  });
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    const kgb = form.riwayatTmtKgb ? ymd(addYears(form.riwayatTmtKgb, 2)) : "";
    const pangkat = form.riwayatTmtPangkat ? ymd(addYears(form.riwayatTmtPangkat, 4)) : "";
    setForm((f) => ({ ...f, jadwalKgbBerikutnya: kgb, jadwalPangkatBerikutnya: pangkat }));
  }, [form.riwayatTmtKgb, form.riwayatTmtPangkat]);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const doSave = () => {
    const id = Date.now() + Math.random();
    setRows((prev) => [...(prev || []), { ...form, id, createdAt: new Date().toISOString() }]);
    setForm({ nama: "", nip: "", telp: "", telegramChatId: "", tmtPns: "", riwayatTmtKgb: "", riwayatTmtPangkat: "", jadwalKgbBerikutnya: "", jadwalPangkatBerikutnya: "" });
    setConfirmOpen(false);
    alert("Data ASN disimpan.");
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.nama || !form.nip) return alert("Nama & NIP wajib diisi");
    setConfirmOpen(true);
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card title="Input Data Pegawai" subtitle="Lengkapi data; jadwal otomatis dihitung.">
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormRow label="Nama" required><input name="nama" value={form.nama} onChange={onChange} className="w-full border rounded-lg px-3 py-2" /></FormRow>
          <FormRow label="Nomor Pegawai (NIP)" required><input name="nip" value={form.nip} onChange={onChange} className="w-full border rounded-lg px-3 py-2" /></FormRow>
          <FormRow label="Nomor HP"><input name="telp" value={form.telp} onChange={onChange} className="w-full border rounded-lg px-3 py-2" placeholder="08xxxxxxxxxx" /></FormRow>
          <FormRow label="Telegram Chat ID (opsional)"><input name="telegramChatId" value={form.telegramChatId} onChange={onChange} className="w-full border rounded-lg px-3 py-2" placeholder="(opsional)" /></FormRow>
          <FormRow label="TMT PNS"><input type="date" name="tmtPns" value={form.tmtPns} onChange={onChange} className="w-full border rounded-lg px-3 py-2" max={todayYMD()} /></FormRow>
          <FormRow label="Riwayat TMT Kenaikan Gaji"><input type="date" name="riwayatTmtKgb" value={form.riwayatTmtKgb} onChange={onChange} className="w-full border rounded-lg px-3 py-2" /></FormRow>
          <FormRow label="Riwayat TMT Pangkat"><input type="date" name="riwayatTmtPangkat" value={form.riwayatTmtPangkat} onChange={onChange} className="w-full border rounded-lg px-3 py-2" /></FormRow>
          <FormRow label="Jadwal Kenaikan Gaji Berikutnya (+2 thn)"><input type="date" name="jadwalKgbBerikutnya" value={form.jadwalKgbBerikutnya} readOnly className="w-full border rounded-lg px-3 py-2 bg-slate-50" /></FormRow>
          <FormRow label="Jadwal Kenaikan Pangkat Berikutnya (+4 thn)"><input type="date" name="jadwalPangkatBerikutnya" value={form.jadwalPangkatBerikutnya} readOnly className="w-full border rounded-lg px-3 py-2 bg-slate-50" /></FormRow>
          <div className="md:col-span-2 flex gap-3 mt-2">
            <button className="bg-indigo-600 text-white rounded-lg px-4 py-2 font-medium hover:bg-indigo-700">Simpan</button>
            <button type="button" onClick={() => setForm({ nama: "", nip: "", telp: "", telegramChatId: "", tmtPns: "", riwayatTmtKgb: "", riwayatTmtPangkat: "", jadwalKgbBerikutnya: "", jadwalPangkatBerikutnya: "" })} className="border rounded-lg px-4 py-2 hover:bg-slate-50">Reset</button>
          </div>
        </form>
      </Card>

      <ConfirmDialog open={confirmOpen} title="Verifikasi Data Pegawai" onCancel={() => setConfirmOpen(false)} onConfirm={doSave}>
        <ul className="text-sm text-slate-700 space-y-1">
          <li><b>Nama:</b> {form.nama || '-'}</li>
          <li><b>NIP:</b> {form.nip || '-'}</li>
          <li><b>Nomor HP:</b> {form.telp || '-'}</li>
          <li><b>Telegram Chat ID:</b> {form.telegramChatId || '-'}</li>
          <li><b>TMT PNS:</b> {human(form.tmtPns)}</li>
          <li><b>Riwayat TMT Kenaikan Gaji:</b> {human(form.riwayatTmtKgb)}</li>
          <li><b>Jadwal Kenaikan Gaji Berikutnya:</b> {human(form.jadwalKgbBerikutnya)}</li>
          <li><b>Riwayat TMT Pangkat:</b> {human(form.riwayatTmtPangkat)}</li>
          <li><b>Jadwal Kenaikan Pangkat Berikutnya:</b> {human(form.jadwalPangkatBerikutnya)}</li>
        </ul>
      </ConfirmDialog>
    </div>
  );
}

/* ====================== Tabel Data ====================== */
function TabelData() {
  const { rows, setRows } = useApp();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [compact, setCompact] = useState(false);
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = useMemo(() => {
    try {
      const src = Array.isArray(rows) ? rows : [];
      const term = q.trim().toLowerCase();
      const withMeta = src.map((r) => {
        const dueInKgb = daysUntil(r.jadwalKgbBerikutnya);
        const dueInPangkat = daysUntil(r.jadwalPangkatBerikutnya);
        const nearest = Math.min(dueInKgb ?? Infinity, dueInPangkat ?? Infinity);
        let status = "ok";
        if (!Number.isFinite(nearest)) status = "ok";
        else if (nearest < 0) status = "overdue";
        else if (nearest <= 90) status = "soon";
        return { ...r, dueInKgb, dueInPangkat, nearest, status };
      });
      let list = withMeta;
      if (term) list = list.filter((r) =>
        (r.nama || "").toLowerCase().includes(term) ||
        (r.nip || "").toLowerCase().includes(term) ||
        (r.telp || "").toLowerCase().includes(term)
      );
      if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
      list.sort((a, b) => (a.nama || "").localeCompare(b.nama || "", "id", { sensitivity: "base" }));
      if (!sortAsc) list.reverse();
      return list;
    } catch (e) {
      console.error("table calc error", e);
      return [];
    }
  }, [rows, q, statusFilter, sortAsc]);

  const onDelete = (id) => {
    if (!confirm("Hapus data ini?")) return;
    const next = (rows || []).filter(r => r.id !== id);
    setRows(next);
  };

  return (
    <Card
      title="Tampilkan Data Pegawai"
      subtitle="Cari, filter, dan urutkan data pegawai."
      extra={
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-slate-400">🔎</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama/NIP/HP..." className="border rounded-lg pl-9 pr-3 py-2 w-72 max-w-full" />
          </div>
          <SegmentedControl value={statusFilter} onChange={setStatusFilter} options={[
            { value: "all", label: "Semua" },
            { value: "soon", label: "≤3 bln" },
            { value: "overdue", label: "Terlewat" },
            { value: "ok", label: "Aman" },
          ]} />
          <button onClick={() => setSortAsc((x) => !x)} className="inline-flex items-center gap-1 border rounded-lg px-2.5 py-2 hover:bg-slate-50">
            ↕️ <span className="text-sm">Nama {sortAsc ? "A→Z" : "Z→A"}</span>
          </button>
          <button onClick={() => setCompact((x) => !x)} className="inline-flex items-center gap-2 border rounded-lg px-2.5 py-2 hover:bg-slate-50">
            ⚙️ <span className="text-sm">{compact ? "Padat" : "Normal"}</span>
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <IconButton onClick={() => exportJSON(rows || [])} title="Export JSON">⬇️</IconButton>
            <IconButton onClick={() => importJSON(setRows)} title="Import JSON">⬆️</IconButton>
          </div>
        </div>
      }
    >
      <div className={\`overflow-auto rounded-xl border border-slate-200 \${compact ? "text-xs" : "text-sm"}\`}>
        <table className="min-w-full">
          <thead className="sticky top-0 z-10">
            <tr className="bg-white/95 backdrop-blur text-slate-600 border-b">
              <Th>Nama</Th><Th>NIP</Th><Th>No. HP</Th><Th>Telegram</Th><Th>TMT PNS</Th><Th>Riwayat TMT Kenaikan Gaji</Th><Th>Jadwal Kenaikan Gaji Berikutnya</Th><Th>Riwayat TMT Pangkat</Th><Th>Jadwal Kenaikan Pangkat Berikutnya</Th><Th>Status</Th><Th>Aksi</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, idx) => (
              <tr key={r.id ?? idx} className={\`group transition \${idx % 2 ? "bg-white" : "bg-slate-50/40"} hover:bg-indigo-50/30\`}>
                <Td>{r.nama}</Td>
                <Td>{r.nip}</Td>
                <Td>{r.telp || "-"}</Td>
                <Td>{r.telegramChatId ? <span className="text-emerald-700 font-medium">Terhubung</span> : <span className="text-slate-400">Belum</span>}</Td>
                <Td>{human(r.tmtPns)}</Td>
                <Td>{human(r.riwayatTmtKgb)}</Td>
                <Td>{human(r.jadwalKgbBerikutnya)}</Td>
                <Td>{human(r.riwayatTmtPangkat)}</Td>
                <Td>{human(r.jadwalPangkatBerikutnya)}</Td>
                <Td>
                  <div className="flex flex-wrap gap-2">
                    <StatusPill label="Kenaikan Gaji Berikutnya" target={r.jadwalKgbBerikutnya} />
                    <StatusPill label="Kenaikan Pangkat Berikutnya" target={r.jadwalPangkatBerikutnya} />
                  </div>
                </Td>
                <Td><button onClick={() => onDelete(r.id)} className="text-rose-600 hover:underline">Hapus</button></Td>
              </tr>
            ))}
            {!filtered.length && <tr><td className="p-8 text-center text-slate-500" colSpan={11}>Belum ada data.</td></tr>}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ====================== Dashboard & Notifikasi ====================== */
function PanelDashboard() {
  const { rows = [], notif = { soon: [], overdue: [] } } = useApp() || {};
  const total = rows.length;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <Card title="Ringkasan" subtitle="Ikhtisar status pegawai & jadwal">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
            <div className="text-xs text-slate-500">Total Pegawai</div>
            <div className="text-2xl font-semibold mt-1">{total}</div>
          </div>
          <div className="rounded-xl border border-amber-200 p-4 bg-amber-50">
            <div className="text-xs text-amber-700">Segera (≤3 bln)</div>
            <div className="text-2xl font-semibold mt-1">{(notif.soon||[]).length}</div>
          </div>
          <div className="rounded-xl border border-rose-200 p-4 bg-rose-50">
            <div className="text-xs text-rose-700">Terlewat</div>
            <div className="text-2xl font-semibold mt-1">{(notif.overdue||[]).length}</div>
          </div>
        </div>
      </Card>

      <Card title="Notifikasi (Per Jenis)" subtitle="3 teratas per status">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {["Kenaikan Gaji Berikutnya", "Kenaikan Pangkat Berikutnya"].map((type) => (
            <div key={type} className="space-y-3">
              <div className="text-sm font-medium">{type}</div>
              <div>
                <div className="text-xs font-medium text-amber-700 mb-2">Segera (≤3 bln)</div>
                <NotifList items={(notif.soon||[]).filter(x=>x.jenis===type).slice(0,3)} tone="amber" emptyText="—" />
              </div>
              <div>
                <div className="text-xs font-medium text-rose-700 mb-2">Terlewat</div>
                <NotifList items={(notif.overdue||[]).filter(x=>x.jenis===type).slice(0,3)} tone="rose" overdue emptyText="—" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function PanelNotifikasi() {
  const { notif = { soon: [], overdue: [] } } = useApp() || {};
  return (
    <div className="grid grid-cols-1 gap-6">
      <Card title="Notifikasi" subtitle="Dikelompokkan berdasarkan jenis & status.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {["Kenaikan Gaji Berikutnya", "Kenaikan Pangkat Berikutnya"].map((type) => (
            <div key={type} className="space-y-4">
              <div className="text-sm font-semibold">{type}</div>
              <section>
                <h4 className="text-xs font-medium text-amber-700 mb-2">Segera (≤3 bln)</h4>
                <NotifList items={(notif.soon||[]).filter(x=>x.jenis===type)} tone="amber" emptyText="Tidak ada." />
              </section>
              <section>
                <h4 className="text-xs font-medium text-rose-700 mb-2">Terlewat</h4>
                <NotifList items={(notif.overdue||[]).filter(x=>x.jenis===type)} tone="rose" overdue emptyText="Tidak ada." />
              </section>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function NotifItem({ r, tone = "amber", overdue = false }) {
  const d = daysUntil(r.tanggal);
  const days = typeof d === "number" ? Math.abs(d) : "-";
  return (
    <div className={\`border rounded-xl p-3 flex items-center justify-between \${tone === "amber" ? "bg-amber-50 border-amber-200" : "bg-rose-50 border-rose-200"}\`}>
      <div>
        <div className="font-medium">{r.nama} <span className="text-xs text-slate-500">({r.nip})</span></div>
        <div className="text-xs text-slate-600">{r.jenis} pada <b>{human(r.tanggal)}</b> {overdue ? \`(\${days} hari yang lalu)\` : \`(sisa \${days} hari)\`}</div>
      </div>
      <span className={\`text-xs px-2 py-1 rounded-full border \${tone === "amber" ? "bg-white text-amber-700 border-amber-300" : "bg-white text-rose-700 border-rose-300"}\`}>Pengingat</span>
    </div>
  );
}
function NotifList({ items = [], tone = "amber", overdue = false, emptyText = "Tidak ada data." }) {
  if (!items.length) return <div className="text-sm text-slate-500 border border-dashed rounded-xl p-4">{emptyText}</div>;
  return <div className="space-y-3">{items.map((r, idx) => (<NotifItem key={\`\${r.id ?? idx}-\${r.jenis}\`} r={r} tone={tone} overdue={overdue} />))}</div>;
}

/* ====================== Komponen Reusable ====================== */
function Card({ title, subtitle, extra, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
        <div>{title && <h3 className="text-base font-semibold">{title}</h3>}{subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}</div>
        {extra}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
function FormRow({ label, required, children }) { return (<div><label className="block text-sm mb-1">{label} {required && <span className="text-rose-600">*</span>}</label>{children}</div>); }
function Th({ children }) { return <th className="p-3 border-b text-left">{children}</th>; }
function Td({ children }) { return <td className="p-3 border-b text-left">{children}</td>; }
function IconButton({ children, onClick, title }) { return (<button onClick={onClick} title={title} className="px-2.5 py-2 rounded-lg border inline-flex items-center gap-2 hover:bg-slate-50">{children}</button>); }
function SegmentedControl({ value, onChange, options = [] }) {
  return (
    <div className="inline-flex rounded-lg border overflow-hidden">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button key={opt.value}
            onClick={() => onChange(opt.value)}
            className={\`px-2.5 py-1.5 text-sm \${active ? "bg-indigo-600 text-white" : "bg-white hover:bg-slate-50"}\`}>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
function ConfirmDialog({ open, title, children, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/30 grid place-items-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="px-5 py-3 border-b">
          <h4 className="font-semibold">{title || "Konfirmasi"}</h4>
        </div>
        <div className="p-5 space-y-3">{children}</div>
        <div className="px-5 py-3 border-t flex items-center justify-end gap-2">
          <button onClick={onCancel} className="border rounded-lg px-4 py-2 hover:bg-slate-50">Batal</button>
          <button onClick={onConfirm} className="bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700">Ya, Simpan</button>
        </div>
      </div>
    </div>
  );
}

/* ====================== Export/Import ====================== */
function exportJSON(rows = []) {
  const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "data-asn.json"; a.click(); URL.revokeObjectURL(url);
}
function importJSON(setRows) {
  const input = document.createElement("input");
  input.type = "file"; input.accept = "application/json";
  input.onchange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) return alert("Format JSON tidak valid");
      setRows(data);
      alert("Import selesai");
    } catch {
      alert("Format JSON tidak valid");
    }
  };
  input.click();
}
