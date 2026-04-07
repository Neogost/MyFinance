import { useState } from 'react'
import LoginForm from './components/LoginForm'
import { logout } from './api/auth'
import './App.css'

export default function App() {
  const [user, setUser] = useState(null)

  async function handleLogout() {
    await logout()
    setUser(null)
  }

  if (!user) {
    return <LoginForm onSuccess={setUser} />
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>MyFinance</h1>
        <div className="user-info">
          <span>{user.firstName} {user.lastName}</span>
          <span className="role-badge">{user.role}</span>
          <button onClick={handleLogout}>Déconnexion</button>
        </div>
      </header>
      <main>
        <p>Bienvenue, <strong>{user.firstName}</strong> ! Le tableau de bord arrive bientôt.</p>
      </main>
    </div>
  )
}
