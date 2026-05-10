import { useState, useEffect } from 'react'
import ErrorBoundary from './components/ErrorBoundary'
import AnalyticsPage from './components/admin/AnalyticsPage'
import PerformancePage from './components/performance/PerformancePage'
import ErrorPage from './components/ErrorPage'
import LoginForm from './components/LoginForm'
import Navigation from './components/Navigation'
import UserList from './components/users/UserList'
import ChangePasswordForm from './components/users/ChangePasswordForm'
import SalaryContractPage from './components/income/SalaryContractPage'
import OtherIncomePage from './components/income/OtherIncomePage'
import TaxSimulatorPage from './components/tools/TaxSimulatorPage'
import BilanFinancierPage from './components/tools/BilanFinancierPage'
import CompoundInterestSimulatorPage from './components/tools/CompoundInterestSimulatorPage'
import LoanSimulatorPage from './components/tools/LoanSimulatorPage'
import PatrimoineDeclarationPage from './components/tools/PatrimoineDeclarationPage'
import CrisisSimulatorPage from './components/tools/CrisisSimulatorPage'
import LombardSimulatorPage from './components/tools/LombardSimulatorPage'
import FiscalEnvelopeComparatorPage from './components/tools/FiscalEnvelopeComparatorPage'
import CryptoTaxPage from './components/tools/CryptoTaxPage'
import RetirementSimulatorPage from './components/tools/RetirementSimulatorPage'
import DashboardPage from './components/dashboard/DashboardPage'
import PatrimoinePage from './components/patrimoine/PatrimoinePage'
import AdminSnapshotPage from './components/patrimoine/AdminSnapshotPage'
import LoginHistoryPage from './components/admin/LoginHistoryPage'
import AdminFamilyGroupPage from './components/admin/AdminFamilyGroupPage'
import AdminInstrumentPage from './components/admin/AdminInstrumentPage'
import RegistrationRequestPage from './components/admin/RegistrationRequestPage'
import { getRegistrations } from './api/registrations'
import RecurringExpensePage from './components/expenses/RecurringExpensePage'
import SubscriptionCalendarPage from './components/expenses/SubscriptionCalendarPage'
import PossessionPage from './components/possessions/PossessionPage'
import DettePage from './components/debts/DettePage'
import { logout, getMe, getAppVersion } from './api/auth'
import { setUnauthorizedHandler, setServerErrorHandler } from './api/client'
import { logFrontendError } from './hooks/useAnalytics'
import LandingPage from './components/LandingPage'
import DocumentationPage from './components/documentation/DocumentationPage'
import ContactPage from './components/ContactPage'
import ReleaseNotesModal from './components/ReleaseNotesModal'
import logo from './assets/logo.png'
import { getMyAchievements } from './api/achievements'

