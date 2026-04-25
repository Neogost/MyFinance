import logo from '../assets/logo.png'

const FEATURES = [
  { icon: '📊', title: 'Patrimoine',  desc: 'Suivez vos investissements boursiers, crypto, immobilier et épargne en un seul endroit.', docId: 'patrimoine-positions' },
  { icon: '💶', title: 'Revenus',     desc: 'Gérez vos contrats salariaux, primes, avantages et revenus complémentaires.',              docId: 'revenus-salariat' },
  { icon: '📉', title: 'Dépenses',    desc: 'Analysez vos dépenses récurrentes et identifiez votre capacité d\'épargne mensuelle.',      docId: 'depenses' },
  { icon: '🏦', title: 'Dettes',      desc: 'Suivez vos crédits avec tableaux d\'amortissement et projection du capital restant.',       docId: 'dettes' },
  { icon: '🧾', title: 'Impôts',      desc: 'Simulez votre imposition et optimisez vos déclarations fiscales en temps réel.',            docId: 'outils-simulateur-impots' },
  { icon: '📈', title: 'Simulateurs', desc: 'Projetez vos investissements, planifiez votre indépendance financière et testez des scénarios.', docId: 'outils-bilan-financier' },
]

const STEPS = [
  { num: '1', title: 'Créez votre compte',      desc: 'Inscrivez-vous en quelques secondes.' },
  { num: '2', title: 'Renseignez vos données',   desc: 'Ajoutez investissements, contrats, dépenses et dettes à votre rythme.' },
  { num: '3', title: 'Visualisez & pilotez',     desc: 'Tableau de bord, objectifs, projections — tout au même endroit.' },
]

export default function LandingPage({ onLogin, onRegister, onDocumentation, onContact }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <img src={logo} alt="MyFinance" className="h-10 w-auto" />
          <div className="flex items-center gap-3">
            <button
              onClick={onDocumentation}
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-indigo-600 transition"
            >
              Documentation
            </button>
            <button
              onClick={onContact}
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-indigo-600 transition"
            >
              Contact
            </button>
            <button
              onClick={onLogin}
              className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition"
            >
              Se connecter
            </button>
            <button
              onClick={onRegister}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition"
            >
              Créer un compte
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-indigo-50 to-white py-12 md:py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight mb-4">
            Prenez le contrôle<br className="hidden sm:block" /> de votre patrimoine
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            MyFinance centralise vos finances personnelles — investissements, revenus, dépenses et dettes —
            pour vous offrir une vision claire de votre situation et de vos objectifs.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={onRegister}
              className="px-6 py-3 text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow transition"
            >
              Commencer maintenant
            </button>
            <button
              onClick={onLogin}
              className="px-6 py-3 text-base font-semibold text-indigo-600 bg-white hover:bg-indigo-50 rounded-xl border border-indigo-200 transition"
            >
              J'ai déjà un compte
            </button>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Tout ce dont vous avez besoin</h2>
          <p className="text-gray-500 text-center mb-10">Une suite complète d'outils pour piloter vos finances au quotidien.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(f => (
              <button
                key={f.title}
                onClick={() => onDocumentation(f.docId)}
                className="bg-gray-50 rounded-xl p-6 hover:shadow-md hover:bg-indigo-50 text-left transition group"
              >
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-indigo-700 transition">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
                <p className="text-xs text-indigo-500 mt-3 font-medium opacity-0 group-hover:opacity-100 transition">Voir la documentation →</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-16 px-6 bg-indigo-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Démarrer en 3 étapes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {STEPS.map(s => (
              <div key={s.num} className="text-center">
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold text-lg flex items-center justify-center mx-auto mb-4">
                  {s.num}
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{s.title}</h3>
                <p className="text-sm text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Privacy banner ── */}
      <section className="py-10 px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center bg-emerald-50 border border-emerald-200 rounded-2xl px-8 py-6">
          <p className="text-emerald-800 font-semibold">🔒 Vos données vous appartiennent</p>
          <p className="text-emerald-700 text-sm mt-2">
            Aucune donnée personnelle ou financière n'est partagée, vendue ou utilisée à des fins commerciales.
            Vous gardez le contrôle total de vos informations.
          </p>
        </div>
      </section>

      {/* ── CTA Footer ── */}
      <section className="py-16 px-6 bg-indigo-600">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Prêt à reprendre le contrôle ?</h2>
          <p className="text-indigo-200 mb-8">Rejoignez MyFinance et commencez à piloter vos finances dès aujourd'hui.</p>
          <button
            onClick={onRegister}
            className="px-8 py-3 text-base font-semibold text-indigo-600 bg-white hover:bg-indigo-50 rounded-xl shadow transition"
          >
            Créer mon compte
          </button>
        </div>
      </section>

      <footer className="py-5 bg-gray-900 text-center">
        <p className="text-gray-500 text-sm">
          © {new Date().getFullYear()} MyFinance
          <span className="mx-2">·</span>
          <button onClick={onDocumentation} className="text-gray-400 hover:text-white transition underline underline-offset-2">
            Documentation
          </button>
          <span className="mx-2">·</span>
          <button onClick={onContact} className="text-gray-400 hover:text-white transition underline underline-offset-2">
            Contact
          </button>
        </p>
      </footer>

    </div>
  )
}
