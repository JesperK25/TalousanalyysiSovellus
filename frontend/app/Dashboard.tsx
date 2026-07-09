'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import AiText from './AiText';
import { api, API } from './api';

const CATEGORY_COLORS: Record<string, string> = {
  Ruoka: '#34d399',
  Liikenne: '#38bdf8',
  Viihde: '#a78bfa',
  Asuminen: '#fbbf24',
  Terveys: '#fb7185',
  Tulot: '#4ade80',
  Muut: '#94a3b8',
};
const FALLBACK_COLORS = ['#818cf8', '#22d3ee', '#f472b6', '#facc15', '#2dd4bf'];

const categoryColor = (name: string, index = 0) =>
  CATEGORY_COLORS[name] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];

const eur = new Intl.NumberFormat('fi-FI', { style: 'currency', currency: 'EUR' });
const fiDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric', year: 'numeric' });
const fiMonth = (ym: string) => {
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('fi-FI', { month: 'short', year: '2-digit' });
};

type Transaction = {
  id: number;
  date: string;
  description: string;
  amount: number;
  category: string | null;
};

type MonthData = { month: string; tulot: number; kulut: number };

const LIST_PREVIEW = 25;

export default function Dashboard({
  mode,
  email,
  onLogout,
  onSignup,
}: {
  mode: 'demo' | 'user';
  email?: string | null;
  onLogout: () => void;
  onSignup: () => void;
}) {
  const isDemo = mode === 'demo';

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [analyysi, setAnalyysi] = useState('');
  const [analyysiLoading, setAnalyysiLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const fetchTransactions = useCallback(async () => {
    try {
      const res = isDemo
        ? await axios.get(`${API}/demo/transactions`)
        : await api.get('/transactions/');
      setTransactions(Array.isArray(res.data) ? res.data : []);
    } catch {
      setTransactions([]);
    } finally {
      setInitialLoading(false);
    }
  }, [isDemo]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load from external API, not derived from render state
    fetchTransactions();
  }, [fetchTransactions]);

  const pickFile = (f: File | null) => {
    if (f && !f.name.toLowerCase().endsWith('.csv')) {
      setMessage('Valitse CSV-muotoinen tiedosto.');
      setMessageType('error');
      return;
    }
    setFile(f);
    setMessage('');
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setMessage('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/transactions/upload', formData);
      setMessage(res.data.message);
      setMessageType('success');
      setFile(null);
      setAnalyysi('');
      fetchTransactions();
    } catch (err) {
      const detail = axios.isAxiosError(err) ? err.response?.data?.detail : null;
      setMessage(typeof detail === 'string' ? detail : 'Virhe tiedoston latauksessa. Tarkista CSV-formaatti.');
      setMessageType('error');
    }
    setLoading(false);
  };

  const handleClear = async () => {
    if (!confirm('Poistetaanko kaikki tapahtumat?')) return;
    setClearing(true);
    try {
      await api.delete('/transactions/clear');
      setTransactions([]);
      setAnalyysi('');
      setMessage('');
      setQuery('');
      setCatFilter(null);
    } catch {
      setMessage('Virhe tietojen tyhjentämisessä.');
      setMessageType('error');
    }
    setClearing(false);
  };

  const handleAnalyysi = async () => {
    setAnalyysiLoading(true);
    try {
      const res = isDemo
        ? await axios.get(`${API}/demo/ai`)
        : await api.get('/ai/analyysi');
      setAnalyysi(res.data.analyysi);
    } catch {
      setAnalyysi('Virhe analyysin hakemisessa. Yritä hetken päästä uudelleen.');
    }
    setAnalyysiLoading(false);
  };

  const expenses = useMemo(() => transactions.filter(t => t.amount < 0), [transactions]);
  const totalExpenses = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalIncome = transactions.reduce((sum, t) => (t.amount > 0 ? sum + t.amount : sum), 0);
  const balance = totalIncome - totalExpenses;

  const chartData = useMemo(() => {
    const byMonth = transactions.reduce<Record<string, MonthData>>((acc, t) => {
      const month = t.date.slice(0, 7);
      if (!acc[month]) acc[month] = { month, tulot: 0, kulut: 0 };
      if (t.amount > 0) acc[month].tulot += t.amount;
      else acc[month].kulut += Math.abs(t.amount);
      return acc;
    }, {});
    return Object.values(byMonth)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(d => ({ ...d, label: fiMonth(d.month) }));
  }, [transactions]);

  const categoryData = useMemo(
    () =>
      Object.entries(
        expenses.reduce<Record<string, number>>((acc, t) => {
          const cat = t.category || 'Muut';
          acc[cat] = (acc[cat] || 0) + Math.abs(t.amount);
          return acc;
        }, {})
      )
        .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
        .sort((a, b) => b.value - a.value),
    [expenses]
  );

  const categories = useMemo(
    () => [...new Set(transactions.map(t => t.category || 'Muut'))].sort(),
    [transactions]
  );

  const filtered = useMemo(
    () =>
      transactions.filter(t => {
        if (catFilter && (t.category || 'Muut') !== catFilter) return false;
        if (query && !t.description.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
      }),
    [transactions, catFilter, query]
  );

  const visible = showAll ? filtered : filtered.slice(0, LIST_PREVIEW);

  return (
    <main className="min-h-screen text-slate-200 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(99,102,241,0.13),transparent),radial-gradient(ellipse_60%_40%_at_90%_110%,rgba(56,189,248,0.07),transparent)]">
      {/* HEADER */}
      <header className="border-b border-slate-800/60 px-4 sm:px-8 py-5 backdrop-blur sticky top-0 z-10 bg-slate-950/40">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-lg shadow-lg shadow-indigo-950/40 shrink-0">
              €
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-white flex items-center gap-2">
                Talousanalyysi
                {isDemo && (
                  <span className="text-[10px] uppercase tracking-wider bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-medium">
                    Demo
                  </span>
                )}
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm truncate">
                {isDemo ? 'Esimerkkiaineisto — luo tunnus omille tiedoillesi' : email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isDemo ? (
              <button
                onClick={onSignup}
                className="text-xs font-semibold bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 text-white px-4 py-2 rounded-full transition"
              >
                Luo tunnus
              </button>
            ) : (
              <>
                {transactions.length > 0 && (
                  <button
                    onClick={handleClear}
                    disabled={clearing}
                    className="text-xs text-slate-500 hover:text-rose-300 transition border border-slate-800 hover:border-rose-900/70 px-3.5 py-2 rounded-full"
                  >
                    {clearing ? 'Tyhjennetään…' : 'Tyhjennä data'}
                  </button>
                )}
                <button
                  onClick={onLogout}
                  className="text-xs text-slate-400 hover:text-slate-200 transition border border-slate-800 hover:border-slate-600 px-3.5 py-2 rounded-full"
                >
                  Kirjaudu ulos
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-7 space-y-6">
        {/* LATAUS (vain kirjautuneille) tai DEMO-BANNERI */}
        {isDemo ? (
          <section className="rounded-3xl p-6 border border-indigo-900/40 bg-gradient-to-br from-indigo-950/40 to-slate-900/50 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-slate-200 text-sm font-medium">Katselet esimerkkiaineistoa</p>
              <p className="text-slate-400 text-sm mt-1">
                Luo tunnus, niin voit ladata oman tiliotteesi. Tietosi näkyvät vain sinulle.
              </p>
            </div>
            <button
              onClick={onSignup}
              className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 px-6 py-3 rounded-2xl text-sm font-semibold text-white transition shrink-0"
            >
              Luo tunnus
            </button>
          </section>
        ) : (
          <section
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files?.[0] || null); }}
            className={`rounded-3xl p-6 border transition-colors ${
              dragOver ? 'bg-indigo-950/40 border-indigo-500/60' : 'bg-slate-900/50 border-slate-800/70'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <label className="flex-1 flex items-center gap-3 rounded-2xl border border-dashed border-slate-700 hover:border-indigo-500/60 bg-slate-900/60 px-5 py-4 cursor-pointer transition group">
                <svg className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 transition shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <span className="text-sm min-w-0">
                  {file ? (
                    <span className="text-slate-200 truncate block">{file.name}</span>
                  ) : (
                    <>
                      <span className="text-slate-300">Pudota tiliote tähän</span>
                      <span className="text-slate-500"> tai klikkaa valitaksesi</span>
                    </>
                  )}
                  <span className="block text-xs text-slate-600 mt-0.5 truncate">Revolut, Säästöpankki tai CSV (date, description, amount)</span>
                </span>
                <input type="file" accept=".csv" className="hidden" onChange={e => pickFile(e.target.files?.[0] || null)} />
              </label>
              <button
                onClick={handleUpload}
                disabled={loading || !file}
                className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 disabled:opacity-30 disabled:cursor-not-allowed px-7 py-3.5 rounded-2xl text-sm font-semibold text-white transition shadow-lg shadow-indigo-950/40 shrink-0"
              >
                {loading ? 'Analysoidaan…' : 'Analysoi'}
              </button>
            </div>
            {message && (
              <p className={`mt-4 text-sm rounded-xl px-4 py-2.5 border ${
                messageType === 'success'
                  ? 'text-emerald-300 bg-emerald-950/40 border-emerald-900/50'
                  : 'text-rose-300 bg-rose-950/40 border-rose-900/50'
              }`}>
                {message}
              </p>
            )}
          </section>
        )}

        {initialLoading ? (
          <section className="rounded-3xl p-14 border border-slate-800/70 bg-slate-900/50 text-center">
            <div className="w-8 h-8 mx-auto mb-4 rounded-full border-2 border-slate-700 border-t-indigo-400 animate-spin" />
            <p className="text-slate-400 text-sm">Yhdistetään palvelimeen…</p>
            <p className="text-slate-600 text-xs mt-1">Ensimmäinen lataus voi kestää hetken, kun palvelin herää.</p>
          </section>
        ) : transactions.length === 0 ? (
          <section className="rounded-3xl p-14 border border-dashed border-slate-800 bg-slate-900/30 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-slate-800/60 flex items-center justify-center">
              <svg className="w-7 h-7 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <p className="text-slate-300 text-sm font-medium">Aloita lataamalla tiliote</p>
            <p className="text-slate-500 text-xs mt-1.5 max-w-xs mx-auto">
              Sovellus luokittelee tapahtumat automaattisesti ja piirtää kulutuksestasi selkeät kaaviot.
            </p>
          </section>
        ) : (
          <>
            {/* YHTEENVETO */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4">
              <div className="rounded-2xl sm:rounded-3xl px-5 py-3.5 sm:p-6 border border-slate-800/70 bg-slate-900/50 min-w-0 flex sm:block items-center justify-between">
                <p className="text-slate-500 text-xs sm:mb-1.5">Tulot</p>
                <p className="text-base sm:text-2xl font-semibold text-emerald-300 truncate">+{eur.format(totalIncome)}</p>
              </div>
              <div className="rounded-2xl sm:rounded-3xl px-5 py-3.5 sm:p-6 border border-slate-800/70 bg-slate-900/50 min-w-0 flex sm:block items-center justify-between">
                <p className="text-slate-500 text-xs sm:mb-1.5">Kulut</p>
                <p className="text-base sm:text-2xl font-semibold text-rose-300 truncate">−{eur.format(totalExpenses)}</p>
              </div>
              <div className={`rounded-2xl sm:rounded-3xl px-5 py-3.5 sm:p-6 border min-w-0 flex sm:block items-center justify-between ${
                balance >= 0 ? 'border-emerald-900/50 bg-emerald-950/30' : 'border-rose-900/50 bg-rose-950/30'
              }`}>
                <p className="text-slate-400 text-xs sm:mb-1.5">Saldo</p>
                <p className={`text-base sm:text-2xl font-semibold truncate ${balance >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
                  {balance >= 0 ? '+' : '−'}{eur.format(Math.abs(balance))}
                </p>
              </div>
            </section>

            {/* KAAVIOT */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div className="rounded-3xl p-6 border border-slate-800/70 bg-slate-900/50">
                <h2 className="text-sm font-medium text-slate-300 mb-5">Tulot ja kulut kuukausittain</h2>
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={chartData} margin={{ top: 0, right: 4, left: -16, bottom: 0 }} barGap={3}>
                    <CartesianGrid strokeDasharray="3 6" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="label" stroke="#475569" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis stroke="#475569" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: 'rgba(148,163,184,0.06)' }}
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '14px', fontSize: 12 }}
                      formatter={(value, name) => [eur.format(Number(value ?? 0)), name === 'tulot' ? 'Tulot' : 'Kulut']}
                    />
                    <Bar dataKey="tulot" fill="#34d399" radius={[6, 6, 0, 0]} maxBarSize={34} isAnimationActive={false} />
                    <Bar dataKey="kulut" fill="#fb7185" radius={[6, 6, 0, 0]} maxBarSize={34} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex gap-5 mt-3 justify-center text-xs text-slate-400">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />Tulot</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-400" />Kulut</span>
                </div>
              </div>

              <div className="rounded-3xl p-6 border border-slate-800/70 bg-slate-900/50">
                <h2 className="text-sm font-medium text-slate-300 mb-5">Kulut kategorioittain</h2>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <ResponsiveContainer width="42%" height={190} className="shrink-0 min-w-[140px]">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius="58%"
                        outerRadius="88%"
                        paddingAngle={3}
                        cornerRadius={6}
                        dataKey="value"
                        isAnimationActive={false}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={entry.name} fill={categoryColor(entry.name, index)} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '14px', fontSize: 12 }}
                        formatter={(value, name) => [eur.format(Number(value ?? 0)), name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <ul className="flex-1 w-full space-y-2 text-xs">
                    {categoryData.map((c, i) => (
                      <li key={c.name} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: categoryColor(c.name, i) }} />
                        <span className="text-slate-300 flex-1">{c.name}</span>
                        <span className="text-slate-500 tabular-nums shrink-0">{totalExpenses > 0 ? Math.round((c.value / totalExpenses) * 100) : 0} %</span>
                        <span className="text-slate-300 tabular-nums shrink-0 w-[4.5rem] text-right">{eur.format(c.value)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {/* AI-ANALYYSI */}
            <section className="rounded-3xl p-6 border border-indigo-900/40 bg-gradient-to-br from-indigo-950/40 to-slate-900/50">
              <div className="flex items-center justify-between gap-4 mb-4">
                <h2 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l1.9 5.7a2 2 0 001.3 1.3L21 11l-5.8 2a2 2 0 00-1.3 1.3L12 20l-1.9-5.7a2 2 0 00-1.3-1.3L3 11l5.8-2a2 2 0 001.3-1.3L12 2z" />
                  </svg>
                  AI-säästövinkit
                </h2>
                <button
                  onClick={handleAnalyysi}
                  disabled={analyysiLoading}
                  className="bg-indigo-500/90 hover:bg-indigo-400 disabled:opacity-50 px-5 py-2.5 rounded-full text-xs font-semibold text-white transition shrink-0"
                >
                  {analyysiLoading ? 'Analysoidaan…' : analyysi ? 'Analysoi uudelleen' : 'Analysoi kulutus'}
                </button>
              </div>
              {analyysiLoading ? (
                <div className="space-y-2.5 animate-pulse">
                  <div className="h-3.5 bg-slate-800/80 rounded-full w-4/5" />
                  <div className="h-3.5 bg-slate-800/80 rounded-full w-full" />
                  <div className="h-3.5 bg-slate-800/80 rounded-full w-3/5" />
                </div>
              ) : analyysi ? (
                <AiText content={analyysi} />
              ) : (
                <p className="text-slate-500 text-sm">Claude käy kulutuksesi läpi ja antaa konkreettisia säästövinkkejä.</p>
              )}
            </section>

            {/* TAPAHTUMAT */}
            <section className="rounded-3xl p-6 border border-slate-800/70 bg-slate-900/50">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                <h2 className="text-sm font-medium text-slate-300 flex-1">
                  Tapahtumat <span className="text-slate-600 font-normal">({filtered.length})</span>
                </h2>
                <input
                  type="search"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Hae tapahtumaa…"
                  className="bg-slate-900/80 border border-slate-800 focus:border-indigo-500/60 outline-none rounded-full px-4 py-2 text-sm text-slate-200 placeholder:text-slate-600 w-full sm:w-56 transition"
                />
              </div>

              {categories.length > 1 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  <button
                    onClick={() => setCatFilter(null)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition ${
                      catFilter === null ? 'bg-slate-200 text-slate-900 border-slate-200 font-medium' : 'border-slate-800 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    Kaikki
                  </button>
                  {categories.map((c, i) => (
                    <button
                      key={c}
                      onClick={() => setCatFilter(catFilter === c ? null : c)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition flex items-center gap-1.5 ${
                        catFilter === c ? 'bg-slate-200 text-slate-900 border-slate-200 font-medium' : 'border-slate-800 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: categoryColor(c, i) }} />
                      {c}
                    </button>
                  ))}
                </div>
              )}

              {filtered.length === 0 ? (
                <p className="text-slate-600 text-sm py-6 text-center">Ei hakua vastaavia tapahtumia.</p>
              ) : (
                <>
                  <div>
                    {visible.map((t, i) => (
                      <div key={t.id} className="flex justify-between items-center gap-3 py-3 border-b border-slate-800/60 last:border-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-slate-200 truncate">{t.description}</p>
                          <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-2">
                            {fiDate(t.date)}
                            {t.category && (
                              <span className="inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: categoryColor(t.category, i) }} />
                                {t.category}
                              </span>
                            )}
                          </p>
                        </div>
                        <p className={`text-sm font-medium shrink-0 tabular-nums ${t.amount >= 0 ? 'text-emerald-300' : 'text-slate-300'}`}>
                          {t.amount > 0 ? '+' : '−'}{eur.format(Math.abs(t.amount))}
                        </p>
                      </div>
                    ))}
                  </div>
                  {filtered.length > LIST_PREVIEW && (
                    <button
                      onClick={() => setShowAll(!showAll)}
                      className="mt-4 w-full text-xs text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-600 rounded-full py-2.5 transition"
                    >
                      {showAll ? 'Näytä vähemmän' : `Näytä kaikki ${filtered.length} tapahtumaa`}
                    </button>
                  )}
                </>
              )}
            </section>
          </>
        )}

        <footer className="text-center text-xs text-slate-700 pb-4">
          Talousanalyysi · Next.js + FastAPI + scikit-learn + Claude API
        </footer>
      </div>
    </main>
  );
}
