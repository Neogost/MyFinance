export default function Navigation({ user, currentPage, onNavigate, onLogout }) {
  const navBtn = (page, label) => (
    <button
      onClick={() => onNavigate(page)}
      className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
        currentPage === page
          ? 'bg-indigo-600 text-white'
          : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
      }`}
    >
      {label}
    </button>
  )

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white shadow-sm">
      <h1 className="text-lg font-bold text-gray-900">MyFinance</h1>

      <nav className="flex gap-1">
        {navBtn('dashboard', 'Tableau de bord')}
        {user.role === 'ADMIN' && navBtn('users', 'Utilisateurs')}
        {navBtn('profile', 'Mon profil')}
      </nav>

      <div className="flex items-center gap-3 text-sm">
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
