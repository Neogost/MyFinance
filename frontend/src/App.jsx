import { useState, useEffect } from 'react'
import ErrorBoundary from './components/ErrorBoundary'
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
import PerformancePage from './components/tools/PerformancePage'
import DashboardPage from './components/dashboard/DashboardPage'
import PatrimoinePage from './components/patrimoine/PatrimoinePage'
import AdminSnapshotPage from './components/patrimoine/AdminSnapshotPage'
import LoginHistoryPage from './components/admin/LoginHistoryPage'
import AdminFamilyGroupPage from './components/admin/AdminFamilyGroupPage'
import AdminInstrumentPage from './components/admin/AdminInstrumentPage'
import RegistrationRequestPage from './components/admin/RegistrationRequestPage'
import { getRegistrations } from './api/registrations'
import RecurringExpensePage from './components/expenses/RecurringExpensePage'
import PossessionPage from './components/possessions/PossessionPage'
import DettePage from './components/debts/DettePage'
import { logout, getMe, getAppVersion } from './api/auth'
import { setUnauthorizedHandler, setServerErrorHandler } from './api/client'
import LandingPage from './components/LandingPage'
import DocumentationPage from './components/documentation/DocumentationPage'
import ContactPage from './components/ContactPage'
import ReleaseNotesModal from './components/ReleaseNotesModal'
import logo from './assets/logo.png'

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
  const [pendingRegistrations, setPendingRegistrations] = useState(0)
  const [appVersion,           setAppVersion]           = useState(null)
  const [showReleaseNotes,     setShowReleaseNotes]     = useState(false)

  useEffect(() => {
    // Intercepteurs globaux Axios : 401 → login, 5xx → page d'erreur
    setUnauthorizedHandler(() => { setUser(null); setAuthView('landing') })
    setServerErrorHandler(status => setAppError(status))

    getMe()
      .then(u => {
        setUser(u)
        getAppVersion().then(setAppVersion).catch(() => {})
        if (u?.role === 'ADMIN') {
          getRegistrations('PENDING').then(list => setPendingRegistrations(list.length)).catch(() => {})
        }
      })
      .catch(() => {}) // session expirée ou absente → affiche le login
      .finally(() => setAuthLoading(false))
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

  async function handleLogout() {
    await logout()
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
    const adminPages = ['users', 'admin-snapshots', 'login-history', 'admin-family-groups', 'admin-instruments', 'admin-registrations']
    if (adminPages.includes(page) && user?.role !== 'ADMIN') return
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

    if (authView === 'landing') {
      return (
        <LandingPage
          onLogin={() => setAuthView('login')}
          onRegister={() => setAuthView('register')}
          onDocumentation={(docId) => { if (docId) sessionStorage.setItem('doc-page', docId); window.location.hash = 'documentation'; setCurrentPage('documentation') }}
          onContact={() => { window.location.hash = 'contact'; setCurrentPage('contact') }}
        />
      )
    }
    return (
      <LoginForm
        onSuccess={setUser}
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
        appVersion={appVersion}
        onShowReleaseNotes={() => setShowReleaseNotes(true)}
      />

      <main className="p-4 md:p-8 pb-24 md:pb-8 overflow-x-hidden">
        {currentPage === 'dashboard' && <DashboardPage user={user} familyMode={familyMode} onNavigate={handleNavigate} />}

        {currentPage === 'patrimoine' && <PatrimoinePage currentUser={user} familyMode={familyMode} />}

        {currentPage === 'salary' && <SalaryContractPage />}

        {currentPage === 'other-incomes' && <OtherIncomePage />}

        {currentPage === 'expenses'    && <RecurringExpensePage />}

        {currentPage === 'possessions' && <PossessionPage />}

        {currentPage === 'dettes'      && <DettePage />}

        {currentPage === 'tax-simulator' && <TaxSimulatorPage />}

        {currentPage === 'bilan-financier' && <BilanFinancierPage user={user} />}

        {currentPage === 'compound-interest' && <CompoundInterestSimulatorPage />}

        {currentPage === 'loan-simulator' && <LoanSimulatorPage user={user} />}

        {currentPage === 'patrimoine-declaration' && <PatrimoineDeclarationPage user={user} onNavigate={handleNavigate} />}

        {currentPage === 'crisis-simulator' && <CrisisSimulatorPage user={user} />}
        {currentPage === 'lombard-simulator' && <LombardSimulatorPage />}
        {currentPage === 'performance'       && user.role === 'ADMIN' && <PerformancePage />}

        {currentPage === 'users' && user.role === 'ADMIN' && <UserList />}

        {currentPage === 'admin-snapshots' && user.role === 'ADMIN' && <AdminSnapshotPage />}

        {currentPage === 'login-history' && user.role === 'ADMIN' && <LoginHistoryPage />}

        {currentPage === 'admin-family-groups' && user.role === 'ADMIN' && <AdminFamilyGroupPage />}

        {currentPage === 'admin-instruments' && user.role === 'ADMIN' && <AdminInstrumentPage />}

        {currentPage === 'admin-registrations' && user.role === 'ADMIN' && (
          <RegistrationRequestPage onPendingCountChange={setPendingRegistrations} />
        )}

        {currentPage === 'documentation' && <DocumentationPage user={user} />}

        {currentPage === 'profile' && <ChangePasswordForm user={user} onGroupChange={handleGroupChange} onUserUpdate={setUser} />}
      </main>

      {appVersion && (
        <footer className="hidden md:block text-center text-xs text-gray-400 py-3 border-t border-gray-200 bg-gray-100">
          MyFinance v{appVersion}
          <span className="text-gray-300 mx-2">·</span>
          <button
            onClick={() => setShowReleaseNotes(true)}
            className="text-gray-500 hover:text-indigo-600 transition underline decoration-dotted underline-offset-2"
          >
            Notes de version
          </button>
        </footer>
      )}

      {showReleaseNotes && <ReleaseNotesModal onClose={() => setShowReleaseNotes(false)} />}
    </div>
    </ErrorBoundary>
  )
}
