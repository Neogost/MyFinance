import { useState } from 'react'
import { getPossessions, getPossessionsSummary, createPossession, updatePossession, deletePossession } from '../../api/possessions'
import PossessionForm from './PossessionForm'
import { fmt, formatDate } from '../../utils/formatting.js'
import KpiCard from '../common/KpiCard'
import DeleteConfirmModal from '../common/DeleteConfirmModal'
import { useCrud } from '../../hooks/useCrud'

const CATEGORY_META = {
  VEHICULE:       { label: 'Véhicule',                 color: 'bg-indigo-100 text-indigo-700 dark:text-indigo-300',   dot: 'bg-indigo-400' },
  INFORMATIQUE:   { label: 'Informatique & High-tech',  color: 'bg-cyan-100 text-cyan-700',                            dot: 'bg-cyan-400' },
  ELECTROMENAGER: { label: 'Électroménager & Maison',   color: 'bg-amber-100 text-amber-700 dark:text-amber-300',     dot: 'bg-amber-400' },
  MOBILIER:       { label: 'Mobilier & Décoration',     color: 'bg-lime-100 text-lime-700',                            dot: 'bg-lime-500' },
  COLLECTION:     { label: 'Collection',                color: 'bg-pink-100 text-pink-700',                            dot: 'bg-pink-400' },
  LOISIRS:        { label: 'Loisirs & Sport',           color: 'bg-teal-100 text-teal-700 dark:text-teal-300',        dot: 'bg-teal-400' },
  AUTRE:          { label: 'Autre',                     color: 'bg-gray-100 text-gray-600',       dot: 'bg-gray-400' },
}