export default function App() {
  const [user,        setUser]        = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authView,    setAuthView]    = useState('landing') // 'landing' | 'login' | 'register'
  const [currentPage, setCurrentPage] = useState(() => window.location.hash.slice(1) || 'dashboard')
  const [hideValues,  setHideValues]  = useState(() => localStorage.getItem('hideValues') === 'true')
  const [darkMode,    setDarkMode]    = useState(() => {
    const stored = localStorage.getItem('darkMode')
    if (stored !== null) return stored === 'true'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  const [familyMode,  setFamilyMode]  = useState(false)
  const [appError,    setAppError]    = useState(null) // code HTTP 5xx ou null
  const [pendingRegistrations,  setPendingRegistrations]  = useState(0)
  const [appVersion,            setAppVersion]            = useState(null)
  const [showReleaseNotes,      setShowReleaseNotes]      = useState(false)
  const [unseenAchievements,    setUnseenAchievements]    = useState(0)

  useEffect(() => {
    // Intercepteurs globaux Axios : 401 → login, 5xx → page d'erreur
    setUnauthorizedHandler(() => {
      // Ne pas rediriger vers le login si on est sur une page publique
      const page = window.location.hash.slice(1)
      if (['compound-interest', 'loan-simulator', 'retirement', 'fiscal-envelopes'].includes(page)) return
      setUser(null); setAuthView('landing'); clearAnalyticsSession()
    })
    setServerErrorHandler(status => setAppError(status))

    // Capture globale des erreurs JS non gérées
    const onError = (event) => {
      logFrontendError(event.error?.name ?? 'Error', event.message, event.error?.stack, window.location.hash)
    }
    const onUnhandledRejection = (event) => {
      const reason = event.reason
      logFrontendError('UnhandledPromiseRejection', String(reason?.message ?? reason), reason?.stack, window.location.hash)
    }
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onUnhandledRejection)

    getMe()
      .then(u => {
        setUser(u)
        // Restauration de session : génère un sessionId si absent (rechargement de page)
        if (!sessionStorage.getItem('analytics-session-id')) initAnalyticsSession(u)
        getAppVersion().then(setAppVersion).catch(() => {})
        getMyAchievements().then(d => setUnseenAchievements(d.unseenCount ?? 0)).catch(() => {})
        if (u?.role === 'ADMIN') {
          getRegistrations('PENDING').then(list => setPendingRegistrations(list.length)).catch(() => {})
        }
      })
      .catch(() => {}) // session expirée ou absente → affiche le login
      .finally(() => setAuthLoading(false))

    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('darkMode', String(darkMode))
  }, [darkMode])

  function toggleHideValues() {
    setHideValues(v => {
      localStorage.setItem('hideValues', String(!v))
      return !v
    })
  }

  function toggleDarkMode() {
    setDarkMode(v => !v)
  }

  function initAnalyticsSession(u) {
    const id = crypto.randomUUID()
    sessionStorage.setItem('analytics-session-id', id)
    sessionStorage.setItem('analytics-opt-out', String(u?.analyticsOptOut ?? false))
  }

  function clearAnalyticsSession() {
    sessionStorage.removeItem('analytics-session-id')
    sessionStorage.removeItem('analytics-opt-out')
  }

  async function handleLogout() {
    await logout()
    clearAnalyticsSession()
    window.location.hash = ''
    setUser(null)
    setCurrentPage('dashboard')
    setFamilyMode(false)
    setAuthView('landing')
  }

  function handleGroupChange(group) {
    setUser(u => ({ ...u, familyGroupId: group ? group.id : null }))
    if (!group) setFamilyMode(false)
  }

  function handleNavigate(page) {
    const adminPages = ['users', 'admin-snapshots', 'login-history', 'admin-family-groups', 'admin-instruments', 'admin-registrations', 'admin-analytics']
    if (adminPages.includes(page) && user?.role !== 'ADMIN') return
    if (page === 'profile') setUnseenAchievements(0) // efface le compteur dès qu'on ouvre le profil
    window.location.hash = page
    setCurrentPage(page)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Chargement…</div>
      </div>
    )
  }

  if (appError) {
    return (
      <ErrorPage
        status={appError}
        fullPage
        onRetry={() => { setAppError(null); window.location.reload() }}
        onHome={() => { setAppError(null); setCurrentPage('dashboard') }}
      />
    )
  }

  if (!user) {
    if (currentPage === 'documentation' && authView === 'landing') {
      return (
        <ErrorBoundary>
          <div className="min-h-screen bg-gray-100">
            <header className="sticky top-0 z-50 flex items-center justify-between px-4 md:px-6 py-3 bg-white shadow-sm">
              <img src={logo} alt="MyFinance" className="h-8 md:h-12 w-auto cursor-pointer" onClick={() => { window.location.hash = ''; setCurrentPage('dashboard') }} />
              <button
                onClick={() => setAuthView('login')}
                className="px-4 py-1.5 rounded-md text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition"
              >
                Connexion
              </button>
            </header>
            <main className="p-4 md:p-8 pb-8 overflow-x-hidden">
              <DocumentationPage user={null} />
            </main>
          </div>
        </ErrorBoundary>
      )
    }

    if (currentPage === 'contact' && authView === 'landing') {
      return <ContactPage onLogin={() => setAuthView('login')} onHome={() => { window.location.hash = ''; setCurrentPage('dashboard') }} />
    }

    // Pages accessibles sans connexion
    const PUBLIC_SIMULATORS = ['compound-interest', 'loan-simulator', 'retirement', 'fiscal-envelopes']
    const PUBLIC_NAV = [
      { page: 'loan-simulator',    label: 'Emprunt' },
      { page: 'compound-interest', label: 'Intérêts composés' },
      { page: 'retirement',        label: 'Retraite' },
      { page: 'fiscal-envelopes',  label: 'Enveloppes fiscales' },
    ]
    if (PUBLIC_SIMULATORS.includes(currentPage) && authView === 'landing') {
      return (
        <ErrorBoundary>
          <div className="min-h-screen bg-gray-100">
            <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100">
              {/* Barre principale : logo | tabs centrés | connexion */}
              <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center gap-4">
                <img src={logo} alt="MyFinance" className="h-7 w-auto cursor-pointer shrink-0" onClick={() => { window.location.hash = ''; setCurrentPage('dashboard') }} />

                {/* Tabs — centrés sur desktop, scrollables sur mobile */}
                <nav className="flex-1 flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
                  {PUBLIC_NAV.map(({ page, label }) => (
                    <button
                      key={page}
                      onClick={() => { window.location.hash = page; setCurrentPage(page) }}
                      className={`relative whitespace-nowrap px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                        currentPage === page
                          ? 'text-indigo-700 bg-indigo-50'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      {label}
                      {currentPage === page && (
                        <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-indigo-600 rounded-full" />
                      )}
                    </button>
                  ))}
                </nav>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-400 hidden md:block">Mode anonyme</span>
                  <button
                    onClick={() => setAuthView('login')}
                    className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm"
                  >
                    Connexion
                  </button>
                </div>
              </div>
            </header>
            <main className="p-4 md:p-8 pb-8 overflow-x-hidden">
              {currentPage === 'compound-interest' && <CompoundInterestSimulatorPage />}
              {currentPage === 'loan-simulator'    && <LoanSimulatorPage user={null} />}
              {currentPage === 'retirement'        && <RetirementSimulatorPage user={null} />}
              {currentPage === 'fiscal-envelopes'  && <FiscalEnvelopeComparatorPage user={null} />}
            </main>
          </div>
        </ErrorBoundary>
      )
    }

    if (authView === 'landing') {
      return (
        <>
          <LandingPage
            onLogin={() => setAuthView('login')}
            onRegister={() => setAuthView('register')}
            onSimulators={() => { window.location.hash = 'loan-simulator'; setCurrentPage('loan-simulator') }}
            onDocumentation={(docId) => { if (docId) sessionStorage.setItem('doc-page', docId); window.location.hash = 'documentation'; setCurrentPage('documentation') }}
            onContact={() => { window.location.hash = 'contact'; setCurrentPage('contact') }}
            onShowReleaseNotes={() => setShowReleaseNotes(true)}
          />
          {showReleaseNotes && <ReleaseNotesModal onClose={() => setShowReleaseNotes(false)} />}
        </>
      )
    }
    return (
      <LoginForm
        onSuccess={u => { initAnalyticsSession(u); setUser(u) }}
        initialShowRegister={authView === 'register'}
        onBackToHome={() => setAuthView('landing')}
      />
    )
  }

  return (
    <ErrorBoundary>
    <div className={`min-h-screen bg-gray-100${hideValues ? ' hide-values' : ''}`}>
      <Navigation
        user={user}
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        hideValues={hideValues}
        onToggleHideValues={toggleHideValues}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        familyMode={familyMode}
        onToggleFamilyMode={() => setFamilyMode(v => !v)}
        pendingRegistrations={pendingRegistrations}
        unseenAchievements={unseenAchievements}
        appVersion={appVersion}
        onShowReleaseNotes={() => setShowReleaseNotes(true)}
      />

      <main className="p-4 md:p-8 pb-24 md:pb-8 overflow-x-hidden">
        {currentPage === 'dashboard' && <DashboardPage user={user} familyMode={familyMode} onNavigate={handleNavigate} />}

        {currentPage === 'patrimoine' && <PatrimoinePage currentUser={user} familyMode={familyMode} onNavigate={handleNavigate} />}

        {currentPage === 'salary' && <SalaryContractPage />}

        {currentPage === 'other-incomes' && <OtherIncomePage />}

        {currentPage === 'expenses'               && <RecurringExpensePage />}
        {currentPage === 'subscription-calendar' && <SubscriptionCalendarPage onNavigate={handleNavigate} />}

        {currentPage === 'possessions' && <PossessionPage />}

        {currentPage === 'dettes'      && <DettePage />}

        {currentPage === 'tax-simulator' && <TaxSimulatorPage />}

        {currentPage === 'crypto-tax' && <CryptoTaxPage />}

        {currentPage === 'bilan-financier' && <BilanFinancierPage user={user} />}

        {currentPage === 'compound-interest' && <CompoundInterestSimulatorPage />}

        {currentPage === 'loan-simulator' && <LoanSimulatorPage user={user} />}

        {currentPage === 'patrimoine-declaration' && <PatrimoineDeclarationPage user={user} onNavigate={handleNavigate} />}

        {currentPage === 'crisis-simulator' && <CrisisSimulatorPage user={user} />}
        {currentPage === 'lombard-simulator'  && <LombardSimulatorPage />}
        {currentPage === 'fiscal-envelopes'  && <FiscalEnvelopeComparatorPage user={user} />}
        {currentPage === 'retirement'         && <RetirementSimulatorPage user={user} />}

        {currentPage === 'users' && user.role === 'ADMIN' && <UserList />}

        {currentPage === 'admin-snapshots' && user.role === 'ADMIN' && <AdminSnapshotPage />}

        {currentPage === 'login-history' && user.role === 'ADMIN' && <LoginHistoryPage />}

        {currentPage === 'admin-family-groups' && user.role === 'ADMIN' && <AdminFamilyGroupPage />}

        {currentPage === 'admin-instruments' && user.role === 'ADMIN' && <AdminInstrumentPage />}

        {currentPage === 'admin-registrations' && user.role === 'ADMIN' && (
          <RegistrationRequestPage onPendingCountChange={setPendingRegistrations} />
        )}

        {currentPage === 'admin-analytics' && user.role === 'ADMIN' && <AnalyticsPage />}
        {currentPage === 'performance'     && <PerformancePage />}

        {currentPage === 'documentation' && <DocumentationPage user={user} />}

        {currentPage === 'profile' && <ChangePasswordForm user={user} onGroupChange={handleGroupChange} onUserUpdate={setUser} onAccountDeleted={handleLogout} />}
      </main>

      <footer className="hidden md:block text-center text-xs text-gray-400 py-3 border-t border-gray-200 bg-gray-100">
        MyFinance{appVersion ? ` v${appVersion}` : ''}
        <span className="text-gray-300 mx-2">·</span>
        <button
          onClick={() => setShowReleaseNotes(true)}
          className="text-gray-500 hover:text-indigo-600 transition underline decoration-dotted underline-offset-2"
        >
          Notes de version
        </button>
      </footer>

      {showReleaseNotes && <ReleaseNotesModal onClose={() => setShowReleaseNotes(false)} />}
    </div>
    </ErrorBoundary>
  )
}
