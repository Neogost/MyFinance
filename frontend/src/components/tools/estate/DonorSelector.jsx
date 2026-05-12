/**
 * Sélecteur de donateur réutilisable.
 * Trois modes : "Moi-même" (lookup DB), "Depuis la famille", "Saisie manuelle".
 * Quand le mode est "Moi-même", aucune donnée manuelle n'est transmise.
 * Quand le mode est différent, pastDonationsEur + donorName + donorAge sont fournis.
 */

const RELATION_LABELS = {
  CONJOINT: 'Conjoint / PACS', ENFANT: 'Enfant', PETIT_ENFANT: 'Petit-enfant',
  ARRIERE_PETIT_ENFANT: 'Arrière-petit-enfant', FRERE_SOEUR: 'Frère/Sœur',
  NEVEU_NIECE: 'Neveu/Nièce', AUTRE: 'Autre',
}
const RELATION_OPTIONS = Object.entries(RELATION_LABELS)

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition bg-white'

function ageFromBirthDate(bd) {
  if (!bd) return null
  const born = new Date(bd)
  const now  = new Date()
  let age = now.getFullYear() - born.getFullYear()
  if (now.getMonth() < born.getMonth() ||
      (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())) age--
  return age
}

export default function DonorSelector({
  label,            // ex. "Donateur 1", "Parent 1"
  allowMe = true,   // afficher l'option "Moi-même"
  members,          // liste des membres de la cellule familiale
  excludeMemberId,  // exclure le bénéficiaire
  value,            // { mode, memberId, name, age, handicap, relation, pastDonations }
  onChange,         // (newValue) => void
  recipientName,    // pour le label du lien de parenté
}) {
  const candidates = (members || [])
    .filter(m => !m.deathDate && String(m.id) !== String(excludeMemberId))

  const { mode, memberId, name, age, handicap, relation, pastDonations } = value

  function update(patch) { onChange({ ...value, ...patch }) }

  function selectMember(id) {
    const m = candidates.find(c => String(c.id) === String(id))
    update({
      memberId: id,
      name:     m ? m.firstName + (m.lastName ? ` ${m.lastName}` : '') : '',
      age:      m?.birthDate ? String(ageFromBirthDate(m.birthDate)) : '',
      handicap: m?.handicap ?? false,
    })
  }

  const modes = [
    ...(allowMe ? [{ key: 'me', label: 'Moi-même' }] : []),
    { key: 'family', label: '📋 Depuis la famille' },
    { key: 'manual', label: '✏ Saisie manuelle' },
  ]

  return (
    <div className="border border-gray-200 rounded-xl p-3 flex flex-col gap-3">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">👤 {label}</p>

      {/* Toggle de mode */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
        {modes.map(m => (
          <button key={m.key} type="button"
            onClick={() => update({ mode: m.key, memberId: '', name: '', age: '', handicap: false })}
            className={`flex-1 px-2 py-1.5 font-medium transition ${mode === m.key ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Moi-même — aucune saisie requise */}
      {mode === 'me' && (
        <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
          Vos donations passées seront lues depuis votre historique enregistré.
        </p>
      )}

      {/* Depuis la famille */}
      {mode === 'family' && (
        <>
          {candidates.length === 0 ? (
            <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 px-3 py-2 rounded-lg">
              Aucun autre membre dans la cellule familiale — passez en saisie manuelle.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-600">Choisir le donateur</label>
              <select value={memberId} onChange={e => selectMember(e.target.value)} className={inputCls}>
                <option value="">— Sélectionner —</option>
                {candidates.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.firstName}{m.lastName ? ` ${m.lastName}` : ''} — {RELATION_LABELS[m.relation]}
                    {m.birthDate ? ` (${ageFromBirthDate(m.birthDate)} ans)` : ''}
                    {m.handicap ? ' ♿' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {memberId && (
            <div className="bg-white border border-gray-100 rounded-lg px-3 py-2 text-xs text-gray-600 space-y-0.5">
              <p><strong>Nom :</strong> {name}</p>
              {age && <p><strong>Âge :</strong> {age} ans</p>}
            </div>
          )}
        </>
      )}

      {/* Saisie manuelle */}
      {mode === 'manual' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-600">Prénom</label>
              <input value={name} onChange={e => update({ name: e.target.value })}
                placeholder="ex. Jean" className={inputCls} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-600">Âge</label>
              <input type="number" min="18" max="120" value={age}
                onChange={e => update({ age: e.target.value })}
                placeholder="ex. 55" className={inputCls} />
              <p className="text-xs text-gray-400">Pour le démembrement</p>
            </div>
          </div>
          {/* Note : le handicap du donateur n'a aucun impact fiscal — seul celui du bénéficiaire compte (art. 779-II CGI) */}
        </>
      )}

      {/* Lien de parenté avec le bénéficiaire — toujours visible sauf mode "me" */}
      {mode !== 'me' && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600">
            Lien avec {recipientName ?? 'le bénéficiaire'}
          </label>
          <select value={relation} onChange={e => update({ relation: e.target.value })} className={inputCls}>
            {RELATION_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      )}

      {/* Donations passées — toujours visible sauf mode "me" */}
      {mode !== 'me' && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600">
            Donations passées au bénéficiaire (15 dernières années)
          </label>
          <input type="number" min="0" step="1" value={pastDonations}
            onChange={e => update({ pastDonations: e.target.value })}
            placeholder="0 si aucune" className={inputCls} />
        </div>
      )}
    </div>
  )
}

/** Valeur initiale vide pour un DonorSelector */
export function emptyDonor(mode = 'me') {
  return { mode, memberId: '', name: '', age: '', handicap: false, relation: 'ENFANT', pastDonations: '' }
}

/** Convertit la valeur du selector en paramètres API */
export function donorToApiParams(d) {
  if (d.mode === 'me') {
    return {
      pastDonationsEurOverride: null,
      donorName: null,
      donorRelationToRecipient: null,
      donorHandicap: null,
      donorAge: null,
    }
  }
  return {
    pastDonationsEurOverride: d.pastDonations ? parseFloat(d.pastDonations) : 0,
    donorName: d.name || 'Donateur',
    donorRelationToRecipient: d.relation,
    donorHandicap: d.handicap,
    donorAge: d.age ? parseInt(d.age) : null,
  }
}
