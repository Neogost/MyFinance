import logo from '../assets/logo.png'
import { useState } from 'react'

export default function ContactPage({ onLogin, onHome }) {
  const [copied, setCopied] = useState(false)

  function copyEmail() {
    navigator.clipboard.writeText('kevin.desmay+myfinance@gmail.com').then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onHome}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition"
              aria-label="Retour à l'accueil"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Retour</span>
            </button>
            <button onClick={onHome} className="hover:opacity-80 transition">
              <img src={logo} alt="MyFinance" className="h-10 w-auto" />
            </button>
          </div>
          <button
            onClick={onLogin}
            className="px-4 py-1.5 rounded-md text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition"
          >
            Connexion
          </button>
        </div>
      </header>

      {/* ── Contenu ── */}
      <main className="flex-1 py-12 px-4 md:px-6">
        <div className="max-w-2xl mx-auto space-y-8">

          {/* Titre */}
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">À propos</h1>
            <p className="text-gray-500 text-sm">Qui se cache derrière MyFinance ?</p>
          </div>

          {/* Présentation */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-violet-500" />
          <div className="p-5 md:p-8 space-y-4">
            <div className="flex items-center gap-5 mb-6">
              <img
                src="/avatar.jpeg"
                alt="Kévin DESMAY"
                className="w-20 h-20 rounded-full object-cover object-top shrink-0 ring-2 ring-indigo-100"
              />
              <div className="min-w-0">
                <p className="font-bold text-gray-900 text-lg">Kévin DESMAY</p>
                <p className="text-sm text-gray-500 mt-0.5">Agile Master, Coach TEDxNantes,<br className="hidden sm:block" /> Jury Professionnel, Boursicoteur</p>
              </div>
            </div>

            <p className="text-gray-700 leading-relaxed">
              Depuis petit je suis passionné et curieux des éléments qui m'entourent. En 2017, j'ai commencer a m'intéresser a l'investissement via les cryptomonnaies et le Crownfunding immobilier. C'est à ce moment là que j'ai commencé à creuser les différents concept autour de l'indépendances financière et comment faire travailler l'argent pour moi.
            </p>
            <p className="text-gray-700 leading-relaxed">
              A cette époque, la seule solution viable que j'ai trouvé pour suivre mon patrimoine était de faire un fichier Excel, qui avec le temps est vite devenu complexe. J'ai opté plusieurs fois à faire une application et mon amour pour le Frontend à eux raison de moi. En 2026, je tente donc via Claude Code de relancer ce projet et donne naissance à ... MyFinance.
            </p>
          </div>
          </div>

          {/* Pourquoi ce projet */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 md:p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Pourquoi MyFinance ?</h2>
            <p className="text-gray-700 leading-relaxed">
              Avec MyFinance, je souhaitais pouvoir gérer mon patrimoine de manière simple, rapide et efficace... et pourquoi pas, permettre à d'autres personnes de faire de même.
              L'application gère un certains nombre d'aspect de votre gestion de patrimoine, comme le suivi de vos actifs, la visualisation de l'évolution de votre patrimoine, la gestion de vos revenues, vos dépenses, et vos dettes. Elle met a disposition un certain nombre d'outil pour vous projetez dans l'avenir... qu'il soit fructueux via le simulateur d'intéret composées ou dramatique avec le simulateur de crise financière. Bref, MyFinance regroupe tout les outils que je rêvais d'avoir au même endroit pour facilité mon suivi de mon patrimoine.
            </p>
          </div>

          {/* Contact */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 md:p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Me contacter</h2>
            <div className="space-y-2 text-sm">

              {/* Email + bouton copier */}
              <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white transition group">
                <svg className="w-5 h-5 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
                <a href="mailto:kevin.desmay+myfinance@gmail.com" className="text-indigo-600 hover:underline break-all flex-1">
                  kevin.desmay+myfinance@gmail.com
                </a>
                <button
                  onClick={copyEmail}
                  title="Copier l'adresse"
                  className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-100 transition"
                  aria-label="Copier l'adresse email"
                >
                  {copied
                    ? <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                    : <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                  }
                </button>
              </div>

              {/* LinkedIn */}
              <a
                href="https://www.linkedin.com/in/kevin-desmay/"
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white transition"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="#0A66C2" aria-hidden="true">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                <span className="text-indigo-600">LinkedIn — Kévin DESMAY</span>
                <svg className="w-3.5 h-3.5 text-gray-400 ml-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
              </a>

              {/* GitHub */}
              <a
                href="https://github.com/Neogost"
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white transition"
              >
                <svg className="w-5 h-5 shrink-0 text-gray-800" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                <span className="text-indigo-600">GitHub — Neogost</span>
                <svg className="w-3.5 h-3.5 text-gray-400 ml-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
              </a>

            </div>
          </div>

        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="py-5 bg-gray-900 text-center">
        <p className="text-gray-500 text-sm">
          © {new Date().getFullYear()} MyFinance
          <span className="mx-2">·</span>
          <button onClick={onHome} className="text-gray-400 hover:text-white transition underline underline-offset-2">
            ← Accueil
          </button>
        </p>
      </footer>

    </div>
  )
}
