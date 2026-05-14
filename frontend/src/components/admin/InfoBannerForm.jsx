import { useState, useEffect } from 'react'
import { createBanner, updateBanner } from '../../api/infoBanners'
import InfoBannerItem from '../platform/InfoBannerItem'

const TYPES = [
  { value: 'ALERT',       label: 'Alerte',       color: 'text-red-700 bg-red-50 border-red-300 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700' },
  { value: 'WARNING',     label: 'Avertissement', color: 'text-orange-700 bg-orange-50 border-orange-300 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-700' },
  { value: 'MAINTENANCE', label: 'Maintenance',   color: 'text-gray-700 bg-gray-50 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600' },
  { value: 'INFO',        label: 'Information',   color: 'text-blue-700 bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700' },
  { value: 'SUCCESS',     label: 'Succès',        color: 'text-green-700 bg-green-50 border-green-300 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700' },
]

const AUDIENCES = [
  { value: 'ALL',        label: 'Tous les utilisateurs' },
  { value: 'USERS_ONLY', label: 'Utilisateurs uniquement' },
  { value: 'ADMIN_ONLY', label: 'Administrateurs uniquement' },
]

function toDatetimeLocal(iso) {
  if (!iso) return ''
  return iso.slice(0, 16) // "YYYY-MM-DDTHH:mm"
}

// Heure locale courante au format attendu par datetime-local (sans décalage UTC)
function localNow() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromDatetimeLocal(s) {
  if (!s) return null
  return s + ':00' // ajoute les secondes
}

export default function InfoBannerForm({ banner, onClose, onSaved }) {
  const isEdit = !!banner?.id

  const [form, setForm] = useState({
    title:    banner?.title    ?? '',
    message:  banner?.message  ?? '',
    type:     banner?.type     ?? 'INFO',
    audience: banner?.audience ?? 'ALL',
    startAt:  banner?.startAt  ? toDatetimeLocal(banner.startAt) : localNow(),
    endAt:    banner?.endAt    ? toDatetimeLocal(banner.endAt)   : '',
    noEnd:    !banner?.endAt,
  })
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState(null)

  function set(key, value) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const payload = {
      title:    form.title.trim() || null,
      message:  form.message.trim(),
      type:     form.type,
      audience: form.audience,
      startAt:  fromDatetimeLocal(form.startAt),
      endAt:    form.noEnd ? null : fromDatetimeLocal(form.endAt),
    }

    try {
      const saved = isEdit
        ? await updateBanner(banner.id, payload)
        : await createBanner(payload)
      onSaved(saved)
    } catch (err) {
      const msg = err.response?.data?.message ?? err.response?.data ?? err.message
      setError(typeof msg === 'string' ? msg : 'Erreur lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  const previewBanner = {
    id:      0,
    title:   form.title.trim() || null,
    message: form.message || '_Votre message apparaîtra ici…_',
    type:    form.type,
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white w-full sm:max-w-2xl sm:mx-4 rounded-t-2xl sm:rounded-xl shadow-xl max-h-[90vh] overflow-y-auto">
        {/* En-tête */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl sm:rounded-t-xl z-10">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? 'Modifier la bannière' : 'Nouvelle bannière'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type *</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => set('type', t.value)}
                  className={`border rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    form.type === t.value ? t.color + ' ring-2 ring-offset-1 ring-current' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Audience */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Audience *</label>
            <div className="flex flex-wrap gap-2">
              {AUDIENCES.map(a => (
                <label key={a.value} className={`flex items-center gap-2 cursor-pointer border rounded-lg px-3 py-2 text-sm transition ${
                  form.audience === a.value ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:text-indigo-300' : 'border-gray-200 text-gray-600'
                }`}>
                  <input type="radio" name="audience" value={a.value} checked={form.audience === a.value} onChange={() => set('audience', a.value)} className="sr-only" />
                  {a.label}
                </label>
              ))}
            </div>
          </div>

          {/* Titre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titre <span className="text-gray-400 font-normal">(optionnel, max 120 caractères)</span>
            </label>
            <input
              type="text"
              maxLength={120}
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Titre court…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message * <span className="text-gray-400 font-normal">(Markdown, max 2000 caractères)</span>
            </label>
            <textarea
              required
              maxLength={2000}
              rows={4}
              value={form.message}
              onChange={e => set('message', e.target.value)}
              placeholder="Le service sera indisponible **ce soir de 22h à 23h**."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y font-mono"
            />
            <div className="text-right text-xs text-gray-400 mt-0.5">{form.message.length}/2000</div>
          </div>

          {/* Aperçu */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Aperçu</p>
            <div className="rounded-lg overflow-hidden border border-gray-200">
              <InfoBannerItem banner={previewBanner} preview />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Début d'affichage *</label>
              <input
                type="datetime-local"
                required
                value={form.startAt}
                onChange={e => set('startAt', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fin d'affichage
              </label>
              <label className="flex items-center gap-2 mb-2 cursor-pointer text-sm text-gray-600">
                <input type="checkbox" checked={form.noEnd} onChange={e => set('noEnd', e.target.checked)} className="accent-indigo-600" />
                Sans expiration
              </label>
              {!form.noEnd && (
                <input
                  type="datetime-local"
                  value={form.endAt}
                  onChange={e => set('endAt', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              )}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 rounded-lg py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {saving ? 'Sauvegarde…' : isEdit ? 'Enregistrer' : 'Créer la bannière'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
