'use client';

import { useState, useEffect } from 'react';
import Landing from './Landing';
import AuthForm from './AuthForm';
import Dashboard from './Dashboard';
import { getToken, getEmail, clearSession } from './api';

type View = 'loading' | 'landing' | 'auth' | 'demo' | 'app';

export default function Home() {
  const [view, setView] = useState<View>('loading');
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    // Luetaan tallennettu sessio localStoragesta vasta hydraation jälkeen (SSR-turvallisesti).
    /* eslint-disable react-hooks/set-state-in-effect */
    if (getToken()) {
      setEmail(getEmail());
      setView('app');
    } else {
      setView('landing');
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const logout = () => {
    clearSession();
    setEmail(null);
    setView('landing');
  };

  if (view === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-slate-800 border-t-indigo-400 animate-spin" />
      </div>
    );
  }

  if (view === 'landing') {
    return <Landing onLogin={() => setView('auth')} onDemo={() => setView('demo')} />;
  }

  if (view === 'auth') {
    return (
      <AuthForm
        onSuccess={e => { setEmail(e); setView('app'); }}
        onBack={() => setView('landing')}
      />
    );
  }

  if (view === 'demo') {
    return <Dashboard mode="demo" onLogout={logout} onSignup={() => setView('auth')} />;
  }

  return <Dashboard mode="user" email={email} onLogout={logout} onSignup={() => setView('auth')} />;
}
