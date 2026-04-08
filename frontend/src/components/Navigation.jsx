import { useState } from 'react'

function NavBtn({ page, label, currentPage, onNavigate, onClose }) {
  return (
    <button
      onClick={() => { onNavigate(page); onClose() }}
      className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
        currentPage === page
          ? 'bg-indigo-600 text-white'
          : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
      }`}
    >
      {label}
    </button>
  )
}

export default function Navigation({ user, currentPage, onNavigate, onLogout }) {
  const [incomeOpen, setIncomeOpen] = useState(false)

  const isIncomePage = currentPage === 'salary' || currentPage === 'other-incomes'

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white shadow-sm">
      <h1 className="text-lg font-bold text-gray-900">MyFinance</h1>

      <nav className="flex items-center gap-1">
        <NavBtn page="dashboard" label="Tableau de bord" currentPage={currentPage} onNavigate={onNavigate} onClose={() => setIncomeOpen(false)} />

        {/* ── Menu Revenus avec sous-menu ── */}
        <div className="relative">
          <button
            onClick={() => setIncomeOpen(v => !v)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-1 ${
              isIncomePage
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
            }`}
          >
            Revenus
            <span className="text-xs">{incomeOpen ? '▲' : '▼'}</span>
          </button>

          {incomeOpen && (
            <>
              {/* Overlay pour fermer en cliquant dehors */}
              <div className="fixed inset-0 z-10" onClick={() => setIncomeOpen(false)} />
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[180px] py-1">
                <button
                  onClick={() => { onNavigate('salary'); setIncomeOpen(false) }}
                  className={`w-full text-left px-4 py-2 text-sm transition ${
                    currentPage === 'salary'
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Salariat
                </button>
                <button
                  onClick={() => { onNavigate('other-incomes'); setIncomeOpen(false) }}
                  className={`w-full text-left px-4 py-2 text-sm transition ${
                    currentPage === 'other-incomes'
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Complémentaires
                </button>
              </div>
            </>
          )}
        </div>

        {user.role === 'ADMIN' && <NavBtn page="users" label="Utilisateurs" currentPage={currentPage} onNavigate={onNavigate} onClose={() => setIncomeOpen(false)} />}
        <NavBtn page="profile" label="Mon profil" currentPage={currentPage} onNavigate={onNavigate} onClose={() => setIncomeOpen(false)} />
      </nav>

      <div className="flex items-center gap-3 text-sm">
        <span className="text-gray-700">{user.firstName} {user.lastName}</span>
        <span className="px-2 py-0.5 bg-violet-100 text-violet-800 rounded-full text-xs font-semibold">
          {user.role}
        </span>
        <button
          onClick={onLogout}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition"
        >
          Déconnexion
        </button>
      </div>
    </header>
  )
}
