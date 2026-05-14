import { useState } from 'react'
import { createBugReport } from '../../api/bugReports'
import DateTimeInput from '../ui/DateTimeInput'

const IMPACTS = [
  { value: 'LOW',      label: 'Faible',    desc: 'Gêne mineure, contournement possible' },
  { value: 'MEDIUM',   label: 'Modéré',    desc: 'Fonctionnalité dégradée' },
  { value: 'HIGH',     label: 'Important', desc: 'Fonctionnalité bloquée' },
  { value: 'CRITICAL', label: 'Critique',  desc: 'Application inutilisable' },
]

function localNow() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function BugReportForm({ onClose, onSubmitted }) {
  const [form, setForm] = useState({
    title: '', description: '', expectedResult: '',
    reproductionSteps: '', approximateDateTime: localNow(),
    userImpact: 'MEDIUM',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)
  const [done,   setDone]   = useState(false)

  function set(key, value) { setForm(f => ({ ...f, [key]: value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await createBugReport({
        ...form,
        // Conversion heure locale → UTC pour correspondre aux timestamps des logs (Logback/Docker = UTC)
        approximateDateTime: form.approximateDateTime
          ? new Date(form.approximateDateTime).toISOString().slice(0, 19)
          : null,
        sessionId: sessionStorage.getItem('analytics-session-id'),
      })
      setDone(true)
      onSubmitted?.()
    } catch (err) {
      setError(err.response?.data?.message ?? 'Erreur lors de l\'envoi.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white w-full sm:max-w-2xl sm:mx-4 rounded-t-2xl sm:rounded-xl shadow-xl max-h-[90vh] overflow-y-auto">
        {/* En-tête */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl sm:rounded-t-xl z-10">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
            <h2 className="text-base font-semibold text-gray-900">Signaler un bug</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {done ? (
          <div className="p-8 text-center space-y-3">
            <div className="text-4xl">✅</div>
            <p className="font-semibold text-gray-900">Bug signalé, merci !</p>
            <p className="text-sm text-gray-500">Votre signalement a bien été transmis à l'administrateur.</p>
            <button onClick={onClose} className="mt-2 px-5 py-2 bg-indigo-600 text-[#fff] rounded-lg text-sm font-semibold hover:bg-indigo-700 transition">
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Titre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
              <input type="text" required maxLength={200} value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="Résumé court du problème…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description du problème *</label>
              <textarea required maxLength={3000} rows={3} value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Décrivez ce qui se passe…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
              />
              <div className="text-right text-xs text-gray-400 mt-0.5">{form.description.length}/3000</div>
            </div>

            {/* Résultat souhaité */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Résultat souhaité <span className="text-gray-400 font-normal">(optionnel)</span>
              </label>
              <textarea maxLength={2000} rows={2} value={form.expectedResult}
                onChange={e => set('expectedResult', e.target.value)}
                placeholder="Ce à quoi vous vous attendiez…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
              />
            </div>

            {/* Reproduction */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Étapes pour reproduire <span className="text-gray-400 font-normal">(optionnel)</span>
              </label>
              <textarea maxLength={3000} rows={3} value={form.reproductionSteps}
                onChange={e => set('reproductionSteps', e.target.value)}
                placeholder={"1. Aller sur la page Patrimoine\n2. Cliquer sur…\n3. Observer que…"}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y font-mono"
              />
            </div>

            {/* Date approximative + Impact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date et heure approximatives</label>
                <DateTimeInput
                  value={form.approximateDateTime}
                  onChange={v => set('approximateDateTime', v)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Impact *</label>
                <div className="space-y-1.5">
                  {IMPACTS.map(({ value, label, desc }) => (
                    <label key={value} className={`flex items-start gap-2 cursor-pointer border rounded-lg px-3 py-2 text-sm transition ${
                      form.userImpact === value
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:text-indigo-300'
                        : 'border-gray-200 text-gray-600'
                    }`}>
                      <input type="radio" name="userImpact" value={value}
                        checked={form.userImpact === value}
                        onChange={() => set('userImpact', value)}
                        className="sr-only"
                      />
                      <span className="font-semibold shrink-0">{label}</span>
                      <span className="text-xs text-gray-400 leading-tight">{desc}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 border border-gray-300 rounded-lg py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                Annuler
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 bg-indigo-600 text-[#fff] rounded-lg py-2 text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50">
                {saving ? 'Envoi…' : 'Envoyer le signalement'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
