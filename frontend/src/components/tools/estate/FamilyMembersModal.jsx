import { useState, useEffect } from 'react'
import { createFamilyMember, updateFamilyMember, deleteFamilyMember } from '../../../api/estate'

const RELATIONS = [
  { value: 'CONJOINT',             label: 'Conjoint / Partenaire PACS',   abattement: '80 724 €' },
  { value: 'ENFANT',               label: 'Enfant',                       abattement: '100 000 €' },
  { value: 'PETIT_ENFANT',         label: 'Petit-enfant',                 abattement: '31 865 €' },
  { value: 'ARRIERE_PETIT_ENFANT', label: 'Arrière-petit-enfant',         abattement: '5 310 €' },
  { value: 'FRERE_SOEUR',          label: 'Frère / Sœur',                 abattement: '15 932 €' },
  { value: 'NEVEU_NIECE',          label: 'Neveu / Nièce',                abattement: '7 967 €' },
  { value: 'AUTRE',                label: 'Autre / Sans lien',            abattement: '1 594 €' },
]

const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition bg-white'
const labelCls = 'text-sm font-semibold text-gray-700'
const EMPTY    = { firstName: '', lastName: '', relation: 'ENFANT', unionType: 'MARIAGE', matrimonialRegime: 'COMMUNAUTE', birthDate: '', handicap: false, notes: '' }

