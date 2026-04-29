import logo from '../assets/logo.png'
import { useState, useEffect, useCallback } from 'react'

const SLIDES = [
  {
    src: '/landing/feature-patrimoine.png',
    alt: 'Page Patrimoine — positions et répartition par catégorie',
    title: 'Gestion du patrimoine',
    desc: 'Toutes vos positions en un coup d\'œil — boursières, crypto, immobilier et épargne — avec objectifs, plus-values et répartition par enveloppe fiscale.',
  },
  {
    src: '/landing/feature-evolution.png',
    alt: 'Évolution du patrimoine — graphique par catégorie',
    title: 'Évolution dans le temps',
    desc: 'Visualisez la progression de chaque catégorie d\'actif sur plusieurs années grâce aux relevés de patrimoine.',
  },
  {
    src: '/landing/feature-bilan.png',
    alt: 'Bilan financier — revenus, dépenses, actif et passif',
    title: 'Bilan financier',
    desc: 'Synthèse revenus / dépenses / actif / passif en un coup d\'œil — vue mensuelle ou annuelle avec projection FIRE.',
  },
  {
    src: '/landing/feature-impots.png',
    alt: 'Simulateur d\'impôts — résultats détaillés',
    title: 'Simulateur d\'impôts',
    desc: 'Estimez votre imposition en intégrant salaires, primes et revenus complémentaires. Détail ligne par ligne du calcul IRPP.',
  },
  {
    src: '/landing/feature-depenses.png',
    alt: 'Page Dépenses — répartition par catégorie',
    title: 'Dépenses récurrentes',
    desc: 'Analysez vos charges mensuelles par catégorie et calculez automatiquement votre capacité d\'épargne réelle.',
  },
]

function Carousel() {
  const [current, setCurrent] = useState(0)
  const [visible, setVisible] = useState(true)
  const [paused,  setPaused]  = useState(false)

  const goTo = useCallback((idx) => {
    setVisible(false)
    setTimeout(() => { setCurrent(idx); setVisible(true) }, 350)
  }, [])

  const next = useCallback(() => goTo((current + 1) % SLIDES.length), [goTo, current])
  const back = useCallback(() => goTo((current - 1 + SLIDES.length) % SLIDES.length), [goTo, current])

  useEffect(() => {
    if (paused) return
    const t = setInterval(next, 5000)
    return () => clearInterval(t)
  }, [paused, next])

  const slide = SLIDES[current]

  return (
    <div
      className="relative select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Image avec fondu */}
      <div className="relative rounded-2xl overflow-hidden shadow-xl ring-1 ring-gray-200 bg-gray-50">
        <img
          src={slide.src}
          alt={slide.alt}
          className="w-full object-contain block"
          loading="lazy"
          style={{ opacity: visible ? 1 : 0, transition: 'opacity 350ms ease-in-out' }}
        />

        {/* Flèches */}
        <button
          onClick={back}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-white/80 hover:bg-white shadow text-gray-600 text-xl transition"
          aria-label="Précédent"
        >‹</button>
        <button
          onClick={next}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-white/80 hover:bg-white shadow text-gray-600 text-xl transition"
          aria-label="Suivant"
        >›</button>
      </div>

      {/* Légende */}
      <div className="mt-4 text-center px-2" style={{ opacity: visible ? 1 : 0, transition: 'opacity 350ms ease-in-out' }}>
        <p className="font-semibold text-gray-900">{slide.title}</p>
        <p className="text-sm text-gray-500 mt-1 max-w-xl mx-auto">{slide.desc}</p>
      </div>

      {/* Barre de progression */}
      <div className="mt-4 h-0.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          key={current}
          style={{
            height: '100%',
            background: '#4f46e5',
            borderRadius: '9999px',
            animation: paused ? 'none' : `carousel-progress ${5}s linear forwards`,
            width: paused ? '0%' : undefined,
          }}
        />
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-2 mt-3">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Slide ${i + 1}`}
            style={{
              width: i === current ? '20px' : '8px',
              height: '8px',
              borderRadius: '9999px',
              background: i === current ? '#4f46e5' : '#d1d5db',
              transition: 'all 400ms ease',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          />
        ))}
      </div>
    </div>
  )
}

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

