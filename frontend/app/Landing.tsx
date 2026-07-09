'use client';

export default function Landing({
  onLogin,
  onDemo,
}: {
  onLogin: () => void;
  onDemo: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(99,102,241,0.16),transparent),radial-gradient(ellipse_60%_50%_at_90%_110%,rgba(56,189,248,0.08),transparent)]">
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-3xl shadow-xl shadow-indigo-950/50 mb-6">
          €
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Talousanalyysi</h1>
        <p className="text-slate-400 mt-3 leading-relaxed">
          Lataa tiliotteesi, näe kulut automaattisesti kategorioituna selkeinä kaavioina
          ja saa henkilökohtaiset säästövinkit tekoälyltä.
        </p>

        <div className="mt-9 space-y-3">
          <button
            onClick={onLogin}
            className="w-full bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 px-6 py-4 rounded-2xl text-sm font-semibold text-white transition shadow-lg shadow-indigo-950/40"
          >
            Kirjaudu tai luo tunnus
          </button>
          <button
            onClick={onDemo}
            className="w-full bg-slate-900/70 border border-slate-800 hover:border-slate-600 px-6 py-4 rounded-2xl text-sm font-medium text-slate-200 transition"
          >
            Katso demo ilman tunnusta
          </button>
        </div>

        <div className="mt-9 grid grid-cols-3 gap-3 text-left">
          {[
            { t: 'Automaattinen luokittelu', d: 'Koneoppimismalli lajittelee tapahtumat' },
            { t: 'Selkeät kaaviot', d: 'Kulut ja tulot yhdellä silmäyksellä' },
            { t: 'AI-säästövinkit', d: 'Claude analysoi kulutuksesi' },
          ].map(f => (
            <div key={f.t} className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-3.5">
              <p className="text-xs font-medium text-slate-200 leading-snug">{f.t}</p>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">{f.d}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-600 mt-8">
          Omat tietosi näkyvät vain sinulle kirjautumisen jälkeen.
        </p>
      </div>
    </div>
  );
}
