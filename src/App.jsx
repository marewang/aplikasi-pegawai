// src/App.jsx
import { useMemo, useState } from "react";

function toDate(d) {
  // input: 'YYYY-MM-DD' -> Date
  if (!d) return null;
  const [y, m, day] = d.split("-").map(Number);
  if (!y || !m || !day) return null;
  return new Date(y, m - 1, day);
}
function toDateStr(date) {
  if (!date || isNaN(date)) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function addYears(dateStr, years) {
  const d = toDate(dateStr);
  if (!d) return "";
  const nd = new Date(d);
  nd.setFullYear(nd.getFullYear() + years);
  return toDateStr(nd);
}
function diffInDays(dateStr) {
  if (!dateStr) return null;
  const d = toDate(dateStr);
  if (!d) return null;
  const today = new Date();
  // nolkan jam agar murni tanggal
  d.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const ms = d - today;
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export default function App() {
  const [form, setForm] = useState({
    nama: "",
    nip: "",
    telp: "",
    tmtPns: "",
    riwayatTmtKgb: "",
    riwayatTmtPangkat: "",
  });

  const [data, setData] = useState([]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const onSubmit = (e) => {
    e.preventDefault();
    // hitung jadwal otomatis
    const jadwalKgbBerikutnya = form.riwayatTmtKgb
      ? addYears(form.riwayatTmtKgb, 2)
      : "";
    const jadwalPangkatBerikutnya = form.riwayatTmtPangkat
      ? addYears(form.riwayatTmtPangkat, 4)
      : "";

    // validasi sangat sederhana
    if (!form.nama.trim() || !/^\d{18}$/.test(form.nip)) {
      alert("Nama wajib dan NIP harus 18 digit.");
      return;
    }

    setData((arr) => [
      ...arr,
      {
        id: crypto.randomUUID(),
        ...form,
        jadwalKgbBerikutnya,
        jadwalPangkatBerikutnya,
        createdAt: new Date().toISOString(),
      },
    ]);

    // reset minimal
    setForm({
      nama: "",
      nip: "",
      telp: "",
      tmtPns: "",
      riwayatTmtKgb: "",
      riwayatTmtPangkat: "",
    });
  };

  const notifikasi = useMemo(() => {
    const list = [];
    for (const p of data) {
      if (p.jadwalKgbBerikutnya) {
        const sisa = diffInDays(p.jadwalKgbBerikutnya);
        list.push({
          id: p.id + "-kgb",
          nama: p.nama,
          nip: p.nip,
          jenis: "KGB",
          tanggal: p.jadwalKgbBerikutnya,
          hariSisa: sisa,
          status:
            sisa < 0 ? "overdue" : sisa <= 90 ? "soon" : "future",
        });
      }
      if (p.jadwalPangkatBerikutnya) {
        const sisa = diffInDays(p.jadwalPangkatBerikutnya);
        list.push({
          id: p.id + "-pangkat",
          nama: p.nama,
          nip: p.nip,
          jenis: "PANGKAT",
          tanggal: p.jadwalPangkatBerikutnya,
          hariSisa: sisa,
          status:
            sisa < 0 ? "overdue" : sisa <= 90 ? "soon" : "future",
        });
      }
    }
    return list.sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  }, [data]);

  const soon = notifikasi.filter((n) => n.status === "soon");
  const overdue = notifikasi.filter((n) => n.status === "overdue");

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-5xl p-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">
            Monitoring Kenaikan Gaji & Pangkat Berikutnya (ASN)
          </h1>
          <p className="text-sm text-gray-600">
            Input riwayat TMT KGB & Pangkat — jadwal berikutnya dihitung otomatis (+2 tahun KGB, +4 tahun Pangkat).
          </p>
        </header>

        {/* Form Input */}
        <section className="mb-8 rounded-xl bg-white p-4 shadow">
          <h2 className="mb-3 text-lg font-semibold">Input Data ASN</h2>
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span>Nama</span>
              <input
                className="rounded border p-2"
                name="nama"
                value={form.nama}
                onChange={onChange}
                placeholder="Nama lengkap"
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span>NIP (18 digit)</span>
              <input
                className="rounded border p-2"
                name="nip"
                value={form.nip}
                onChange={onChange}
                placeholder="18 digit"
                pattern="^\d{18}$"
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span>Telp</span>
              <input
                className="rounded border p-2"
                name="telp"
                value={form.telp}
                onChange={onChange}
                placeholder="08xxxxxxxxxx"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span>TMT PNS</span>
              <input
                type="date"
                className="rounded border p-2"
                name="tmtPns"
                value={form.tmtPns}
                onChange={onChange}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span>Riwayat TMT KGB</span>
              <input
                type="date"
                className="rounded border p-2"
                name="riwayatTmtKgb"
                value={form.riwayatTmtKgb}
                onChange={onChange}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span>Riwayat TMT Pangkat</span>
              <input
                type="date"
                className="rounded border p-2"
                name="riwayatTmtPangkat"
                value={form.riwayatTmtPangkat}
                onChange={onChange}
              />
            </label>

            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
              >
                Simpan
              </button>
            </div>
          </form>
        </section>

        {/* Tabel Data */}
        <section className="mb-8 overflow-x-auto rounded-xl bg-white p-4 shadow">
          <h2 className="mb-3 text-lg font-semibold">Data ASN</h2>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="border-b p-2">Nama</th>
                <th className="border-b p-2">NIP</th>
                <th className="border-b p-2">TMT PNS</th>
                <th className="border-b p-2">Riwayat KGB</th>
                <th className="border-b p-2">Jadwal KGB (+2y)</th>
                <th className="border-b p-2">Riwayat Pangkat</th>
                <th className="border-b p-2">Jadwal Pangkat (+4y)</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-3 text-center text-gray-500">
                    Belum ada data.
                  </td>
                </tr>
              ) : (
                data.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="border-b p-2">{p.nama}</td>
                    <td className="border-b p-2">{p.nip}</td>
                    <td className="border-b p-2">{p.tmtPns || "-"}</td>
                    <td className="border-b p-2">{p.riwayatTmtKgb || "-"}</td>
                    <td className="border-b p-2">{p.jadwalKgbBerikutnya || "-"}</td>
                    <td className="border-b p-2">{p.riwayatTmtPangkat || "-"}</td>
                    <td className="border-b p-2">{p.jadwalPangkatBerikutnya || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        {/* Notifikasi */}
        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl bg-white p-4 shadow">
            <h2 className="mb-3 text-lg font-semibold">Notifikasi ≤ 90 hari (Soon)</h2>
            {soon.length === 0 ? (
              <p className="text-sm text-gray-500">Tidak ada.</p>
            ) : (
              <ul className="space-y-2">
                {soon.map((n) => (
                  <li key={n.id} className="rounded border p-3">
                    <div className="font-semibold">{n.jenis} • {n.nama} ({n.nip})</div>
                    <div className="text-sm">
                      Tanggal: {n.tanggal} • Sisa {n.hariSisa} hari
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl bg-white p-4 shadow">
            <h2 className="mb-3 text-lg font-semibold">Overdue (Lewat)</h2>
            {overdue.length === 0 ? (
              <p className="text-sm text-gray-500">Tidak ada.</p>
            ) : (
              <ul className="space-y-2">
                {overdue.map((n) => (
                  <li key={n.id} className="rounded border p-3">
                    <div className="font-semibold">{n.jenis} • {n.nama} ({n.nip})</div>
                    <div className="text-sm">
                      Tanggal: {n.tanggal} • Terlambat {Math.abs(n.hariSisa)} hari
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
