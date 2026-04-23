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
import DashboardPage from './components/dashboard/DashboardPage'
import PatrimoinePage from './components/patrimoine/PatrimoinePage'
import AdminSnapshotPage from './components/patrimoine/AdminSnapshotPage'
import LoginHistoryPage from './components/admin/LoginHistoryPage'
import AdminFamilyGroupPage from './components/admin/AdminFamilyGroupPage'
import AdminInstrumentPage from './components/admin/AdminInstrumentPage'
import RecurringExpensePage from './components/expenses/RecurringExpensePage'
import PossessionPage from './components/possessions/PossessionPage'
import DettePage from './components/debts/DettePage'
import { logout, getMe } from './api/auth'
import { setUnauthorizedHandler, setServerErrorHandler } from './api/client'

export default function App() {
  const [user,        setUser]        = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [hideValues,  setHideValues]  = useState(() => localStorage.getItem('hideValues') === 'true')
  const [familyMode,  setFamilyMode]  = useState(false)
  const [appError,    setAppError]    = useState(null) // code HTTP 5xx ou null

  useEffect(() => {
    // Intercepteurs globaux Axios : 401 → login, 5xx → page d'erreur
    setUnauthorizedHandler(() => { setUser(null) })
    setServerErrorHandler(status => setAppError(status))

    getMe()
      .then(setUser)
      .catch(() => {}) // session expirée ou absente → affiche le login
      .finally(() => setAuthLoading(false))
  }, [])

  function toggleHideValues() {
    setHideValues(v => {
      localStorage.setItem('hideValues', String(!v))
      return !v
    })
  }

  async function handleLogout() {
    await logout()
    setUser(null)
    setCurrentPage('dashboard')
    setFamilyMode(false)
  }

  function handleGroupChange(group) {
    setUser(u => ({ ...u, familyGroupId: group ? group.id : null }))
    if (!group) setFamilyMode(false)
  }

  function handleNavigate(page) {
    if ((page === 'users' || page === 'admin-snapshots' || page === 'login-history' || page === 'admin-family-groups' || page === 'admin-instruments') && user?.role !== 'ADMIN') return
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
    return <LoginForm onSuccess={setUser} />
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
        familyMode={familyMode}
        onToggleFamilyMode={() => setFamilyMode(v => !v)}
      />

      <main className="p-8">
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

        {currentPage === 'users' && user.role === 'ADMIN' && <UserList />}

        {currentPage === 'admin-snapshots' && user.role === 'ADMIN' && <AdminSnapshotPage />}

        {currentPage === 'login-history' && user.role === 'ADMIN' && <LoginHistoryPage />}

        {currentPage === 'admin-family-groups' && user.role === 'ADMIN' && <AdminFamilyGroupPage />}

        {currentPage === 'admin-instruments' && user.role === 'ADMIN' && <AdminInstrumentPage />}

        {currentPage === 'profile' && <ChangePasswordForm user={user} onGroupChange={handleGroupChange} onUserUpdate={setUser} />}
      </main>
    </div>
    </ErrorBoundary>
  )
}