export default function LandingPage({ onLogin, onRegister, onDocumentation, onContact, onShowReleaseNotes }) {
  const [version, setVersion] = useState(null)

  useEffect(() => {
    // Préchargement des images du carousel
    SLIDES.forEach(s => { const img = new Image(); img.src = s.src })
    // Version (optionnel — endpoint authentifié, échoue silencieusement si non connecté)
    fetch('/api/version').then(r => r.ok ? r.json() : null).then(d => d?.version && setVersion(d.version)).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <img src={logo} alt="MyFinance" className="h-10 w-auto" />
          <div className="flex items-center gap-3">
            <button
              onClick={onDocumentation}
              className="hidden sm:inline px-4 py-2 text-sm font-medium text-gray-500 hover:text-indigo-600 transition"
            >
              Documentation
            </button>
            <button
              onClick={onContact}
              className="hidden sm:inline px-4 py-2 text-sm font-medium text-gray-500 hover:text-indigo-600 transition"
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
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
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

          {/* Hero screenshot */}
          <div className="max-w-5xl mx-auto">
            <img
              src="/landing/hero-dashboard.png"
              alt="Tableau de bord MyFinance"
              className="w-full rounded-2xl shadow-2xl ring-1 ring-gray-200"
              loading="eager"
            />
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

      {/* ── Simulateurs ── */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Une boîte à outils complète</h2>
          <p className="text-gray-500 text-center mb-10">Projetez, simulez et optimisez sans quitter l'application.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { icon: '🧾', label: 'Simulateur d\'impôts',            desc: 'Estimation IRPP avec profil fiscal personnalisé' },
              { icon: '🏠', label: 'Simulateur d\'emprunt',           desc: 'Mensualités, TAEG, amortissement et comparaison de scénarios' },
              { icon: '📊', label: 'Bilan financier',                 desc: 'Compte de résultat personnel — revenus vs dépenses vs actif' },
              { icon: '📈', label: 'Intérêts composés',              desc: 'Projection de capital avec versements et taux variables' },
              { icon: '🏦', label: 'Crédit Lombard',                  desc: 'Emprunt sur collatéral, LTV, levier et stress test' },
              { icon: '⚖️', label: 'Enveloppes fiscales',            desc: 'Comparaison PEA / CTO / Assurance-vie / PER' },
              { icon: '🌪️', label: 'Simulateur de crise',            desc: 'Impact d\'un krach ou perte d\'emploi sur votre patrimoine' },
              { icon: '🎯', label: 'Simulateur de retraite',         desc: 'Pension estimée (CNAV, Agirc-Arrco, CNRACL) et objectif PER' },
              { icon: '📋', label: 'Déclaration de patrimoine',      desc: 'Synthèse IFI-ready avec actif, passif et revenus' },
            ].map(({ icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition group">
                <span className="text-2xl shrink-0">{icon}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-indigo-700 transition">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Carousel ── */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">L'application en images</h2>
          <p className="text-gray-500 text-center mb-10">Des interfaces pensées pour être claires et efficaces.</p>
          <Carousel />
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-16 px-6 bg-indigo-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Démarrer en 3 étapes</h2>
          <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-8">
            {/* Ligne de connexion — desktop uniquement */}
            <div className="hidden sm:block absolute top-5 left-[calc(100%/6)] right-[calc(100%/6)] h-px border-t-2 border-dashed border-indigo-200" />
            {STEPS.map(s => (
              <div key={s.num} className="text-center relative">
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold text-lg flex items-center justify-center mx-auto mb-4 relative z-10">
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
          <p className="text-emerald-600 text-xs mt-3 border-t border-emerald-200 pt-3">
            Certaines fonctionnalités vous demande de saisir des données à caractère personnel (date de naissance, commune, situation familiale)
            afin de personnaliser les simulations. L'application vous en informe au moment de la saisie.
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
          {version && <span className="text-gray-600 ml-1">v{version}</span>}
          <span className="mx-2">·</span>
          <button onClick={onDocumentation} className="text-gray-400 hover:text-white transition underline underline-offset-2">
            Documentation
          </button>
          <span className="mx-2">·</span>
          <button onClick={onContact} className="text-gray-400 hover:text-white transition underline underline-offset-2">
            Contact
          </button>
          {onShowReleaseNotes && (
            <>
              <span className="mx-2">·</span>
              <button onClick={onShowReleaseNotes} className="text-gray-400 hover:text-white transition underline underline-offset-2">
                Notes de version
              </button>
            </>
          )}
        </p>
      </footer>

    </div>
  )
}
