import { useState } from 'react'
import LoginForm from './components/LoginForm'
import Navigation from './components/Navigation'
import UserList from './components/users/UserList'
import ChangePasswordForm from './components/users/ChangePasswordForm'
import { logout } from './api/auth'
import './App.css'

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
    <div className="dashboard">
      <Navigation
        user={user}
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />

      <main className="main-content">
        {currentPage === 'dashboard' && (
          <div>
            <h2>Tableau de bord</h2>
            <p>Bienvenue, <strong>{user.firstName}</strong> ! Le tableau de bord arrive bientôt.</p>
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
