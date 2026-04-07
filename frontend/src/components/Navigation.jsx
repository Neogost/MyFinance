export default function Navigation({ user, currentPage, onNavigate, onLogout }) {
  return (
    <header className="dashboard-header">
      <h1>MyFinance</h1>

      <nav className="nav-links">
        <button
          className={currentPage === 'dashboard' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => onNavigate('dashboard')}
        >
          Tableau de bord
        </button>

        {user.role === 'ADMIN' && (
          <button
            className={currentPage === 'users' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => onNavigate('users')}
          >
            Utilisateurs
          </button>
        )}

        <button
          className={currentPage === 'profile' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => onNavigate('profile')}
        >
          Mon profil
        </button>
      </nav>

      <div className="user-info">
        <span>{user.firstName} {user.lastName}</span>
        <span className="role-badge">{user.role}</span>
        <button onClick={onLogout}>Déconnexion</button>
      </div>
    </header>
  )
}
