import { Fragment, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { CATEGORY_META, FISCAL_ENVELOPE_LABELS, OWNERSHIP_TYPES } from './constants'
import { fmt, Amount } from './utils'

const CATEGORY_ORDER = ['LIQUIDITE', 'LIVRET', 'BOURSE', 'CRYPTO', 'IMMO_PAPIER', 'IMMO_PHYSIQUE']

function AllocationTooltipContent({ instrument, rect }) {
  const geo    = instrument?.countryAllocation ?? []
  const sector = instrument?.sectorAllocation  ?? []

  if (!geo.length && !sector.length) return null

  const hasBoth = geo.length > 0 && sector.length > 0
  const style = {
    position: 'fixed',
    top:  rect.bottom + 8,
    left: rect.left,
    zIndex: 9999,
    width: hasBoth ? 440 : 220,
  }

  const Section = ({ title, entries, barColor }) => (
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-gray-300 uppercase tracking-wide mb-1.5" style={{ fontSize: '10px' }}>{title}</p>
      <div className="flex flex-col gap-1">
        {entries.map(a => {
          const name = a.country ?? a.sector
          const pct  = Number(a.percentage)
          return (
            <div key={name} className="flex items-center gap-1.5">
              <div className="flex-1 bg-gray-700 rounded-full h-1.5 overflow-hidden">
                <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct}%` }} />
              </div>
              <span className="text-gray-200 w-20 truncate text-right">{name}</span>
              <span className="text-gray-400 w-8 text-right shrink-0">{pct.toFixed(0)} %</span>
            </div>
          )
        })}
      </div>
    </div>
  )

  return createPortal(
    <div style={style} className="bg-gray-900 text-white rounded-lg shadow-2xl p-3 text-xs pointer-events-none flex gap-3">
      {geo.length > 0    && <Section title="Géographie" entries={geo}    barColor="bg-indigo-400" />}
      {hasBoth           && <div className="w-px bg-gray-700 self-stretch" />}
      {sector.length > 0 && <Section title="Secteurs"   entries={sector} barColor="bg-teal-400"  />}
    </div>,
    document.body
  )
}

function AllocationLabel({ instrument, label }) {
  const [rect, setRect] = useState(null)
  const spanRef = useRef(null)

  const show = useCallback(() => {
    if (window.innerWidth < 768) return
    if (spanRef.current) setRect(spanRef.current.getBoundingClientRect())
  }, [])
  const hide = useCallback(() => setRect(null), [])

  return (
    <>
      <span
        ref={spanRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        className="text-sm font-medium text-gray-900 truncate max-w-[10ch] md:max-w-none cursor-help underline decoration-dotted underline-offset-2 decoration-gray-400"
      >
        {label}
      </span>
      {rect && <AllocationTooltipContent instrument={instrument} rect={rect} />}
    </>
  )
}
const OWNERSHIP_LABEL = Object.fromEntries(OWNERSHIP_TYPES.map(({ value, label }) => [value, label]))
const STALE_MS = 30 * 24 * 60 * 60 * 1000

const isStale = (dateStr) => dateStr && new Date(dateStr) < new Date(Date.now() - STALE_MS)

function ActionButtons({ position, onEdit, onDelete, onClose, onUpdateBalance, onUpdateEstimatedValue, onViewOrders }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmClose,  setConfirmClose]  = useState(false)

  const isClosed       = position.status === 'CLOSED'
  const isLiquidite    = position.category === 'LIQUIDITE'
  const isImmoPhysique = position.category === 'IMMO_PHYSIQUE'

  if (confirmClose) return (
    <div className="flex flex-col md:flex-row items-end md:items-center md:justify-end gap-1">
      <span className="text-xs text-orange-700">Fermer ?</span>
      <button onClick={() => { setConfirmClose(false); onClose(position) }}
        className="px-2 py-0.5 bg-orange-500 text-white rounded text-xs hover:bg-orange-600">Oui</button>
      <button onClick={() => setConfirmClose(false)}
        className="px-2 py-0.5 border border-gray-300 rounded text-xs text-gray-600 hover:border-gray-400">Non</button>
    </div>
  )

  if (confirmDelete) return (
    <div className="flex flex-col md:flex-row items-end md:items-center md:justify-end gap-1">
      <span className="text-xs text-red-700">Supprimer ?</span>
      <button onClick={() => { setConfirmDelete(false); onDelete(position) }}
        className="px-2 py-0.5 bg-red-600 text-white rounded text-xs hover:bg-red-700">Oui</button>
      <button onClick={() => setConfirmDelete(false)}
        className="px-2 py-0.5 border border-gray-300 rounded text-xs text-gray-600 hover:border-gray-400">Non</button>
    </div>
  )

  return (
    <div className="flex flex-col md:flex-row items-end md:items-center md:justify-end gap-1">
      {isLiquidite ? (
        <button onClick={() => onUpdateBalance(position)}
          className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100">
          Solde
        </button>
      ) : isImmoPhysique ? (
        <button onClick={() => onUpdateEstimatedValue(position)}
          className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100">
          Valeur
        </button>
      ) : (
        <button onClick={() => onViewOrders(position)}
          className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100">
          Mvts
        </button>
      )}
      <button onClick={() => onEdit(position)}
        className="px-2 py-0.5 border border-gray-300 rounded text-xs text-gray-600 hover:border-indigo-400 hover:text-indigo-600">
        Modifier
      </button>
      {!isClosed && (
        <button onClick={() => setConfirmClose(true)}
        disabled={isClosed}
        className="hidden md:inline-flex px-2 py-0.5 border border-gray-300 rounded text-xs text-gray-600 hover:border-orange-400 hover:text-orange-600 disabled:invisible">
        Fermer
      </button>
      )}
      <button onClick={() => setConfirmDelete(true)}
        className="hidden md:inline-flex px-2 py-0.5 border border-gray-300 rounded text-xs text-gray-600 hover:border-red-400 hover:text-red-600">
        ×
      </button>
    </div>
  )
}

function PositionRow({ position, onEdit, onDelete, onClose, onUpdateBalance, onUpdateEstimatedValue, onViewOrders, readOnly = false, showTaux = false }) {
  const fiscal        = FISCAL_ENVELOPE_LABELS[position.fiscalEnvelope]
  const c             = position.computed ?? {}
  const gain          = parseFloat(c.capitalGainEur ?? 0)
  const invested      = parseFloat(c.investedAmountEur ?? 0)
  const gainPct       = invested !== 0 && c.capitalGainEur != null ? (gain / Math.abs(invested)) * 100 : null
  const showGain      = c.capitalGainEur != null && parseFloat(c.capitalGainEur) !== 0
  const isClosed      = position.status === 'CLOSED'
  const isBourseOrCrypto = position.category === 'BOURSE' || position.category === 'CRYPTO'
  const isImmo        = position.category === 'IMMO_PHYSIQUE' || position.category === 'IMMO_PAPIER'

  const units = parseFloat(c.units ?? 0)
  const pru   = isBourseOrCrypto && units > 0 && invested !== 0 ? invested / units : null

  const stale = isBourseOrCrypto && !position.instrument?.stablePrice && isStale(position.instrument?.lastPriceUpdatedAt)

  return (
    <tr className={`border-b border-gray-100 hover:bg-gray-50 transition ${isClosed ? 'opacity-50' : ''}`}>
      {/* Nom + ISIN + indicateur cours obsolète */}
      <td className="py-2 pl-6 pr-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {position.category === 'BOURSE' && (position.instrument?.countryAllocation?.length > 0 || position.instrument?.sectorAllocation?.length > 0)
                ? <AllocationLabel instrument={position.instrument} label={position.label} />
                : <span className="text-sm font-medium text-gray-900 truncate max-w-[10ch] md:max-w-none">{position.label}</span>
              }
              {stale && (
                <span
                  title={`Cours non mis à jour depuis plus de 30 jours (${new Date(position.instrument.lastPriceUpdatedAt).toLocaleDateString('fr-FR')})`}
                  className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-600 dark:text-orange-300 whitespace-nowrap"
                >
                  Cours obsolète
                </span>
              )}
            </div>
            {position.instrument && (
              <span className="text-xs text-gray-400">{position.instrument.isin ?? position.instrument.ticker}</span>
            )}
          </div>
          {isClosed && (
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 shrink-0">Fermé</span>
          )}
        </div>
      </td>

      {/* Badges : enveloppe + sous-type + propriété (immo) */}
      <td className="hidden md:table-cell py-2 px-2">
        <div className="flex items-center gap-1 flex-wrap">
          {position.assetSubType && (
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {position.assetSubType}
            </span>
          )}
          {fiscal && (
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${fiscal.color}`}>
              {fiscal.label}
            </span>
          )}
          {isImmo && position.ownershipType && position.ownershipType !== 'PLEINE_PROPRIETE' && (
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:text-purple-300">
              {OWNERSHIP_LABEL[position.ownershipType] ?? position.ownershipType}
            </span>
          )}
          {isImmo && position.ownershipType === 'PLEINE_PROPRIETE' && (
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
              Pleine prop.
            </span>
          )}
        </div>
      </td>

      {/* Valeur actuelle */}
      <td className="py-2 px-2 text-right">
        <span className="text-sm font-bold text-gray-900 amount"><Amount value={c.currentValueEur} /></span>
      </td>

      {/* Investi + PRU */}
      <td className="hidden md:table-cell py-2 px-2 text-right">
        <span className="text-sm text-gray-500 amount"><Amount value={c.investedAmountEur} /></span>
        {pru !== null && (
          <p className="text-xs text-gray-400 amount">PRU {fmt(pru)}/u</p>
        )}
      </td>

      {/* Plus-value € + % */}
      <td className="py-2 px-2 text-right">
        {showGain && (
          <div className="flex flex-col items-end">
            <span className={`text-sm font-semibold amount ${gain >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              <Amount value={c.capitalGainEur} prefix={gain >= 0 ? '+' : ''} />
            </span>
            {gainPct !== null && (
              <span className={`text-xs ${gain >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                {gainPct >= 0 ? '+' : ''}{gainPct.toFixed(1)} %
              </span>
            )}
          </div>
        )}
      </td>

      {/* Taux annuel (LIVRET uniquement) */}
      {showTaux && (
        <td className="hidden md:table-cell py-2 px-2 text-right">
          {position.annualRate != null && (
            <span className="text-xs font-medium text-gray-500">{position.annualRate} %/an</span>
          )}
        </td>
      )}

      {/* Actions */}
      <td className="py-2 pl-2 pr-3">
        {!readOnly && <ActionButtons
          position={position}
          onEdit={onEdit}
          onDelete={onDelete}
          onClose={onClose}
          onUpdateBalance={onUpdateBalance}
          onUpdateEstimatedValue={onUpdateEstimatedValue}
          onViewOrders={onViewOrders}
        />}
      </td>
    </tr>
  )
}

export default function PatrimoineGroupedView({ positions, onEdit, onDelete, onClose, onUpdateBalance, onUpdateEstimatedValue, onViewOrders, readOnly = false }) {
  const [collapsed, setCollapsed] = useState(new Set())

  const toggle = (partner) => setCollapsed(prev => {
    const next = new Set(prev)
    next.has(partner) ? next.delete(partner) : next.add(partner)
    return next
  })

  const grandTotal = positions.reduce((s, p) => s + parseFloat(p.computed?.currentValueEur ?? 0), 0)

  const grouped = {}
  positions.forEach(p => {
    const partner = p.partner || 'Sans partenaire'
    if (!grouped[partner]) grouped[partner] = {}
    if (!grouped[partner][p.category]) grouped[partner][p.category] = []
    grouped[partner][p.category].push(p)
  })

  const sumField   = (ps, field) => ps.reduce((s, p) => s + parseFloat(p.computed?.[field] ?? 0), 0)
  const partnerTotal = (byCategory) => Object.values(byCategory).flat().reduce((s, p) => s + parseFloat(p.computed?.currentValueEur ?? 0), 0)

  const partners = Object.entries(grouped).sort(([, a], [, b]) => partnerTotal(b) - partnerTotal(a))

  if (positions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
        <p className="text-lg mb-2">Aucune position</p>
        <p className="text-sm">Cliquez sur « + Ajouter une position » pour commencer.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {partners.map(([partner, byCategory]) => {
        const allPs       = Object.values(byCategory).flat()
        const total       = sumField(allPs, 'currentValueEur')
        const totalInv    = sumField(allPs, 'investedAmountEur')
        const totalGain   = sumField(allPs, 'capitalGainEur')
        const totalGainPct = totalInv !== 0 ? (totalGain / Math.abs(totalInv)) * 100 : null
        const pct         = grandTotal > 0 ? (total / grandTotal) * 100 : 0
        const isCollapsed = collapsed.has(partner)
        const cats        = CATEGORY_ORDER.filter(cat => byCategory[cat])
        const hasTaux     = cats.includes('LIVRET')

        return (
          <div key={partner} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

            {/* ── En-tête partenaire ── */}
            <button
              onClick={() => toggle(partner)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100 hover:bg-gray-100 transition text-left"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor"
                className={`text-gray-400 shrink-0 transition-transform duration-150 ${isCollapsed ? '' : 'rotate-90'}`}
                viewBox="0 0 16 16">
                <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
              </svg>
              <span className="font-semibold text-gray-900 text-sm flex-1 text-left">{partner}</span>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-gray-400 w-9 text-right whitespace-nowrap">{pct.toFixed(1)} %</span>
              </div>
              <span className="text-sm font-bold text-gray-700 amount w-28 text-right"><Amount value={total} /></span>
            </button>

            {/* ── Contenu dépliable ── */}
            {!isCollapsed && (
              <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs text-gray-400 font-normal py-1.5 pl-6 pr-2">Position</th>
                    <th className="hidden md:table-cell text-left text-xs text-gray-400 font-normal py-1.5 px-2">Enveloppe / Type</th>
                    <th className="text-right text-xs text-gray-400 font-normal py-1.5 px-2">Valeur actuelle</th>
                    <th className="hidden md:table-cell text-right text-xs text-gray-400 font-normal py-1.5 px-2">Investi</th>
                    <th className="text-right text-xs text-gray-400 font-normal py-1.5 px-2">Plus-value</th>
                    {hasTaux && <th className="hidden md:table-cell text-right text-xs text-gray-400 font-normal py-1.5 px-2">Taux</th>}
                    <th className="py-1.5 px-3" />
                  </tr>
                </thead>

                <tbody>
                  {cats.map(cat => {
                    const meta    = CATEGORY_META[cat] ?? {}
                    const ps      = byCategory[cat]
                    const catVal  = sumField(ps, 'currentValueEur')
                    const catPct  = grandTotal > 0 ? (catVal / grandTotal) * 100 : 0

                    return (
                      <Fragment key={cat}>
                        {/* Sous-en-tête catégorie */}
                        <tr className="bg-gray-50/70 border-y border-gray-100">
                          <td colSpan={hasTaux ? 7 : 6} className="py-1.5 pl-6 pr-4">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                <span>{meta.icon}</span>
                                <span>{meta.label}</span>
                                <span className="font-normal text-gray-400 normal-case tracking-normal">
                                  — {ps.length} position{ps.length > 1 ? 's' : ''}
                                </span>
                              </span>
                              <span className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">{catPct.toFixed(1)} % du patrimoine</span>
                                <span className="text-xs font-semibold text-gray-600 amount"><Amount value={catVal} /></span>
                              </span>
                            </div>
                          </td>
                        </tr>

                        {ps.map(position => (
                          <PositionRow
                            key={position.id}
                            position={position}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onClose={onClose}
                            onUpdateBalance={onUpdateBalance}
                            onUpdateEstimatedValue={onUpdateEstimatedValue}
                            onViewOrders={onViewOrders}
                            readOnly={readOnly}
                            showTaux={hasTaux && position.category === 'LIVRET'}
                          />
                        ))}
                      </Fragment>
                    )
                  })}

                  {/* ── Ligne de sous-total partenaire ── */}
                  <tr className="border-t-2 border-gray-200 bg-gray-50/50">
                    <td colSpan={2} className="py-2 pl-6 pr-2">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total {partner}</span>
                    </td>
                    <td className="py-2 px-2 text-right">
                      <span className="text-sm font-bold text-gray-900 amount"><Amount value={total} /></span>
                    </td>
                    <td className="hidden md:table-cell py-2 px-2 text-right">
                      <span className="text-sm font-semibold text-gray-500 amount"><Amount value={totalInv} /></span>
                    </td>
                    <td className="py-2 px-2 text-right">
                      {totalGain !== 0 && (
                        <div className="flex flex-col items-end">
                          <span className={`text-sm font-bold amount ${totalGain >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                            <Amount value={totalGain} prefix={totalGain >= 0 ? '+' : ''} />
                          </span>
                          {totalGainPct !== null && (
                            <span className={`text-xs ${totalGain >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                              {totalGainPct >= 0 ? '+' : ''}{totalGainPct.toFixed(1)} %
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td colSpan={hasTaux ? 2 : 1} />
                  </tr>
                </tbody>
              </table>
              </div>
            )}
          </div>
        )
      })}

    </div>
  )
}

function LegendItem({ term, children }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-600 mb-0.5">{term}</p>
      <p className="text-xs text-gray-400 leading-relaxed">{children}</p>
    </div>
  )
}

function Formula({ children }) {
  return (
    <span className="block mt-1 font-mono text-xs text-indigo-500 bg-indigo-50 rounded px-1.5 py-0.5 w-fit">
      {children}
    </span>
  )
}

export function PatrimoineLegend() {
  return (
    <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50 px-5 py-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Légende & calculs</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2.5">
        <LegendItem term="PRU — Prix de Revient Unitaire">
          Montant total investi divisé par le nombre d'unités détenues.
          Permet de comparer directement au cours actuel pour évaluer la position.
          <Formula>PRU = Investi (€) ÷ Nombre d'unités</Formula>
        </LegendItem>
        <LegendItem term="Plus-value %">
          Rendement réalisé rapporté au capital engagé, tous ordres confondus (achats et ventes).
          <Formula>Plus-value % = Plus-value (€) ÷ |Investi (€)| × 100</Formula>
        </LegendItem>
        <LegendItem term="% du patrimoine">
          Part que représente la catégorie dans la valeur totale des positions affichées.
          Change si un filtre catégorie est actif.
          <Formula>% = Valeur catégorie ÷ Valeur totale affichée × 100</Formula>
        </LegendItem>
        <LegendItem term="Barre de poids (en-tête partenaire)">
          Représentation visuelle du poids du partenaire dans l'ensemble du patrimoine affiché.
          Triés par valeur décroissante.
        </LegendItem>
        <LegendItem term={<><span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-600 dark:text-orange-300">Cours obsolète</span></>}>
          Le dernier cours connu de l'instrument date de plus de 30 jours.
          La valeur actuelle affichée peut ne plus refléter le marché — pensez à mettre à jour les cours.
        </LegendItem>
        <LegendItem term="Valeur actuelle vs Investi">
          <strong className="font-semibold text-gray-600">Valeur actuelle</strong> : estimation au cours du jour (ou valeur estimée manuelle pour l'immo).{' '}
          <strong className="font-semibold text-gray-600">Investi</strong> : somme nette apportée, déduction faite des ventes partielles.
        </LegendItem>
        <LegendItem term="Barre de stratégie (cartes de répartition)">
          Avancement vers l'objectif patrimonial défini par catégorie (bouton « Stratégie & Objectifs »).
          Basée sur vos propres positions, même en mode Foyer.
          <span className="flex flex-wrap gap-2 mt-1">
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-semibold">En cours</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:text-emerald-300 font-semibold">Atteint</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:text-red-300 font-semibold">Dépassé</span>
          </span>
        </LegendItem>
        <LegendItem term="Indicateur Matelas (cartes LIVRET & LIQUIDITE)">
          Progression vers l'objectif de matelas de sécurité configuré dans votre profil.
          Le pourcentage est calculé sur la somme combinée de vos positions LIVRET et LIQUIDITE actives.
          <Formula>Matelas % = (LIVRET + LIQUIDITE) ÷ Objectif × 100</Formula>
        </LegendItem>
        <LegendItem term="D{n}/10 — Positionnement INSEE">
          Décile de patrimoine selon l'Enquête Patrimoine INSEE 2021-2022, pour votre tranche d'âge.
          D1 = 10 % les moins dotés, D10 = 10 % les plus dotés.
          En mode Foyer, la comparaison porte sur la moyenne par membre.
        </LegendItem>
      </div>
    </div>
  )
}
