import logo from '../assets/logo.png'

export default function ContactPage({ onLogin, onHome }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={onHome} className="hover:opacity-80 transition">
            <img src={logo} alt="MyFinance" className="h-10 w-auto" />
          </button>
          <button
            onClick={onLogin}
            className="px-4 py-1.5 rounded-md text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition"
          >
            Connexion
          </button>
        </div>
      </header>

      {/* ── Contenu ── */}
      <main className="flex-1 py-16 px-6">
        <div className="max-w-2xl mx-auto space-y-10">

          {/* Titre */}
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">À propos</h1>
            <p className="text-gray-500 text-sm">Qui se cache derrière MyFinance ?</p>
          </div>

          {/* Présentation */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 space-y-4">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-2xl">
                <img src="/avatar.jpeg" alt="Kévin DESMAY" className="w-16 h-16 rounded-full object-cover" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg">Kévin DESMAY</p>
                <p className="text-sm text-gray-500">Agile Master, Coach TEDxNantes, Jury Professionnel, Boursicoteur</p>
              </div>
            </div>

            <p className="text-gray-700 leading-relaxed">
              Depuis petit je suis passionné et curieux des éléments qui m'entourent. En 2017, j'ai commencer a m'intéresser a l'investissement via les cryptomonnaies et le Crownfunding immobilier. C'est à ce moment là que j'ai commencé à creuser les différents concept autour de l'indépendances financière et comment faire travailler l'argent pour moi.
            </p>
            <p className="text-gray-700 leading-relaxed">
              A cette époque, la seule solution viable que j'ai trouvé pour suivre mon patrimoine était de faire un fichier Excel, qui avec le temps est vite devenu complexe. J'ai opté plusieurs fois à faire une application et mon amour pour le Frontend à eux raison de moi. En 2026, je tente donc via Claude Code de relancer ce projet et donne naissance à ... MyFinance.
            </p>
          </div>

          {/* Pourquoi ce projet */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Pourquoi MyFinance ?</h2>
            <p className="text-gray-700 leading-relaxed">
              Avec MyFinance, je souhaitais pouvoir gérer mon patrimoine de manière simple, rapide et efficace... et pourquoi pas, permettre à d'autres personnes de faire de même. 
              L'application gère un certains nombre d'aspect de votre gestion de patrimoine, comme le suivi de vos actifs, la visualisation de l'évolution de votre patrimoine, la gestion de vos revenues, vos dépenses, et vos dettes. Elle met a disposition un certain nombre d'outil pour vous projetez dans l'avenir... qu'il soit fructueux via le simulateur d'intéret composées ou dramatique avec le simulateur de crise financière. Bref, MyFinance regroupe tout les outils que je rêvais d'avoir au même endroit pour facilité mon suivi de mon patrimoine.
            </p>
          </div>

          {/* Contact */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Me contacter</h2>
            <div className="space-y-3 text-sm text-gray-700">
              <div className="flex items-center gap-3">
                <span className="text-lg">✉️</span>
                <a href="mailto:kevin.desmay+myfinance@gmail.com" className="text-indigo-600 hover:underline">
                  kevin.desmay+myfinance@gmail.com
                </a>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg">🔗</span>
                <a href="https://www.linkedin.com/in/kevin-desmay/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                  LinkedIn
                </a>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg">🔗</span>
                <a href="https://github.com/Neogost" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                  GitHub
                </a>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="py-5 bg-gray-900 text-center">
        <p className="text-gray-500 text-sm">© {new Date().getFullYear()} MyFinance</p>
      </footer>

    </div>
  )
}
