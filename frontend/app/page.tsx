'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

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
  const [analyysi, setAnalyysi] = useState('');
  const [analyysiLoading, setAnalyysiLoading] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const res = await axios.get('https://talousanalyysisovellus-production.up.railway.app/transactions/');
      setTransactions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setTransactions([]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post('https://talousanalyysisovellus-production.up.railway.app', formData);
      setMessage(res.data.message);
      fetchTransactions();
    } catch (err) {
      setMessage('Virhe tiedoston latauksessa');
    }
    setLoading(false);
  };

  const expenses = transactions.filter(t => t.amount < 0);
  const income = transactions.filter(t => t.amount > 0);
  const totalExpenses = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);

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
    <main className="min-h-screen bg-gray-950 text-white p-4 sm:p-8">
      {/* HEADER */}
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">💰 Talousanalyysi</h1>
      <p className="text-gray-400 mb-6 sm:mb-8 text-sm sm:text-base">Lataa tiliotteesi ja analysoi kulutuksesi</p>

      {/* TIEDOSTON LATAUS */}
      <div className="bg-gray-900 rounded-2xl p-4 sm:p-6 mb-6 border border-gray-800">
        <h2 className="text-lg font-semibold mb-4">Lataa tiliote (CSV)</h2>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <label className="flex-1 min-w-0">
            <span className="block text-sm text-gray-400 mb-1 sm:hidden">Valitse tiedosto</span>
            <input
              type="file"
              accept=".csv"
              onChange={e => setFile(e.target.files?.[0] || null)}
              className="text-sm text-gray-400 w-full"
            />
          </label>
          <button
            onClick={handleUpload}
            disabled={loading || !file}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium transition w-full sm:w-auto shrink-0"
          >
            {loading ? 'Ladataan...' : 'Lataa'}
          </button>
        </div>
        {message && <p className="mt-3 text-green-400 text-sm">{message}</p>}
      </div>

      {transactions.length > 0 && (
        <>
          {/* YHTEENVETO-KORTIT — 2 saraketta mobiilissa, Saldo koko leveys, 3 desktopilla */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
            <div className="bg-gray-900 rounded-2xl p-4 sm:p-6 border border-gray-800">
              <p className="text-gray-400 text-xs sm:text-sm mb-1">Tulot yhteensä</p>
              <p className="text-lg sm:text-2xl font-bold text-green-400 truncate">+{totalIncome.toFixed(2)} €</p>
            </div>
            <div className="bg-gray-900 rounded-2xl p-4 sm:p-6 border border-gray-800">
              <p className="text-gray-400 text-xs sm:text-sm mb-1">Kulut yhteensä</p>
              <p className="text-lg sm:text-2xl font-bold text-red-400 truncate">-{totalExpenses.toFixed(2)} €</p>
            </div>
            <div className="col-span-2 sm:col-span-1 bg-gray-900 rounded-2xl p-4 sm:p-6 border border-gray-800">
              <p className="text-gray-400 text-xs sm:text-sm mb-1">Saldo</p>
              <p className={`text-lg sm:text-2xl font-bold ${totalIncome - totalExpenses >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {(totalIncome - totalExpenses).toFixed(2)} €
              </p>
            </div>
          </div>

          {/* PYLVÄSKAAVIO */}
          <div className="bg-gray-900 rounded-2xl p-4 sm:p-6 mb-6 border border-gray-800">
            <h2 className="text-lg font-semibold mb-4">Tulot vs kulut kuukausittain</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData} margin={{ top: 0, right: 8, left: -16, bottom: 0 }}>
                <XAxis dataKey="month" stroke="#6b7280" tick={{ fontSize: 11 }} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#111827', border: 'none' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="tulot" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="kulut" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* PIIRAKKAKAAVIO */}
          <div className="bg-gray-900 rounded-2xl p-4 sm:p-6 mb-6 border border-gray-800">
            <h2 className="text-lg font-semibold mb-4">Kulut kategorioittain</h2>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="45%"
                  outerRadius="40%"
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
                <Tooltip contentStyle={{ backgroundColor: '#111827', border: 'none' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* AI-ANALYYSI */}
          <div className="bg-gray-900 rounded-2xl p-4 sm:p-6 mb-6 border border-gray-800">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
              <h2 className="text-lg font-semibold">🤖 AI-analyysi</h2>
              <button
                onClick={async () => {
                  setAnalyysiLoading(true);
                  try {
                    const res = await axios.get('https://talousanalyysisovellus-production.up.railway.app/ai/analyysi');
                    setAnalyysi(res.data.analyysi);
                  } catch (err) {
                    setAnalyysi('Virhe analyysin hakemisessa.');
                  }
                  setAnalyysiLoading(false);
                }}
                className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-sm font-medium transition w-full sm:w-auto"
              >
                {analyysiLoading ? 'Analysoidaan...' : 'Analysoi kulutus'}
              </button>
            </div>
            {analyysi && (
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{analyysi}</p>
            )}
          </div>

          {/* TAPAHTUMALISTA */}
          <div className="bg-gray-900 rounded-2xl p-4 sm:p-6 border border-gray-800">
            <h2 className="text-lg font-semibold mb-4">Tapahtumat</h2>
            <div className="space-y-2">
              {transactions.map(t => (
                <div key={t.id} className="flex justify-between items-start gap-3 py-2 border-b border-gray-800">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{t.description}</p>
                    <p className="text-xs text-gray-500">{t.date}</p>
                  </div>
                  <p className={`text-sm font-semibold shrink-0 ${t.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {t.amount > 0 ? '+' : ''}{t.amount.toFixed(2)} €
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </main>
  );
}