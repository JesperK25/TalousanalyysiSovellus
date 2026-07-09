'use client';

import { useState } from 'react';
import axios from 'axios';
import { api, saveSession } from './api';

export default function AuthForm({
  onSuccess,
  onBack,
}: {
  onSuccess: (email: string) => void;
  onBack: () => void;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post(`/auth/${mode}`, { email, password });
      saveSession(res.data.token, res.data.email);
      onSuccess(res.data.email);
    } catch (err) {
      const detail = axios.isAxiosError(err) ? err.response?.data?.detail : null;
      setError(typeof detail === 'string' ? detail : 'Jotain meni pieleen. Yritä uudelleen.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(99,102,241,0.15),transparent)]">
      <div className="w-full max-w-sm">
        <button
          onClick={onBack}
          className="text-slate-500 hover:text-slate-300 text-sm mb-6 flex items-center gap-1.5 transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Takaisin
        </button>

        <div className="flex items-center gap-3 mb-7">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xl shadow-lg shadow-indigo-950/40">
            €
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">
              {mode === 'login' ? 'Kirjaudu sisään' : 'Luo tunnus'}
            </h1>
            <p className="text-slate-500 text-sm">
              {mode === 'login' ? 'Tervetuloa takaisin' : 'Omat tiedot vain sinulle'}
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">Sähköposti</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="nimi@esimerkki.fi"
              className="w-full bg-slate-900/70 border border-slate-800 focus:border-indigo-500/70 outline-none rounded-2xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 transition"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">Salasana</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'register' ? 'Vähintään 8 merkkiä' : '••••••••'}
              className="w-full bg-slate-900/70 border border-slate-800 focus:border-indigo-500/70 outline-none rounded-2xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 transition"
            />
          </div>

          {error && (
            <p className="text-rose-300 text-sm bg-rose-950/40 border border-rose-900/50 rounded-xl px-4 py-2.5">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 disabled:opacity-40 px-6 py-3.5 rounded-2xl text-sm font-semibold text-white transition shadow-lg shadow-indigo-950/40"
          >
            {loading ? 'Hetki…' : mode === 'login' ? 'Kirjaudu' : 'Luo tunnus'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-5">
          {mode === 'login' ? 'Ei vielä tunnusta?' : 'Onko sinulla jo tunnus?'}{' '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            className="text-indigo-400 hover:text-indigo-300 font-medium transition"
          >
            {mode === 'login' ? 'Luo tunnus' : 'Kirjaudu'}
          </button>
        </p>

        <p className="text-center text-xs text-slate-600 mt-6 leading-relaxed">
          Demo-projekti. Älä lataa aitoja pankkitietoja — käytä esimerkkiaineistoa.
        </p>
      </div>
    </div>
  );
}
