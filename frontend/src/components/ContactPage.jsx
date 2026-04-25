export default function ContactPage({ onLogin }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-bold text-indigo-600">MyFinance</span>
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
                👤
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg">Votre prénom Nom</p>
                <p className="text-sm text-gray-500">Votre titre / rôle</p>
              </div>
            </div>

            <p className="text-gray-700 leading-relaxed">
              [Présentez-vous ici : qui vous êtes, votre parcours, vos centres d'intérêt.]
            </p>
            <p className="text-gray-700 leading-relaxed">
              [Expliquez pourquoi vous avez créé MyFinance : besoin personnel, passion pour la gestion financière, etc.]
            </p>
          </div>

          {/* Pourquoi ce projet */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Pourquoi MyFinance ?</h2>
            <p className="text-gray-700 leading-relaxed">
              [Décrivez la genèse du projet : quel problème vous souhaitiez résoudre, pourquoi les solutions existantes ne vous convenaient pas.]
            </p>
          </div>

          {/* Contact */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Me contacter</h2>
            <div className="space-y-3 text-sm text-gray-700">
              <div className="flex items-center gap-3">
                <span className="text-lg">✉️</span>
                <span>[votre.email@exemple.com]</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg">🔗</span>
                <span>[Lien LinkedIn ou autre réseau]</span>
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
