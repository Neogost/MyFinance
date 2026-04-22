import { useState, useEffect, useRef } from 'react'
import { login } from '../api/auth'

export default function LoginForm({ onSuccess }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [lockoutSecondes, setLockoutSecondes] = useState(0)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (lockoutSecondes <= 0) {
      clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => {
      setLockoutSecondes(s => {
        if (s <= 1) {
          clearInterval(intervalRef.current)
          setError(null)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [lockoutSecondes > 0])

  const estVerrouille = lockoutSecondes > 0

  function formatDuree(secondes) {
    if (secondes >= 3600) return `${Math.floor(secondes / 3600)} h ${Math.floor((secondes % 3600) / 60)} min`
    if (secondes >= 60) return `${Math.floor(secondes / 60)} min ${secondes % 60} s`
    return `${secondes} s`
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSubmit(e)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (estVerrouille) return
    setError(null)
    setLoading(true)
    try {
      const user = await login(username, password)
      onSuccess(user)
    } catch (err) {
      if (err.response?.status === 429) {
        const secondes = err.response.data?.secondesRestantes ?? 300
        setLockoutSecondes(secondes)
        setError(err.response.data?.message ?? 'Trop de tentatives. Compte temporairement bloqué.')
      } else {
        setError('Identifiants incorrects')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white rounded-xl shadow-lg p-10 w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-1">MyFinance</h1>
        <p className="text-center text-gray-500 text-sm mb-8">Connectez-vous à votre espace</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="username" className="text-sm font-semibold text-gray-700">
              Identifiant
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Votre login"
              required
              autoFocus
              disabled={estVerrouille}
              className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-semibold text-gray-700">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="••••••••"
              required
              disabled={estVerrouille}
              className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {error && (
            <p className={`text-sm rounded-lg px-3 py-2 ${
              estVerrouille
                ? 'text-orange-700 bg-orange-50 border border-orange-200'
                : 'text-red-600 bg-red-50 border border-red-200'
            }`}>
              {error}
              {estVerrouille && (
                <span className="block mt-1 font-semibold">
                  Réessayez dans {formatDuree(lockoutSecondes)}
                </span>
              )}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || estVerrouille}
            className="mt-1 py-3 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Connexion…' : estVerrouille ? `Bloqué (${formatDuree(lockoutSecondes)})` : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}
