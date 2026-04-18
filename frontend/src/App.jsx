import { useState } from 'react'
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
import DashboardPage from './components/dashboard/DashboardPage'
import PatrimoinePage from './components/patrimoine/PatrimoinePage'
import AdminSnapshotPage from './components/patrimoine/AdminSnapshotPage'
import RecurringExpensePage from './components/expenses/RecurringExpensePage'
import PossessionPage from './components/possessions/PossessionPage'
import { logout } from './api/auth'

export default function App() {
  const [user, setUser]               = useState(null)
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [hideValues,  setHideValues]  = useState(() => localStorage.getItem('hideValues') === 'true')

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
  }

  function handleNavigate(page) {
    if ((page === 'users' || page === 'admin-snapshots') && user?.role !== 'ADMIN') return
    setCurrentPage(page)
  }

  if (!user) {
    return <LoginForm onSuccess={setUser} />
  }

  return (
    <div className={`min-h-screen bg-gray-100${hideValues ? ' hide-values' : ''}`}>
      <Navigation
        user={user}
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        hideValues={hideValues}
        onToggleHideValues={toggleHideValues}
      />

      <main className="p-8">
        {currentPage === 'dashboard' && <DashboardPage user={user} />}

        {currentPage === 'patrimoine' && <PatrimoinePage currentUser={user} />}

        {currentPage === 'salary' && <SalaryContractPage />}

        {currentPage === 'other-incomes' && <OtherIncomePage />}

        {currentPage === 'expenses'    && <RecurringExpensePage />}

        {currentPage === 'possessions' && <PossessionPage />}

        {currentPage === 'tax-simulator' && <TaxSimulatorPage />}

        {currentPage === 'bilan-financier' && <BilanFinancierPage />}

        {currentPage === 'compound-interest' && <CompoundInterestSimulatorPage />}

        {currentPage === 'loan-simulator' && <LoanSimulatorPage />}

        {currentPage === 'users' && user.role === 'ADMIN' && <UserList />}

        {currentPage === 'admin-snapshots' && user.role === 'ADMIN' && <AdminSnapshotPage />}

        {currentPage === 'profile' && <ChangePasswordForm user={user} />}
      </main>
    </div>
  )
}
