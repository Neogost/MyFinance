import { useState } from 'react'
import LoginForm from './components/LoginForm'
import Navigation from './components/Navigation'
import UserList from './components/users/UserList'
import ChangePasswordForm from './components/users/ChangePasswordForm'
import { logout } from './api/auth'

export default function App() {
  const [user, setUser]           = useState(null)
  const [currentPage, setCurrentPage] = useState('dashboard')

  async function handleLogout() {
    await logout()
    setUser(null)
    setCurrentPage('dashboard')
  }

  function handleNavigate(page) {
    // Seul un admin peut accéder à la gestion des utilisateurs
    if (page === 'users' && user?.role !== 'ADMIN') return
    setCurrentPage(page)
  }

  if (!user) {
    return <LoginForm onSuccess={setUser} />
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation
        user={user}
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />

      <main className="p-8">
        {currentPage === 'dashboard' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Tableau de bord</h2>
            <p className="text-gray-600">
              Bienvenue, <strong>{user.firstName}</strong> ! Le tableau de bord arrive bientôt.
            </p>
          </div>
        )}

        {currentPage === 'users' && user.role === 'ADMIN' && (
          <UserList />
        )}

        {currentPage === 'profile' && (
          <ChangePasswordForm user={user} />
        )}
      </main>
    </div>
  )
}