export default function PossessionPage() {
  const [summary, setSummary] = useState(null)
  const [filter,  setFilter]  = useState('ALL')

  const {
    items: possessions, loading, error,
    formTarget, setFormTarget,
    deleteTarget, setDeleteTarget,
    handleSubmit, handleDelete, confirmDelete,
  } = useCrud({
    fetchAll:     async () => {
      const [poss, sum] = await Promise.all([getPossessions(), getPossessionsSummary()])
      setSummary(sum)
      return poss
    },
    create:       createPossession,
    update:       updatePossession,
    remove:       deletePossession,
    errorMessage: 'Impossible de charger les possessions.',
  })

  const filtered = filter === 'ALL' ? possessions : possessions.filter(p => p.category === filter)

  const grouped = filtered.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = []
    acc[p.category].push(p)
    return acc
  }, {})

  if (loading) return <p className="text-gray-500">Chargement…</p>
  if (error)   return <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>

  return (
    <div>
      {/* ── En-tête ── */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Passifs — Grandes possessions</h2>
        <button
          onClick={() => setFormTarget(null)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
        >
          + Ajouter
        </button>
      </div>

      {/* ── KPIs + Répartition ── */}
      {summary && (
        <div className="flex flex-col md:flex-row gap-4 mb-6 items-stretch">
          {/* 4 KPIs */}
          <div className="grid grid-cols-2 gap-4 md:w-1/2">
            <KpiCard
              label="Valeur d'achat totale"
              value={summary.totalPurchasePrice}
              sub={`${possessions.length} bien${possessions.length > 1 ? 's' : ''}`}
            />
            <KpiCard
              label="Valeur actuelle estimée"
              value={summary.totalEffectiveValue}
              color="text-indigo-600"
            />
            <KpiCard
              label="Décote cumulée"
              value={summary.totalDepreciation}
              color={summary.totalDepreciation > 0 ? 'text-red-600' : 'text-gray-900'}
              sub="depuis l'achat"
            />
            <KpiCard
              label="Taux de décote global"
              value={summary.globalDepreciationRate != null
                ? parseFloat(summary.globalDepreciationRate).toFixed(1)
                : null}
              unit="%"
              color={
                parseFloat(summary.globalDepreciationRate) > 50 ? 'text-red-600'
                : parseFloat(summary.globalDepreciationRate) > 25 ? 'text-orange-500'
                : 'text-gray-900'
              }
            />
          </div>

          {/* Répartition par catégorie */}
          {summary.byCategory?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-5 md:w-1/2 flex flex-col justify-center">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Répartition par catégorie</p>
              <div className="flex flex-col gap-2 ">
                {summary.byCategory.map(cat => {
                  const meta = CATEGORY_META[cat.category] ?? CATEGORY_META.AUTRE
                  const pct = summary.totalPurchasePrice > 0
                    ? (cat.totalPurchasePrice / summary.totalPurchasePrice) * 100
                    : 0
                  return (
                    <div key={cat.category} className="flex items-center gap-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.color} w-40 text-center shrink-0 truncate`}>
                        {meta.label}
                      </span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div
                          className={`${meta.dot} h-2 rounded-full `}
                          style={{ width: `${Math.min(pct, 100).toFixed(1)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600 w-28 text-right shrink-0 amount">
                        {fmt(cat.totalEffectiveValue)} €
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Filtre par catégorie ── */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[['ALL', 'Toutes'], ...Object.entries(CATEGORY_META).map(([v, { label }]) => [v, label])].map(([val, lbl]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              filter === val
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-300 text-gray-600 hover:border-indigo-400'
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* ── Liste groupée ── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
          <p className="text-lg mb-2">Aucune possession enregistrée</p>
          <p className="text-sm">Cliquez sur « + Ajouter » pour saisir un bien (voiture, ordinateur, collection…).</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {Object.entries(grouped).map(([category, items]) => {
            const meta = CATEGORY_META[category] ?? CATEGORY_META.AUTRE
            const catTotal = items.reduce((s, p) => s + parseFloat(p.effectiveCurrentValue ?? 0), 0)
            return (
              <div key={category} className="bg-white rounded-xl shadow-sm overflow-hidden">
                {/* En-tête catégorie */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.color}`}>
                      {meta.label}
                    </span>
                    <span className="text-xs text-gray-400">{items.length} bien{items.length > 1 ? 's' : ''}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-700 amount">
                    {fmt(catTotal)} € actuels
                  </span>
                </div>

                <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Bien</th>
                      <th className="hidden md:table-cell px-4 py-2 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Prix d'achat</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Valeur actuelle</th>
                      <th className="hidden md:table-cell px-4 py-2 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Décote</th>
                      <th className="hidden md:table-cell px-4 py-2 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Ancienneté</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(p => (
                      <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50 transition">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-800">{p.label}</p>
                          <p className="text-xs text-gray-400">{formatDate(p.purchaseDate)}</p>
                        </td>
                        <td className="hidden md:table-cell px-4 py-3 text-right text-sm text-gray-600 amount">
                          {fmt(p.purchasePrice)} €
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-sm font-semibold amount ${p.isManualOverride ? 'text-green-600' : 'text-gray-800'}`}>
                            {fmt(p.effectiveCurrentValue)} €
                          </span>
                          {p.isManualOverride && (
                            <span className="ml-1 text-xs bg-green-100 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded-full">Manuel</span>
                          )}
                        </td>
                        <td className="hidden md:table-cell px-4 py-3 text-right">
                          <span className="text-sm text-red-500 font-medium amount">
                            −{fmt(p.cumulatedDepreciation)} €
                          </span>
                          <span className="text-xs text-gray-400 ml-1">
                            ({parseFloat(p.depreciationRate).toFixed(1)} %)
                          </span>
                        </td>
                        <td className="hidden md:table-cell px-4 py-3 text-right text-xs text-gray-500">
                          {p.yearsOwned < 1
                            ? `${Math.round(p.yearsOwned * 12)} mois`
                            : `${p.yearsOwned.toFixed(1)} ans`}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col md:flex-row gap-1 md:gap-2 items-end md:justify-end">
                            <button
                              onClick={() => setFormTarget(p)}
                              className="px-3 py-1 border border-gray-300 rounded-md text-xs text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition"
                            >
                              Modifier
                            </button>
                            <button
                              onClick={() => handleDelete(p)}
                              className="px-3 py-1 border border-gray-300 rounded-md text-xs text-gray-600 hover:border-red-500 hover:text-red-600 transition"
                            >
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {formTarget !== undefined && (
        <PossessionForm
          possession={formTarget}
          onSubmit={handleSubmit}
          onCancel={() => setFormTarget(undefined)}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          title={`Supprimer « ${deleteTarget.label} » ?`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

    </div>
  )
}