function MemberForm({ item, onSave, onCancel }) {
  const isEdit = Boolean(item?.id)
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setForm(item?.id ? {
      firstName:         item.firstName         ?? '',
      lastName:          item.lastName          ?? '',
      relation:          item.relation          ?? 'ENFANT',
      unionType:         item.unionType         ?? 'MARIAGE',
      matrimonialRegime: item.matrimonialRegime ?? 'COMMUNAUTE',
      birthDate:         item.birthDate         ?? '',
      handicap:          item.handicap          ?? false,
      notes:             item.notes             ?? '',
    } : EMPTY)
  }, [item])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null); setLoading(true)
    try {
      const payload = {
        ...form,
        birthDate: form.birthDate || null,
      }
      const saved = isEdit
        ? await updateFamilyMember(item.id, payload)
        : await createFamilyMember(payload)
      onSave(saved, isEdit)
    } catch {
      setError('Erreur lors de l\'enregistrement.')
    } finally { setLoading(false) }
  }

  function ch(e) {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Prénom *</label>
          <input name="firstName" value={form.firstName} onChange={ch} required
            className={inputCls} placeholder="ex. Léo" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Nom</label>
          <input name="lastName" value={form.lastName} onChange={ch}
            className={inputCls} placeholder="optionnel" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelCls}>Lien de parenté *</label>
        <select name="relation" value={form.relation} onChange={ch} className={inputCls}>
          {RELATIONS.map(r => (
            <option key={r.value} value={r.value}>
              {r.label} — abattement {r.abattement}
            </option>
          ))}
        </select>
      </div>

      {/* Type d'union — uniquement pour CONJOINT */}
      {form.relation === 'CONJOINT' && (
        <div className="flex flex-col gap-2 bg-indigo-50 border border-indigo-100 rounded-lg p-3">
          <label className={labelCls}>Type d'union *</label>
          <div className="flex flex-col gap-1.5">
            {[
              { v: 'MARIAGE',     label: '💍 Marié(e)',                    sub: 'Héritier légal (1/4 PP) + exonéré' },
              { v: 'PACS',        label: '📝 Pacsé(e)',                    sub: 'Exonéré mais pas héritier sans testament' },
              { v: 'CONCUBINAGE', label: '👫 Concubin(e) / Union libre',  sub: 'Pas d\'héritage par défaut, droits 60 %' },
            ].map(opt => (
              <label key={opt.v} className="flex items-start gap-2 cursor-pointer">
                <input type="radio" name="unionType" value={opt.v}
                  checked={form.unionType === opt.v} onChange={ch}
                  className="mt-0.5 accent-indigo-600" />
                <span className="text-sm text-gray-700">
                  {opt.label}
                  <span className="block text-xs text-gray-400">{opt.sub}</span>
                </span>
              </label>
            ))}
          </div>

          {/* Régime matrimonial — uniquement pour MARIAGE */}
          {form.unionType === 'MARIAGE' && (
            <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-indigo-200">
              <label className="text-xs font-semibold text-gray-700">Régime matrimonial</label>
              {[
                { v: 'COMMUNAUTE', label: 'Communauté légale (par défaut)',
                  sub: '50 % du patrimoine revient automatiquement au conjoint avant succession' },
                { v: 'SEPARATION', label: 'Séparation de biens',
                  sub: 'Aucun patrimoine commun — succession sur la totalité' },
              ].map(opt => (
                <label key={opt.v} className="flex items-start gap-2 cursor-pointer">
                  <input type="radio" name="matrimonialRegime" value={opt.v}
                    checked={form.matrimonialRegime === opt.v} onChange={ch}
                    className="mt-0.5 accent-indigo-600" />
                  <span className="text-xs text-gray-700">
                    {opt.label}
                    <span className="block text-gray-400">{opt.sub}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Date de naissance</label>
          <input type="date" name="birthDate" value={form.birthDate} onChange={ch} className={inputCls} />
          <p className="text-xs text-gray-400">Nécessaire pour le démembrement</p>
        </div>
        <div className="flex items-center gap-2 pt-6">
          <input type="checkbox" id="handicap" name="handicap"
            checked={form.handicap} onChange={ch}
            className="w-4 h-4 accent-indigo-600" />
          <label htmlFor="handicap" className="text-sm text-gray-700">
            Situation de handicap
            <span className="block text-xs text-gray-400">+159 325 € d'abattement</span>
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelCls}>Notes</label>
        <input name="notes" value={form.notes} onChange={ch}
          className={inputCls} placeholder="optionnel" />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex justify-end gap-3 mt-1">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400 transition">
          Annuler
        </button>
        <button type="submit" disabled={loading}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition">
          {loading ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Ajouter'}
        </button>
      </div>
    </form>
  )
}

export default function FamilyMembersModal({ members, onClose, onMembersChange }) {
  const [formTarget, setFormTarget] = useState(undefined) // undefined=liste, null=ajout, obj=édition
  const [error, setError] = useState(null)

  function relationLabel(rel) {
    return RELATIONS.find(r => r.value === rel)?.label ?? rel
  }

  async function handleDelete(member) {
    if (!confirm(`Supprimer ${member.firstName} ?`)) return
    try {
      await deleteFamilyMember(member.id)
      onMembersChange(members.filter(m => m.id !== member.id))
    } catch { setError('Erreur lors de la suppression.') }
  }

  function handleSave(saved, isEdit) {
    onMembersChange(isEdit
      ? members.map(m => m.id === saved.id ? saved : m)
      : [...members, saved]
    )
    setFormTarget(undefined)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl sm:rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">
            {formTarget === undefined ? 'Cellule familiale' : formTarget ? 'Modifier' : 'Ajouter un membre'}
          </h2>
          <button onClick={onClose} aria-label="Fermer"
            className="text-gray-400 hover:text-gray-600 transition p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4">
          {formTarget !== undefined ? (
            <MemberForm
              item={formTarget}
              onSave={handleSave}
              onCancel={() => setFormTarget(undefined)}
            />
          ) : (
            <>
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</p>}

              {members.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">Aucun membre encore enregistré.</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {members.map(m => (
                    <div key={m.id} className="flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {m.firstName}{m.lastName ? ` ${m.lastName}` : ''}
                          {m.handicap && <span className="ml-1.5 text-xs bg-blue-100 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">♿</span>}
                        </p>
                        <p className="text-xs text-gray-400">
                          {relationLabel(m.relation)}
                          {m.relation === 'CONJOINT' && m.unionType && (
                            <> · {m.unionType === 'MARIAGE' ? '💍 Marié(e)' : m.unionType === 'PACS' ? '📝 Pacsé(e)' : '👫 Concubin(e)'}
                              {m.unionType === 'MARIAGE' && m.matrimonialRegime && (
                                <> ({m.matrimonialRegime === 'COMMUNAUTE' ? 'communauté' : 'séparation'})</>
                              )}
                            </>
                          )}
                          {m.birthDate && ` · né(e) le ${m.birthDate}`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setFormTarget(m)}
                          className="px-2.5 py-1 text-xs border border-gray-300 rounded hover:border-indigo-400 hover:text-indigo-600 transition">
                          Modifier
                        </button>
                        <button onClick={() => handleDelete(m)}
                          className="px-2.5 py-1 text-xs border border-gray-300 rounded hover:border-red-400 hover:text-red-500 transition">
                          Suppr.
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={() => setFormTarget(null)}
                className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition">
                + Ajouter un membre
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
