'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const API = 'https://talousanalyysisovellus-production.up.railway.app';
const COLORS = ['#6366f1', '#06b6d4', '#f59e0b', '#10b981', '#f43f5e', '#8b5cf6', '#ec4899'];

type Transaction = {
  id: number;
  date: string;
  description: string;
  amount: number;
  category: string | null;
};

type MonthData = { month: string; tulot: number; kulut: number };

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [analyysi, setAnalyysi] = useState('');
  const [analyysiLoading, setAnalyysiLoading] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const res = await axios.get(`${API}/transactions/`);
      setTransactions(Array.isArray(res.data) ? res.data : []);
    } catch {
      setTransactions([]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setMessage('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post(`${API}/transactions/upload`, formData);
      setMessage(res.data.message);
      setMessageType('success');
      setFile(null);
      fetchTransactions();
    } catch {
      setMessage('Virhe tiedoston latauksessa. Tarkista CSV-formaatti.');
      setMessageType('error');
    }
    setLoading(false);
  };

  const handleClear = async () => {
    if (!confirm('Poistetaanko kaikki tapahtumat?')) return;
    setClearing(true);
    try {
      await axios.delete(`${API}/transactions/clear`);
      setTransactions([]);
      setAnalyysi('');
      setMessage('');
    } catch {
      setMessage('Virhe tietojen tyhjentämisessä.');
      setMessageType('error');
    }
    setClearing(false);
  };

  const expenses = transactions.filter(t => t.amount < 0);
  const income = transactions.filter(t => t.amount > 0);
  const totalExpenses = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpenses;

  const monthlyData = transactions.reduce<Record<string, MonthData>>((acc, t) => {
    const month = t.date.slice(0, 7);
    if (!acc[month]) acc[month] = { month, tulot: 0, kulut: 0 };
    if (t.amount > 0) acc[month].tulot += t.amount;
    else acc[month].kulut += Math.abs(t.amount);
    return acc;
  }, {});

  const chartData = (Object.values(monthlyData) as MonthData[]).sort((a, b) => a.month.localeCompare(b.month));

  const categoryData = Object.entries(
    expenses.reduce<Record<string, number>>((acc, t) => {
      const cat = t.category || 'Muut';
      acc[cat] = (acc[cat] || 0) + Math.abs(t.amount);
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }));

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* HEADER */}
      <div className="border-b border-gray-800 px-4 sm:px-8 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Talousanalyysi</h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-0.5">Lataa tiliotteesi · Analysoi kulutus · AI-vinkit</p>
          </div>
          {transactions.length > 0 && (
            <button
              onClick={handleClear}
              disabled={clearing}
              className="text-xs text-gray-500 hover:text-red-400 transition border border-gray-700 hover:border-red-800 px-3 py-1.5 rounded-lg"
            >
              {clearing ? 'Tyhjennetään...' : 'Tyhjennä data'}
            </button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 space-y-5">

        {/* TIEDOSTON LATAUS */}
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-widest mb-4">Lataa tiliote</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <label className="flex-1 flex items-center gap-3 bg-gray-800 border border-gray-700 hover:border-gray-500 rounded-xl px-4 py-3 cursor-pointer transition">
              <span className="text-gray-400 text-sm">📎</span>
              <span className="text-sm text-gray-300 truncate">
                {file ? file.name : 'Valitse CSV-tiedosto...'}
              </span>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={e => { setFile(e.target.files?.[0] || null); setMessage(''); }}
              />
            </label>
            <button
              onClick={handleUpload}
              disabled={loading || !file}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed px-6 py-3 rounded-xl text-sm font-semibold transition shrink-0"
            >
              {loading ? 'Ladataan...' : 'Analysoi'}
            </button>
          </div>
          {message && (
            <p className={`mt-3 text-sm ${messageType === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {message}
            </p>
          )}
          <p className="mt-3 text-xs text-gray-600">Tuetut formaatit: Revolut, Säästöpankki, tai CSV jossa sarakkeet date/description/amount</p>
        </div>

        {transactions.length === 0 ? (
          <div className="bg-gray-900 rounded-2xl p-12 border border-gray-800 border-dashed text-center">
            <p className="text-4xl mb-3">📊</p>
            <p className="text-gray-400 text-sm">Ei vielä dataa. Lataa tiliote yllä.</p>
          </div>
        ) : (
          <>
            {/* YHTEENVETO */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-900 rounded-2xl p-4 sm:p-5 border border-gray-800">
                <p className="text-gray-500 text-xs mb-2">Tulot</p>
                <p className="text-lg sm:text-2xl font-bold text-green-400 truncate">+{totalIncome.toFixed(2)} €</p>
              </div>
              <div className="bg-gray-900 rounded-2xl p-4 sm:p-5 border border-gray-800">
                <p className="text-gray-500 text-xs mb-2">Kulut</p>
                <p className="text-lg sm:text-2xl font-bold text-red-400 truncate">-{totalExpenses.toFixed(2)} €</p>
              </div>
              <div className={`rounded-2xl p-4 sm:p-5 border ${balance >= 0 ? 'bg-green-950 border-green-900' : 'bg-red-950 border-red-900'}`}>
                <p className="text-gray-400 text-xs mb-2">Saldo</p>
                <p className={`text-lg sm:text-2xl font-bold truncate ${balance >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                  {balance >= 0 ? '+' : ''}{balance.toFixed(2)} €
                </p>
              </div>
            </div>

            {/* KAAVIOT — rinnakkain desktopilla */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-widest mb-4">Tulot vs kulut</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                    <XAxis dataKey="month" stroke="#4b5563" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#4b5563" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="tulot" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="kulut" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-widest mb-4">Kulut kategorioittain</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      outerRadius="65%"
                      dataKey="value"
                      label={({ name, percent }: { name?: string; percent?: number }) =>
                        `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      labelLine={true}
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={index} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px', fontSize: 12 }}
                      formatter={(value: number) => [`${value.toFixed(2)} €`, '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* AI-ANALYYSI */}
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-widest">AI-analyysi</h2>
                <button
                  onClick={async () => {
                    setAnalyysiLoading(true);
                    try {
                      const res = await axios.get(`${API}/ai/analyysi`);
                      setAnalyysi(res.data.analyysi);
                    } catch {
                      setAnalyysi('Virhe analyysin hakemisessa.');
                    }
                    setAnalyysiLoading(false);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-xs font-semibold transition"
                >
                  {analyysiLoading ? 'Analysoidaan...' : 'Analysoi kulutus'}
                </button>
              </div>
              {analyysi ? (
                <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{analyysi}</p>
              ) : (
                <p className="text-gray-600 text-sm">Paina nappia saadaksesi AI-analyysin kulutuksestasi.</p>
              )}
            </div>

            {/* TAPAHTUMALISTA */}
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-widest mb-4">
                Tapahtumat <span className="text-gray-600 font-normal normal-case">({transactions.length})</span>
              </h2>
              <div className="space-y-1">
                {transactions.map(t => (
                  <div key={t.id} className="flex justify-between items-center gap-3 py-2.5 border-b border-gray-800 last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">{t.description}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{t.date}{t.category ? ` · ${t.category}` : ''}</p>
                    </div>
                    <p className={`text-sm font-semibold shrink-0 tabular-nums ${t.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {t.amount > 0 ? '+' : ''}{t.amount.toFixed(2)} €
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
