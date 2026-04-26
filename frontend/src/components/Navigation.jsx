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

function DarkModeIcon({ dark }) {
  return dark ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
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

// ── Icônes bottom nav ──────────────────────────────────────────────
function IconDashboard() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  )
}
function IconPatrimoine() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  )
}
function IconDepenses() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>
    </svg>
  )
}
function IconDettes() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  )
}
function IconMore() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
    </svg>
  )
}

const BOTTOM_NAV = [
  { page: 'dashboard',  label: 'Tableau',    Icon: IconDashboard },
  { page: 'patrimoine', label: 'Patrimoine', Icon: IconPatrimoine },
  { page: 'expenses',   label: 'Dépenses',   Icon: IconDepenses },
  { page: 'dettes',     label: 'Dettes',     Icon: IconDettes },
]

function MobileMenuItem({ label, page, currentPage, onNavigate, onClose, badge }) {
  return (
    <button
      onClick={() => { onNavigate(page); onClose() }}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition ${
        currentPage === page ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      <span>{label}</span>
      {badge > 0 && (
        <span className="bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 leading-none">{badge}</span>
      )}
    </button>
  )
}

function MobileSectionTitle({ children }) {
  return <p className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">{children}</p>
}

export default function Navigation({ user, currentPage, onNavigate, onLogout, hideValues, onToggleHideValues, darkMode, onToggleDarkMode, familyMode, onToggleFamilyMode, pendingRegistrations = 0, appVersion = null }) {
  const [incomeOpen,     setIncomeOpen]     = useState(false)
  const [toolsOpen,      setToolsOpen]      = useState(false)
  const [adminOpen,      setAdminOpen]      = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isIncomePage = currentPage === 'salary' || currentPage === 'other-incomes'
  const isToolsPage  = ['tax-simulator','bilan-financier','compound-interest','loan-simulator','patrimoine-declaration','crisis-simulator'].includes(currentPage)
  const isAdminPage  = ['users','admin-snapshots','login-history','admin-family-groups','admin-instruments','admin-registrations'].includes(currentPage)
  const isDocPage    = currentPage === 'documentation'

  function closeAll() { setIncomeOpen(false); setToolsOpen(false); setAdminOpen(false) }
  function closeMobile() { setMobileMenuOpen(false) }

  return (
    <>
      {/* ══════════════════════════════════════
          HEADER (desktop complet / mobile simplifié)
      ══════════════════════════════════════ */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 md:px-6 py-3 bg-white shadow-sm">
        <img src={logo} alt="MyFinance" className="h-8 md:h-12 w-auto" />

        {/* ── Nav desktop (cachée sur mobile) ── */}
        <nav className="hidden md:flex items-center gap-1">
          <NavBtn page="dashboard" label="Tableau de bord" currentPage={currentPage} onNavigate={onNavigate} onClose={closeAll} />
          <NavBtn page="patrimoine" label="Patrimoine" currentPage={currentPage} onNavigate={onNavigate} onClose={closeAll} />

          <div className="relative">
            <button
              onClick={() => { setIncomeOpen(v => !v); setToolsOpen(false) }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-1 ${isIncomePage ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'}`}
            >
              Revenus <span className="text-xs">{incomeOpen ? '▲' : '▼'}</span>
            </button>
            {incomeOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIncomeOpen(false)} />
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[180px] py-1">
                  <button onClick={() => { onNavigate('salary'); setIncomeOpen(false) }} className={`w-full text-left px-4 py-2 text-sm transition ${currentPage === 'salary' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}>Salariat</button>
                  <button onClick={() => { onNavigate('other-incomes'); setIncomeOpen(false) }} className={`w-full text-left px-4 py-2 text-sm transition ${currentPage === 'other-incomes' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}>Complémentaires</button>
                </div>
              </>
            )}
          </div>

          <NavBtn page="expenses"    label="Dépenses"  currentPage={currentPage} onNavigate={onNavigate} onClose={closeAll} />
          <NavBtn page="possessions" label="Passifs"   currentPage={currentPage} onNavigate={onNavigate} onClose={closeAll} />
          <NavBtn page="dettes"      label="Dettes"    currentPage={currentPage} onNavigate={onNavigate} onClose={closeAll} />

          <div className="relative">
            <button
              onClick={() => { setToolsOpen(v => !v); setIncomeOpen(false) }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-1 ${isToolsPage ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'}`}
            >
              Outils <span className="text-xs">{toolsOpen ? '▲' : '▼'}</span>
            </button>
            {toolsOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setToolsOpen(false)} />
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[200px] py-1">
                  {[
                    ['tax-simulator',         'Simulateur des impôts'],
                    ['bilan-financier',        'Bilan financier'],
                    ['compound-interest',      'Intérêts composés'],
                    ['loan-simulator',         "Simulateur d'emprunt"],
                    ['patrimoine-declaration', 'Déclaration de patrimoine'],
                    ['crisis-simulator',       'Simulation de crise'],
                  ].map(([page, label]) => (
                    <button key={page} onClick={() => { onNavigate(page); setToolsOpen(false) }}
                      className={`w-full text-left px-4 py-2 text-sm transition ${currentPage === page ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {user.role === 'ADMIN' && (
            <div className="relative">
              <button
                onClick={() => { setAdminOpen(v => !v); setIncomeOpen(false); setToolsOpen(false) }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-1 ${isAdminPage ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'}`}
              >
                Administration <span className="text-xs">{adminOpen ? '▲' : '▼'}</span>
              </button>
              {adminOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setAdminOpen(false)} />
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[200px] py-1">
                    {[
                      ['users',                'Utilisateurs',               0],
                      ['admin-snapshots',      'Gestion des relevés',        0],
                      ['login-history',        'Historique des connexions',  0],
                      ['admin-family-groups',  'Regroupements familiaux',    0],
                      ['admin-instruments',    'Instruments financiers',     0],
                      ['admin-registrations',  "Demandes d'inscription",     pendingRegistrations],
                    ].map(([page, label, badge]) => (
                      <button key={page} onClick={() => { onNavigate(page); setAdminOpen(false) }}
                        className={`w-full text-left px-4 py-2 text-sm transition flex items-center justify-between ${currentPage === page ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}>
                        {label}
                        {badge > 0 && <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 leading-none">{badge}</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <NavBtn page="documentation" label="Documentation" currentPage={currentPage} onNavigate={onNavigate} onClose={closeAll} />

          <NavBtn page="profile" label="Mon profil" currentPage={currentPage} onNavigate={onNavigate} onClose={closeAll} />
        </nav>

        {/* ── Droite desktop ── */}
        <div className="hidden md:flex items-center gap-3 text-sm">
          <button onClick={onToggleHideValues} title={hideValues ? 'Afficher les valeurs' : 'Masquer les valeurs'}
            className={`p-1.5 rounded-md transition ${hideValues ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
            <EyeIcon hidden={hideValues} />
          </button>
          <button onClick={onToggleDarkMode} title={darkMode ? 'Passer en mode clair' : 'Passer en mode nuit'}
            className={`p-1.5 rounded-md transition ${darkMode ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
            <DarkModeIcon dark={darkMode} />
          </button>
          {user.familyGroupId && (
            <button onClick={onToggleFamilyMode}
              title={familyMode ? 'Mode Foyer actif — cliquer pour désactiver' : 'Activer le Mode Foyer'}
              className={`p-1.5 rounded-md transition ${familyMode ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
              <HomeIcon />
            </button>
          )}
          <span className="text-gray-700">{user.firstName} {user.lastName}</span>
          <span className="px-2 py-0.5 bg-violet-100 text-violet-800 rounded-full text-xs font-semibold">{user.role}</span>
          <button onClick={onLogout} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition">
            Déconnexion
          </button>
        </div>

        {/* ── Droite mobile ── */}
        <div className="flex md:hidden items-center gap-2">
          <button onClick={onToggleHideValues}
            className={`p-2 rounded-md transition ${hideValues ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:bg-gray-100'}`}>
            <EyeIcon hidden={hideValues} />
          </button>
          <button onClick={onToggleDarkMode}
            className={`p-2 rounded-md transition ${darkMode ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:bg-gray-100'}`}>
            <DarkModeIcon dark={darkMode} />
          </button>
          {user.familyGroupId && (
            <button onClick={onToggleFamilyMode}
              className={`p-2 rounded-md transition ${familyMode ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:bg-gray-100'}`}>
              <HomeIcon />
            </button>
          )}
        </div>
      </header>

      {/* ══════════════════════════════════════
          BOTTOM NAV (mobile uniquement)
      ══════════════════════════════════════ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex safe-area-inset-bottom">
        {BOTTOM_NAV.map(({ page, label, Icon }) => (
          <button
            key={page}
            onClick={() => { onNavigate(page); setMobileMenuOpen(false) }}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition ${
              currentPage === page ? 'text-indigo-600' : 'text-gray-400'
            }`}
          >
            <Icon />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
        <button
          onClick={() => setMobileMenuOpen(v => !v)}
          className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition relative ${
            mobileMenuOpen ? 'text-indigo-600' : 'text-gray-400'
          }`}
        >
          <IconMore />
          <span className="text-[10px] font-medium">Plus</span>
          {pendingRegistrations > 0 && (
            <span className="absolute top-1.5 right-4 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>
      </nav>

      {/* ══════════════════════════════════════
          PANNEAU "PLUS" (bottom sheet mobile)
      ══════════════════════════════════════ */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex flex-col justify-end">
          <div className="fixed inset-0 bg-black/40" onClick={closeMobile} />
          <div className="relative bg-white rounded-t-2xl z-50 max-h-[80vh] overflow-y-auto pb-24">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-2" />

            {/* Identité utilisateur */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 mb-1">
              <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center shrink-0">
                {user.firstName?.[0]}{user.lastName?.[0]}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{user.firstName} {user.lastName}</p>
                <span className="text-xs text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full">{user.role}</span>
              </div>
            </div>

            {/* Revenus */}
            <MobileSectionTitle>Revenus</MobileSectionTitle>
            <MobileMenuItem label="Salariat"              page="salary"        currentPage={currentPage} onNavigate={onNavigate} onClose={closeMobile} />
            <MobileMenuItem label="Revenus complémentaires" page="other-incomes" currentPage={currentPage} onNavigate={onNavigate} onClose={closeMobile} />

            {/* Passifs */}
            <MobileSectionTitle>Actifs & Passifs</MobileSectionTitle>
            <MobileMenuItem label="Passifs (grandes possessions)" page="possessions" currentPage={currentPage} onNavigate={onNavigate} onClose={closeMobile} />

            {/* Outils */}
            <MobileSectionTitle>Outils</MobileSectionTitle>
            {[
              ['tax-simulator',         'Simulateur des impôts'],
              ['bilan-financier',        'Bilan financier'],
              ['compound-interest',      'Intérêts composés'],
              ['loan-simulator',         "Simulateur d'emprunt"],
              ['patrimoine-declaration', 'Déclaration de patrimoine'],
              ['crisis-simulator',       'Simulation de crise'],
            ].map(([page, label]) => (
              <MobileMenuItem key={page} label={label} page={page} currentPage={currentPage} onNavigate={onNavigate} onClose={closeMobile} />
            ))}

            {/* Administration (ADMIN uniquement) */}
            {user.role === 'ADMIN' && (
              <>
                <MobileSectionTitle>Administration</MobileSectionTitle>
                <MobileMenuItem label="Utilisateurs"              page="users"               currentPage={currentPage} onNavigate={onNavigate} onClose={closeMobile} />
                <MobileMenuItem label="Gestion des relevés"       page="admin-snapshots"     currentPage={currentPage} onNavigate={onNavigate} onClose={closeMobile} />
                <MobileMenuItem label="Historique des connexions" page="login-history"       currentPage={currentPage} onNavigate={onNavigate} onClose={closeMobile} />
                <MobileMenuItem label="Regroupements familiaux"   page="admin-family-groups" currentPage={currentPage} onNavigate={onNavigate} onClose={closeMobile} />
                <MobileMenuItem label="Instruments financiers"    page="admin-instruments"   currentPage={currentPage} onNavigate={onNavigate} onClose={closeMobile} />
                <MobileMenuItem label="Demandes d'inscription"    page="admin-registrations" currentPage={currentPage} onNavigate={onNavigate} onClose={closeMobile} badge={pendingRegistrations} />
              </>
            )}

            {/* Documentation */}
            <MobileSectionTitle>Aide</MobileSectionTitle>
            <MobileMenuItem label="Documentation" page="documentation" currentPage={currentPage} onNavigate={onNavigate} onClose={closeMobile} />

            {/* Compte */}
            <MobileSectionTitle>Compte</MobileSectionTitle>
            <MobileMenuItem label="Mon profil" page="profile" currentPage={currentPage} onNavigate={onNavigate} onClose={closeMobile} />
            <div className="px-3 pb-2">
              <button
                onClick={() => { onLogout(); closeMobile() }}
                className="w-full px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition text-left"
              >
                Déconnexion
              </button>
              {appVersion && (
                <p className="text-center text-xs text-gray-400 mt-2 pb-1">v{appVersion}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
