import { useState } from 'react'
import logo from '../assets/logo.png'

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

function EyeIcon({ hidden }) {
  return hidden ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function HomeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}

export default function Navigation({ user, currentPage, onNavigate, onLogout, hideValues, onToggleHideValues, familyMode, onToggleFamilyMode }) {
  const [incomeOpen, setIncomeOpen] = useState(false)
  const [toolsOpen,  setToolsOpen]  = useState(false)
  const [adminOpen,  setAdminOpen]  = useState(false)

  const isIncomePage  = currentPage === 'salary' || currentPage === 'other-incomes'
  const isToolsPage   = currentPage === 'tax-simulator' || currentPage === 'bilan-financier' || currentPage === 'compound-interest' || currentPage === 'loan-simulator' || currentPage === 'patrimoine-declaration'
  const isAdminPage   = currentPage === 'users' || currentPage === 'admin-snapshots' || currentPage === 'login-history' || currentPage === 'admin-family-groups'

  function closeAll() { setIncomeOpen(false); setToolsOpen(false); setAdminOpen(false) }

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 bg-white shadow-sm">
      <img src={logo} alt="MyFinance" className="h-12 w-auto" />

      <nav className="flex items-center gap-1">
        <NavBtn page="dashboard" label="Tableau de bord" currentPage={currentPage} onNavigate={onNavigate} onClose={closeAll} />

        <NavBtn page="patrimoine" label="Patrimoine" currentPage={currentPage} onNavigate={onNavigate} onClose={closeAll} />

        {/* ── Menu Revenus avec sous-menu ── */}
        <div className="relative">
          <button
            onClick={() => { setIncomeOpen(v => !v); setToolsOpen(false) }}
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

        <NavBtn page="expenses"    label="Dépenses" currentPage={currentPage} onNavigate={onNavigate} onClose={closeAll} />

        <NavBtn page="possessions" label="Passifs"   currentPage={currentPage} onNavigate={onNavigate} onClose={closeAll} />

        {/* ── Menu Outils avec sous-menu ── */}
        <div className="relative">
          <button
            onClick={() => { setToolsOpen(v => !v); setIncomeOpen(false) }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-1 ${
              isToolsPage
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
            }`}
          >
            Outils
            <span className="text-xs">{toolsOpen ? '▲' : '▼'}</span>
          </button>

          {toolsOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setToolsOpen(false)} />
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[200px] py-1">
                <button
                  onClick={() => { onNavigate('tax-simulator'); setToolsOpen(false) }}
                  className={`w-full text-left px-4 py-2 text-sm transition ${
                    currentPage === 'tax-simulator'
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Simulateur des impôts
                </button>
                <button
                  onClick={() => { onNavigate('bilan-financier'); setToolsOpen(false) }}
                  className={`w-full text-left px-4 py-2 text-sm transition ${
                    currentPage === 'bilan-financier'
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Bilan financier
                </button>
                <button
                  onClick={() => { onNavigate('compound-interest'); setToolsOpen(false) }}
                  className={`w-full text-left px-4 py-2 text-sm transition ${
                    currentPage === 'compound-interest'
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Intérêts composés
                </button>
                <button
                  onClick={() => { onNavigate('loan-simulator'); setToolsOpen(false) }}
                  className={`w-full text-left px-4 py-2 text-sm transition ${
                    currentPage === 'loan-simulator'
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Simulateur d'emprunt
                </button>
                <button
                  onClick={() => { onNavigate('patrimoine-declaration'); setToolsOpen(false) }}
                  className={`w-full text-left px-4 py-2 text-sm transition ${
                    currentPage === 'patrimoine-declaration'
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Déclaration de patrimoine
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── Menu Administration (ADMIN uniquement) ── */}
        {user.role === 'ADMIN' && (
          <div className="relative">
            <button
              onClick={() => { setAdminOpen(v => !v); setIncomeOpen(false); setToolsOpen(false) }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-1 ${
                isAdminPage
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
              }`}
            >
              Administration
              <span className="text-xs">{adminOpen ? '▲' : '▼'}</span>
            </button>

            {adminOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setAdminOpen(false)} />
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[200px] py-1">
                  <button
                    onClick={() => { onNavigate('users'); setAdminOpen(false) }}
                    className={`w-full text-left px-4 py-2 text-sm transition ${
                      currentPage === 'users'
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Utilisateurs
                  </button>
                  <button
                    onClick={() => { onNavigate('admin-snapshots'); setAdminOpen(false) }}
                    className={`w-full text-left px-4 py-2 text-sm transition ${
                      currentPage === 'admin-snapshots'
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Gestion des relevés
                  </button>
                  <button
                    onClick={() => { onNavigate('login-history'); setAdminOpen(false) }}
                    className={`w-full text-left px-4 py-2 text-sm transition ${
                      currentPage === 'login-history'
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Historique des connexions
                  </button>
                  <button
                    onClick={() => { onNavigate('admin-family-groups'); setAdminOpen(false) }}
                    className={`w-full text-left px-4 py-2 text-sm transition ${
                      currentPage === 'admin-family-groups'
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Regroupements familiaux
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        <NavBtn page="profile" label="Mon profil" currentPage={currentPage} onNavigate={onNavigate} onClose={closeAll} />
      </nav>

      <div className="flex items-center gap-3 text-sm">
        <button
          onClick={onToggleHideValues}
          title={hideValues ? 'Afficher les valeurs' : 'Masquer les valeurs'}
          className={`p-1.5 rounded-md transition ${hideValues ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
        >
          <EyeIcon hidden={hideValues} />
        </button>
        {user.familyGroupId && (
          <button
            onClick={onToggleFamilyMode}
            title={familyMode
              ? 'Mode Foyer actif — cliquer pour désactiver'
              : 'Activer le Mode Foyer (vue agrégée du groupe)'}
            className={`p-1.5 rounded-md transition ${familyMode ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
          >
            <HomeIcon />
          </button>
        )}
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
