'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#6366f1', '#06b6d4', '#f59e0b', '#10b981', '#f43f5e', '#8b5cf6', '#ec4899'];

export default function Home() {
  const [transactions, setTransactions] = useState([]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [analyysi, setAnalyysi] = useState('');
  const [analyysiLoading, setAnalyysiLoading] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const res = await axios.get('http://localhost:8000/transactions/');
      setTransactions(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post('http://localhost:8000/transactions/upload', formData);
      setMessage(res.data.message);
      fetchTransactions();
    } catch (err) {
      setMessage('Virhe tiedoston latauksessa');
    }
    setLoading(false);
  };

  // Laske kulut kategorioittain (negatiiviset summat)
  const expenses = transactions.filter(t => t.amount < 0);
  const income = transactions.filter(t => t.amount > 0);
  const totalExpenses = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);

  // Kuukausidata barchart-kuvaajaan
  const monthlyData = transactions.reduce((acc, t) => {
    const month = t.date.slice(0, 7);
    if (!acc[month]) acc[month] = { month, tulot: 0, kulut: 0 };
    if (t.amount > 0) acc[month].tulot += t.amount;
    else acc[month].kulut += Math.abs(t.amount);
    return acc;
  }, {});

  const chartData = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-2">💰 Talousanalyysi</h1>
      <p className="text-gray-400 mb-8">Lataa tiliotteesi ja analysoi kulutuksesi</p>

      {/* Upload */}
      <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
        <h2 className="text-lg font-semibold mb-4">Lataa tiliote (CSV)</h2>
        <div className="flex gap-4 items-center">
          <input
            type="file"
            accept=".csv"
            onChange={e => setFile(e.target.files[0])}
            className="text-sm text-gray-400"
          />
          <button
            onClick={handleUpload}
            disabled={loading || !file}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            {loading ? 'Ladataan...' : 'Lataa'}
          </button>
        </div>
        {message && <p className="mt-3 text-green-400 text-sm">{message}</p>}
      </div>

      {/* Yhteenveto */}
      {transactions.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <p className="text-gray-400 text-sm mb-1">Tulot yhteensä</p>
              <p className="text-2xl font-bold text-green-400">+{totalIncome.toFixed(2)} €</p>
            </div>
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <p className="text-gray-400 text-sm mb-1">Kulut yhteensä</p>
              <p className="text-2xl font-bold text-red-400">-{totalExpenses.toFixed(2)} €</p>
            </div>
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <p className="text-gray-400 text-sm mb-1">Saldo</p>
              <p className={`text-2xl font-bold ${totalIncome - totalExpenses >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {(totalIncome - totalExpenses).toFixed(2)} €
              </p>
            </div>
          </div>

          {/* Kuvaaja */}
          <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
            <h2 className="text-lg font-semibold mb-4">Tulot vs kulut kuukausittain</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip contentStyle={{ backgroundColor: '#111827', border: 'none' }} />
                <Legend />
                <Bar dataKey="tulot" fill="#10b981" radius={[4,4,0,0]} />
                <Bar dataKey="kulut" fill="#f43f5e" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Kategoriakuvaaja */}
<div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
  <h2 className="text-lg font-semibold mb-4">Kulut kategorioittain</h2>
  <ResponsiveContainer width="100%" height={300}>
    <PieChart>
      <Pie
        data={Object.entries(
          expenses.reduce((acc, t) => {
            acc[t.category || 'Muut'] = (acc[t.category || 'Muut'] || 0) + Math.abs(t.amount);
            return acc;
          }, {})
        ).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))}
        cx="50%"
        cy="50%"
        outerRadius={100}
        dataKey="value"
        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
      >
        {COLORS.map((color, index) => (
          <Cell key={index} fill={color} />
        ))}
      </Pie>
      <Tooltip contentStyle={{ backgroundColor: '#111827', border: 'none' }} />
      <Legend />
    </PieChart>
  </ResponsiveContainer>
</div>
          {/* AI-analyysi */}
<div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
  <div className="flex justify-between items-center mb-4">
    <h2 className="text-lg font-semibold">🤖 AI-analyysi</h2>
    <button
      onClick={async () => {
        setAnalyysiLoading(true);
        try {
          const res = await axios.get('http://localhost:8000/ai/analyysi');
          setAnalyysi(res.data.analyysi);
        } catch (err) {
          setAnalyysi('Virhe analyysin hakemisessa.');
        }
        setAnalyysiLoading(false);
      }}
      className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-sm font-medium transition"
    >
      {analyysiLoading ? 'Analysoidaan...' : 'Analysoi kulutus'}
    </button>
  </div>
  {analyysi && (
    <p className="text-gray-300 text-sm whitespace-pre-wrap">{analyysi}</p>
  )}
</div>
          {/* Transaktiolista */}
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold mb-4">Tapahtumat</h2>
            <div className="space-y-2">
              {transactions.map(t => (
                <div key={t.id} className="flex justify-between items-center py-2 border-b border-gray-800">
                  <div>
                    <p className="text-sm font-medium">{t.description}</p>
                    <p className="text-xs text-gray-500">{t.date}</p>
                  </div>
                  <p className={`font-semibold ${t.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
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