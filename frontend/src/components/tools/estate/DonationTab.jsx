import { useState } from 'react'
import {
  simulateMultiRecipientDonation,
  simulateJointMultiRecipientDonation,
  recordPastDonation,
  deletePastDonation,
} from '../../../api/estate'
import MultiRecipientResultCard from './MultiRecipientResultCard'
import JointMultiRecipientResultCard from './JointMultiRecipientResultCard'
import DonorSelector, { emptyDonor, donorToApiParams } from './DonorSelector'

const RELATION_LABELS = {
  CONJOINT: 'Conjoint / PACS', ENFANT: 'Enfant', PETIT_ENFANT: 'Petit-enfant',
  ARRIERE_PETIT_ENFANT: 'Arrière-petit-enfant', FRERE_SOEUR: 'Frère/Sœur',
  NEVEU_NIECE: 'Neveu/Nièce', AUTRE: 'Autre',
}

const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition bg-white'
const labelCls = 'text-sm font-semibold text-gray-700'

function fmt(n) {
  return Number(n ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })
}

export default function DonationTab({ members, pastDonations, onPastDonationsChange, onOpenFamily }) {
  const [jointMode,   setJointMode]   = useState(false)

  // Liste unifiée de bénéficiaires (toujours utilisée, même avec 1 entrée)
  const [recipients, setRecipients] = useState([{ id: '', share: 100 }])

  const [assetValue,  setAssetValue]  = useState('')
  const [giftLabel,   setGiftLabel]   = useState('')
  const [dismembered, setDismembered] = useState(false)
  const [bienType,    setBienType]    = useState('MOBILIER')

  // Donateur 1
  const [donor1,  setDonor1]  = useState(emptyDonor('me'))
  const [share1,  setShare1]  = useState('100')
  const [custom1, setCustom1] = useState('')

  // Donateur 2 (couple)
  const [donor2,  setDonor2]  = useState(emptyDonor('family'))
  const [share2,  setShare2]  = useState('50')
  const [custom2, setCustom2] = useState('')

  const [result,     setResult]     = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)
  const [showRecord, setShowRecord] = useState(false)
  const [recording,  setRecording]  = useState(false)

  const activeMembers = members.filter(m => !m.deathDate)
  const asset    = parseFloat(assetValue) || 0
  const preview1 = asset ? asset * (parseFloat(share1) || 0) / 100 : null
  const preview2 = asset ? asset * (parseFloat(share2) || 0) / 100 : null

  const sharesSum = recipients.reduce((s, r) => s + (parseFloat(r.share) || 0), 0)
  const sharesValid = recipients.length === 1 ? true : Math.abs(sharesSum - 100) < 1

  function resetResult() { setResult(null); setShowRecord(false) }

  // ── Gestion liste bénéficiaires ─────────────────────────────
  function addRecipientRow() {
    const newCount = recipients.length + 1
    const equalShare = Math.floor(100 / newCount)
    const list = [
      ...recipients.map(r => ({ ...r, share: equalShare })),
      { id: '', share: 100 - equalShare * (newCount - 1) },
    ]
    setRecipients(list); resetResult()
  }
  function removeRecipientRow(idx) {
    if (recipients.length <= 1) return
    const filtered = recipients.filter((_, i) => i !== idx)
    if (filtered.length === 1) {
      filtered[0] = { ...filtered[0], share: 100 }
    } else {
      const equalShare = Math.floor(100 / filtered.length)
      const last = 100 - equalShare * (filtered.length - 1)
      for (let i = 0; i < filtered.length; i++) {
        filtered[i] = { ...filtered[i], share: i === filtered.length - 1 ? last : equalShare }
      }
    }
    setRecipients(filtered); resetResult()
  }
  function updateRecipient(idx, patch) {
    setRecipients(recipients.map((r, i) => i === idx ? { ...r, ...patch } : r))
    resetResult()
  }

  // ── Simulation ──────────────────────────────────────────────
  async function handleSimulate(e) {
    e.preventDefault()
    setError(null); setLoading(true); resetResult()
    try {
      const d1Params = donorToApiParams(donor1)
      const allocList = recipients.filter(r => r.id).map(r => ({
        recipientId: parseInt(r.id),
        share: (parseFloat(r.share) || 0) / 100,
        relationOverride: d1Params.donorRelationToRecipient,
      }))

      if (jointMode) {
        const d2Params = donorToApiParams(donor2)
        const res = await simulateJointMultiRecipientDonation({
          giftLabel,
          assetValueEur: asset,
          dismembered,
          bienType,
          // Donateur 1
          donor1Share:            (parseFloat(share1) || 100) / 100,
          donor1CustomAmountEur:  custom1 ? parseFloat(custom1) : null,
          donor1PastDonationsEur: d1Params.pastDonationsEurOverride,
          donor1Name:             d1Params.donorName,
          donor1Relation:         d1Params.donorRelationToRecipient,
          donor1Handicap:         d1Params.donorHandicap,
          donor1Age:              d1Params.donorAge,
          // Donateur 2
          donor2Name:             d2Params.donorName || donor2.name || 'Co-donateur',
          donor2Relation:         d2Params.donorRelationToRecipient || donor2.relation,
          donor2Handicap:         donor2.handicap,
          donor2Share:            (parseFloat(share2) || 50) / 100,
          donor2CustomAmountEur:  custom2 ? parseFloat(custom2) : null,
          donor2PastDonationsEur: d2Params.pastDonationsEurOverride,
          donor2Age:              d2Params.donorAge,
          recipients: allocList,
        })
        setResult({ type: 'joint-multi', data: res })
      } else {
        const res = await simulateMultiRecipientDonation({
          giftLabel,
          assetValueEur:            asset,
          dismembered,
          bienType,
          ownershipShare:           (parseFloat(share1) || 100) / 100,
          customAmountEur:          custom1 ? parseFloat(custom1) : null,
          pastDonationsEurOverride: d1Params.pastDonationsEurOverride,
          donorName:                d1Params.donorName,
          donorHandicap:            d1Params.donorHandicap,
          donorAge:                 d1Params.donorAge,
          recipients: allocList,
        })
        setResult({ type: 'multi', data: res })
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Erreur lors de la simulation. Vérifiez les données.')
    } finally { setLoading(false) }
  }

  async function handleRecord() {
    if (!result || recipients.length !== 1) return
    setRecording(true)
    try {
      const amount = result.type === 'joint-multi'
        ? parseFloat(result.data.totalAmountGivenEur)
        : parseFloat(result.data.totalAmountGivenEur)
      const saved = await recordPastDonation({
        recipientId:  parseInt(recipients[0].id),
        donationDate: new Date().toISOString().split('T')[0],
        amountEur:    amount,
        label:        giftLabel,
      })
      onPastDonationsChange([saved, ...pastDonations])
      setShowRecord(false)
    } catch {
      setError('Erreur lors de l\'enregistrement.')
    } finally { setRecording(false) }
  }

  async function handleDeleteDonation(id) {
    if (!confirm('Supprimer cette donation de l\'historique ?')) return
    await deletePastDonation(id)
    onPastDonationsChange(pastDonations.filter(d => d.id !== id))
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ── Formulaire ── */}
      <div>
        {/* Cellule familiale */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700">Cellule familiale</p>
            <button onClick={onOpenFamily} className="text-xs text-indigo-600 hover:text-indigo-800 transition font-medium">✏ Gérer</button>
          </div>
          {activeMembers.length === 0 ? (
            <p className="text-xs text-gray-400">
              Aucun membre — <button onClick={onOpenFamily} className="text-indigo-600 underline">ajouter</button>
            </p>
          ) : (
            <div className="space-y-1">
              {activeMembers.map(m => (
                <p key={m.id} className="text-xs text-gray-600">
                  • <strong>{m.firstName}</strong>{m.lastName ? ` ${m.lastName}` : ''} — {RELATION_LABELS[m.relation]}
                  {m.birthDate && `, né(e) le ${m.birthDate}`}
                  {m.handicap && ' ♿'}
                </p>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleSimulate} className="bg-white rounded-xl shadow-sm p-4 flex flex-col gap-4">

          {/* Toggle solo / couple */}
          <div className="flex flex-col gap-2">
            <label className={labelCls}>Type de donation</label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
              {[
                { key: false, label: '👤 Individuelle (1 donateur)' },
                { key: true,  label: '💑 En couple (2 donateurs)' },
              ].map(({ key, label }) => (
                <button key={String(key)} type="button"
                  onClick={() => {
                    setJointMode(key); resetResult()
                    if (key) { setShare1('50'); setShare2('50'); setCustom1(''); setCustom2('') }
                    else      { setShare1('100'); setCustom1('') }
                  }}
                  className={`flex-1 px-3 py-2 font-medium transition ${jointMode === key ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Bénéficiaires — liste unifiée (1 par défaut, plusieurs au besoin) */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className={labelCls}>
                Bénéficiaire{recipients.length > 1 ? 's' : ''} * ({recipients.length})
              </label>
              {recipients.length > 1 && (
                <span className={`text-xs font-semibold ${sharesValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  Total : {sharesSum.toFixed(0)} %{!sharesValid && ' ⚠ doit faire 100 %'}
                </span>
              )}
            </div>
            {recipients.map((r, idx) => {
              const usedIds = recipients.filter((_, i) => i !== idx).map(o => o.id)
              const available = activeMembers.filter(m => !usedIds.includes(String(m.id)))
              const previewEur = asset && r.share
                ? asset * (parseFloat(share1) || 100) / 100 * (parseFloat(r.share) || 0) / 100
                : null
              return (
                <div key={idx} className={recipients.length > 1
                  ? "border border-gray-200 rounded-lg p-3 flex flex-col gap-2 bg-gray-50"
                  : "flex flex-col gap-2"}>
                  <div className="flex items-center gap-2">
                    <select value={r.id} onChange={e => updateRecipient(idx, { id: e.target.value })}
                      className={`${inputCls} flex-1`} required>
                      <option value="">— Choisir —</option>
                      {available.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.firstName}{m.lastName ? ` ${m.lastName}` : ''} — {RELATION_LABELS[m.relation]}
                        </option>
                      ))}
                    </select>
                    {recipients.length > 1 && (
                      <button type="button" onClick={() => removeRecipientRow(idx)}
                        className="px-2 py-1 text-gray-400 hover:text-red-500 transition text-lg" aria-label="Retirer">×</button>
                    )}
                  </div>
                  {recipients.length > 1 && (
                    <div className="flex items-center gap-2">
                      <input type="range" min="1" max="99" step="1" value={r.share}
                        onChange={e => updateRecipient(idx, { share: parseInt(e.target.value) })}
                        className="flex-1 accent-indigo-600" />
                      <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 min-w-[80px] text-right">
                        {r.share} %
                        {previewEur != null && (
                          <span className="block text-gray-500 font-normal">
                            ≈ {previewEur.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
            {recipients.length < 10 && (
              <button type="button" onClick={addRecipientRow}
                className="py-2 border-2 border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition">
                + Ajouter un bénéficiaire
              </button>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Libellé du bien *</label>
            <input value={giftLabel} onChange={e => setGiftLabel(e.target.value)}
              placeholder="ex. Appartement Lyon, Liquidités…" className={inputCls} required />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Valeur totale du bien (€) *</label>
            <input type="number" min="0" step="1" value={assetValue}
              onChange={e => { setAssetValue(e.target.value); resetResult(); setCustom1(''); setCustom2('') }}
              placeholder="ex. 300000" className={inputCls} required />
          </div>

          {/* Type de bien */}
          <div className="flex flex-col gap-2">
            <label className={labelCls}>Type de bien *</label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
              {[
                { key: 'MOBILIER',   label: '💰 Mobilier (cash, titres, meubles)' },
                { key: 'IMMOBILIER', label: '🏠 Immobilier' },
              ].map(({ key, label }) => (
                <button key={key} type="button"
                  onClick={() => { setBienType(key); resetResult() }}
                  className={`flex-1 px-3 py-2 font-medium transition ${bienType === key ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                  {label}
                </button>
              ))}
            </div>
            {bienType === 'IMMOBILIER' && (
              <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 px-3 py-2 rounded-lg">
                ⚠ L'immobilier ajoute la taxe de publicité foncière (0,60 %) et la CSI (0,10 %) sur la valeur transmise.
              </p>
            )}
          </div>

          {/* Donateur 1 */}
          <div className="flex flex-col gap-3">
            <DonorSelector
              label={jointMode ? 'Donateur 1 (parent 1)' : 'Donateur'}
              allowMe={true}
              members={activeMembers}
              excludeMemberId={recipients[0]?.id}
              value={donor1}
              onChange={v => { setDonor1(v); resetResult() }}
              recipientName={null}
            />
            <ShareSlider label="Quote-part de propriété" value={share1}
              onChange={v => {
                setShare1(v); resetResult(); setCustom1('')
                if (jointMode) { setShare2(String(100 - parseInt(v))); setCustom2('') }
              }} preview={preview1} />
            <CustomAmountInput value={custom1}
              onChange={v => { setCustom1(v); resetResult() }} max={preview1} />
          </div>

          {/* Donateur 2 (couple) */}
          {jointMode && (
            <div className="flex flex-col gap-3">
              <DonorSelector
                label="Donateur 2 (parent 2)"
                allowMe={false}
                members={activeMembers}
                excludeMemberId={recipients[0]?.id}
                value={donor2}
                onChange={v => { setDonor2(v); resetResult() }}
                recipientName={null}
              />
              <ShareSlider label="Quote-part de propriété" value={share2}
                onChange={v => {
                  setShare2(v); resetResult(); setCustom2('')
                  setShare1(String(100 - parseInt(v))); setCustom1('')
                }} preview={preview2} />
              <CustomAmountInput value={custom2}
                onChange={v => { setCustom2(v); resetResult() }} max={preview2} />
            </div>
          )}

          {/* Mode transmission */}
          <div className="flex flex-col gap-2">
            <label className={labelCls}>Mode de transmission</label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="mode" checked={!dismembered}
                onChange={() => { setDismembered(false); resetResult() }} className="accent-indigo-600" />
              <span className="text-sm text-gray-700">Pleine propriété</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="mode" checked={dismembered}
                onChange={() => { setDismembered(true); resetResult() }} className="accent-indigo-600" />
              <span className="text-sm text-gray-700">
                Démembrement (nue-propriété seulement)
                <span className="block text-xs text-gray-400">Valeur fiscale réduite selon l'âge de chaque donateur</span>
              </span>
            </label>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit"
            disabled={loading || activeMembers.length === 0 || !sharesValid || recipients.some(r => !r.id)}
            data-testid="simulate-button"
            className="py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition">
            {loading ? 'Calcul…' : 'Simuler'}
          </button>
        </form>
      </div>

      {/* ── Résultat ── */}
      <div className="flex flex-col gap-4">
        {result ? (
          <>
            {result.type === 'multi' && <MultiRecipientResultCard result={result.data} />}
            {result.type === 'joint-multi' && <JointMultiRecipientResultCard result={result.data} />}

            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Mémoriser cette donation</p>
              {recipients.length > 1 ? (
                <p className="text-xs text-gray-400">
                  La mémorisation à plusieurs bénéficiaires n'est pas supportée. Faites une simulation par bénéficiaire pour enregistrer chacun.
                </p>
              ) : (
                <>
                  <p className="text-xs text-gray-500 mb-3">
                    Enregistre dans votre historique pour les futures simulations.
                  </p>
                  {showRecord ? (
                    <div className="flex gap-2">
                      <button onClick={handleRecord} disabled={recording}
                        className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition">
                        {recording ? 'Enregistrement…' : 'Confirmer'}
                      </button>
                      <button onClick={() => setShowRecord(false)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 transition">
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setShowRecord(true)}
                      className="w-full py-2 border border-indigo-300 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-medium hover:bg-indigo-50 transition">
                      + Enregistrer dans l'historique
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-400">
            <p className="text-4xl mb-3">🏛️</p>
            <p className="text-sm">Remplissez le formulaire et cliquez sur <strong>Simuler</strong></p>
          </div>
        )}

        {/* Historique */}
        {pastDonations.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Donations enregistrées</p>
            <div className="space-y-2">
              {pastDonations.map(d => (
                <div key={d.id} className="flex items-center justify-between text-xs text-gray-600 border border-gray-100 rounded-lg px-3 py-2">
                  <div>
                    <span className="font-medium text-gray-800">{d.recipientFirstName}</span>
                    {d.label && <> — {d.label}</>}
                    <span className="block text-gray-400">{d.donationDate} · {fmt(d.amountEur)} €</span>
                  </div>
                  <button onClick={() => handleDeleteDonation(d.id)}
                    className="text-gray-300 hover:text-red-500 transition text-base leading-none ml-2">×</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sous-composants ───────────────────────────────────────────────────────────

function ShareSlider({ label, value, onChange, preview }) {
  return (
    <div className="flex flex-col gap-1.5 px-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-gray-600">{label}</label>
        <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
          {value} %
          {preview != null && (
            <span className="text-gray-500 font-normal ml-1">
              = {preview.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
            </span>
          )}
        </span>
      </div>
      <input type="range" min="1" max="100" step="1" value={value}
        onChange={e => onChange(e.target.value)} className="w-full accent-indigo-600" />
      <div className="flex justify-between text-xs text-gray-400">
        <span>1 %</span><span>100 %</span>
      </div>
    </div>
  )
}

function CustomAmountInput({ value, onChange, max }) {
  const over = value && max != null && parseFloat(value) > max
  return (
    <div className="flex flex-col gap-1 px-3">
      <label className="text-xs font-semibold text-gray-600">
        Montant à donner <span className="font-normal text-gray-400">(optionnel — vide = totalité de la part)</span>
      </label>
      <input type="number" min="0" step="1" value={value}
        onChange={e => onChange(e.target.value)}
        max={max ?? undefined}
        placeholder={max != null ? `Max : ${max.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €` : 'ex. 60000'}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition bg-white" />
      {over && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          ⚠ Supérieur à la part — sera ramené à {max.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
        </p>
      )}
    </div>
  )
}
