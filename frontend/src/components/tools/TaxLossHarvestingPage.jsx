import { useState, useEffect } from 'react'
import { getTaxLossHarvesting, getCtoCessions, getCryptoCessions, exportCtoCessionsCsv } from '../../api/taxLoss'
import { useAnalytics } from '../../hooks/useAnalytics'
import TaxLossBasketCard from './TaxLossBasketCard'
import TaxLossCandidatesTable from './TaxLossCandidatesTable'
import TaxLossSimulationModal from './TaxLossSimulationModal'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i)

const inputCls = 'px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition'

export default function TaxLossHarvestingPage() {
  const { trackPageView, trackEvent } = useAnalytics()
  useEffect(() => { trackPageView('tools.tax_loss_harvesting') }, [])

  // ── Paramètres fiscaux ─────────────────────────────────────
  const [year,              setYear]              = useState(CURRENT_YEAR)
  const [taxOption,         setTaxOption]         = useState('PFU')
  const [tmi,               setTmi]               = useState('')
  const [mvReporteesCto,    setMvReporteesCto]    = useState('')
  const [mvReporteesCrypto, setMvReporteesCrypto] = useState('')

  // ── État général ───────────────────────────────────────────
  const [tab,       setTab]       = useState('analyse')
  const [data,      setData]      = useState(null)
  const [cessions,  setCessions]  = useState(null)
  const [cryptoCess,setCryptoCess]= useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [exporting, setExporting] = useState(false)
  const [selected,  setSelected]  = useState(null)  // candidat pour la modal simulation

  const effectiveRate = taxOption === 'BAREME' && tmi
    ? parseFloat(tmi) / 100 + 0.172
    : 0.30

  useEffect(() => { fetchData() }, [year, taxOption, tmi, mvReporteesCto, mvReporteesCrypto])

  async function fetchData() {
    try {
      setLoading(true)
      setError(null)
      const [summary, ctoCess, cryptoCessions] = await Promise.all([
        getTaxLossHarvesting({
          year,
          taxOption,
          tmi: tmi ? parseFloat(tmi) : null,
          mvReporteesCto:    mvReporteesCto    ? parseFloat(mvReporteesCto)    : null,
          mvReporteesCrypto: mvReporteesCrypto ? parseFloat(mvReporteesCrypto) : null,
        }),
        getCtoCessions(year),
        getCryptoCessions(year),
      ])
      setData(summary)
      setCessions(ctoCess)
      setCryptoCess(cryptoCessions)
    } catch {
      setError('Impossible de calculer l\'optimisation fiscale.')
    } finally {
      setLoading(false)
    }
  }

  async function handleExportCsv() {
    setExporting(true)
    try {
      const blob = await exportCtoCessionsCsv(year)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `cessions-cto-${year}.csv`; a.click()
      URL.revokeObjectURL(url)
      trackEvent('FEATURE_USE', 'tools.tax_loss_harvesting.export_csv')
    } catch {
      setError('Erreur lors de l\'export CSV.')
    } finally {
      setExporting(false)
    }
  }

  const totalSaving = data
    ? (parseFloat(data.cto?.estimatedTaxSavingEur ?? 0) + parseFloat(data.crypto?.estimatedTaxSavingEur ?? 0))
    : 0

  return (
    <div className="max-w-5xl mx-auto">

      {/* ── En-tête ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Optimisation fiscale fin d'année</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Identifiez les positions à vendre avant le 31 décembre pour réduire votre impôt.
          </p>
        </div>
        <select
          value={year}
          onChange={e => { setYear(parseInt(e.target.value)); trackEvent('BUTTON_CLICK', 'tools.tax_loss_harvesting.change_year') }}
          className={`${inputCls} shrink-0`}
          aria-label="Sélectionner l'année fiscale"
        >
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* ── Paramètres fiscaux ── */}
      <div className="bg-white rounded-xl shadow-sm px-4 py-4 mb-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Paramètres fiscaux</p>
        <div className="flex flex-wrap gap-4 items-end">

          {/* Toggle PFU / Barème */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1.5">Régime d'imposition</p>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
              {['PFU', 'BAREME'].map(opt => (
                <button
                  key={opt}
                  onClick={() => { setTaxOption(opt); trackEvent('BUTTON_CLICK', 'tools.tax_loss_harvesting.toggle_tax_option', { option: opt }) }}
                  className={`px-4 py-2 font-medium transition ${taxOption === opt ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  {opt === 'PFU' ? 'PFU — 30 %' : 'Barème IR'}
                </button>
              ))}
            </div>
          </div>

          {/* TMI (si barème) */}
          {taxOption === 'BAREME' && (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1.5">Votre TMI (%)</p>
              <input
                type="number" min="0" max="45" step="1"
                value={tmi}
                onChange={e => setTmi(e.target.value)}
                placeholder="ex. 30"
                className={`${inputCls} w-28`}
              />
              {tmi && (
                <p className="text-xs text-indigo-600 mt-1">
                  Taux effectif : {(effectiveRate * 100).toFixed(1)} % ({tmi} + 17,2 %)
                </p>
              )}
            </div>
          )}

          {/* MV reportées CTO */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1.5">MV CTO reportées N-1… (€)</p>
            <input
              type="number" min="0" step="1"
              value={mvReporteesCto}
              onChange={e => setMvReporteesCto(e.target.value)}
              placeholder="0"
              className={`${inputCls} w-36`}
              title="Case 3VH de votre déclaration de l'année précédente"
            />
          </div>

          {/* MV reportées Crypto */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1.5">MV Crypto reportées N-1… (€)</p>
            <input
              type="number" min="0" step="1"
              value={mvReporteesCrypto}
              onChange={e => setMvReporteesCrypto(e.target.value)}
              placeholder="0"
              className={`${inputCls} w-36`}
            />
          </div>
        </div>
      </div>

      {/* ── Onglets ── */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {[
          { key: 'analyse',  label: 'Analyse & candidats' },
          { key: 'cessions', label: 'Récapitulatif cessions (2042C)' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
              tab === t.key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Erreur ── */}
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p>}

      {loading && <p className="text-gray-400 text-sm">Calcul en cours…</p>}

      {/* ── Onglet ANALYSE ── */}
      {!loading && data && tab === 'analyse' && (
        <>
          {totalSaving > 0 && (
            <div className="mb-5 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl text-sm text-indigo-700 dark:text-indigo-300 font-medium flex items-center gap-2">
              <span>💡</span>
              <span>
                Économie potentielle totale :{' '}
                <strong>{totalSaving.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</strong>{' '}
                en vendant les positions recommandées avant le 31 décembre.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <TaxLossBasketCard basket={data.cto} />
            <TaxLossBasketCard basket={data.crypto} />
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Candidats — Compte-titres
            </h3>
            <TaxLossCandidatesTable
              candidates={data.cto?.candidates}
              onSelectCandidate={c => { setSelected(c); trackEvent('BUTTON_CLICK', 'tools.tax_loss_harvesting.open_simulation') }}
            />
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Candidats — Crypto-monnaies
            </h3>
            <TaxLossCandidatesTable
              candidates={data.crypto?.candidates}
              onSelectCandidate={c => { setSelected(c); trackEvent('BUTTON_CLICK', 'tools.tax_loss_harvesting.open_simulation') }}
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4 text-sm text-amber-800 dark:text-amber-300 space-y-1">
            <p className="font-semibold mb-2">Conseils importants</p>
            <p>• Attendre 15 à 30 jours avant de racheter la même valeur (recommandé pour éviter la requalification).</p>
            <p>• La compensation crypto ↔ actions est <strong>interdite</strong> — les deux baskets sont cloisonnés.</p>
            <p>• PEA et Assurance-vie sont exclus du calcul (régimes fiscaux spécifiques).</p>
            <p>• Ces conseils sont indicatifs. Frais de courtage non inclus.</p>
          </div>

          <p className="text-xs text-gray-400 mt-4 text-center">
            Informations à titre indicatif uniquement — non assimilables à un conseil en investissement.
          </p>
        </>
      )}

      {/* ── Onglet CESSIONS ── */}
      {!loading && tab === 'cessions' && (
        <CtoCessionsPanel
          cessions={cessions}
          cryptoCessions={cryptoCess}
          onExport={handleExportCsv}
          exporting={exporting}
        />
      )}

      {/* ── Modal simulation ── */}
      {selected && (
        <TaxLossSimulationModal
          candidate={selected}
          taxRate={effectiveRate}
          onClose={() => setSelected(null)}
        />
      )}

      {/* ── Section éducative ── */}
      <TaxLossExplainer />
    </div>
  )
}

// ── Panneau récapitulatif des cessions ────────────────────────────────────────

function fmt(n) {
  if (n == null) return '—'
  return Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function CryptoFmt({ date }) {
  return date ? String(date) : '—'
}

function CtoCessionsPanel({ cessions, cryptoCessions, onExport, exporting }) {
  const [subTab, setSubTab] = useState('cto')
  const net     = parseFloat(cessions?.netCapitalGainEur ?? 0)
  const isGain  = net >= 0
  const hasCto  = cessions?.cessions?.length > 0
  const hasCrypto = cryptoCessions?.length > 0

  return (
    <div>
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Cessions CTO</p>
          <p className="text-2xl font-bold text-gray-800">{cessions?.cessions?.length ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">transactions en {cessions?.year}</p>
        </div>
        <div className={`rounded-xl shadow-sm p-4 text-center ${isGain ? 'bg-emerald-50' : 'bg-red-50'}`}>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Résultat net CTO</p>
          <p className={`text-2xl font-bold ${isGain ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600 dark:text-red-400'}`}>
            {isGain ? '+' : ''}{fmt(cessions?.netCapitalGainEur)} €
          </p>
        </div>
        <div className="bg-indigo-50 rounded-xl shadow-sm p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">À reporter sur 2042C</p>
          {parseFloat(cessions?.case3VG ?? 0) > 0 && (
            <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Case <strong>3VG</strong> : {fmt(cessions?.case3VG)} €</p>
          )}
          {parseFloat(cessions?.case3VH ?? 0) > 0 && (
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mt-1">Case <strong>3VH</strong> : {fmt(cessions?.case3VH)} €</p>
          )}
          {!hasCto && <p className="text-xs text-gray-400">Aucune cession CTO</p>}
        </div>
      </div>

      {hasCto && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 dark:text-amber-300">
          <strong>Rappel :</strong> votre broker vous adressera un IFU (Imprimé Fiscal Unique) en janvier. En cas d'écart, les chiffres de l'IFU font foi.
        </div>
      )}

      {/* Sous-onglets CTO / Crypto */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {[
          { key: 'cto',    label: `Compte-titres (${cessions?.cessions?.length ?? 0})` },
          { key: 'crypto', label: `Crypto (${cryptoCessions?.length ?? 0})` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${
              subTab === t.key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Export + tableau CTO */}
      {subTab === 'cto' && (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={onExport}
              disabled={exporting || !hasCto}
              data-testid="export-cessions-csv-button"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-2"
            >
              {exporting ? 'Export…' : '⬇ Exporter CSV (2042C)'}
            </button>
          </div>

          {!hasCto ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
              <p className="text-lg mb-1">Aucune cession CTO en {cessions?.year}</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      {['Date','Position','Qté vendue','Produit (€)','Coût CMP (€)','+/− Value (€)','Cumul (€)'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cessions.cessions.map((c, i) => {
                      const pv = parseFloat(c.capitalGainEur ?? 0)
                      const running = parseFloat(c.runningTotalEur ?? 0)
                      return (
                        <tr key={i} className="border-t border-gray-100 hover:bg-gray-50 transition">
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{c.cessionDate}</td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-800">{c.positionLabel}</p>
                            {c.partner && <p className="text-xs text-gray-400">{c.partner}</p>}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{parseFloat(c.quantity).toLocaleString('fr-FR', { maximumFractionDigits: 4 })}</td>
                          <td className="px-4 py-3 font-medium text-gray-800">{fmt(c.sellAmountEur)}</td>
                          <td className="px-4 py-3 text-gray-600">{fmt(c.costBasisEur)}</td>
                          <td className={`px-4 py-3 font-semibold ${pv >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                            {pv >= 0 ? '+' : ''}{fmt(c.capitalGainEur)}
                          </td>
                          <td className={`px-4 py-3 font-semibold ${running >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                            {running >= 0 ? '+' : ''}{fmt(c.runningTotalEur)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300 bg-gray-50">
                      <td colSpan={5} className="px-4 py-3 font-semibold text-gray-700">Total net</td>
                      <td colSpan={2} className={`px-4 py-3 font-bold text-base ${net >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600 dark:text-red-400'}`}>
                        {net >= 0 ? '+' : ''}{fmt(cessions.netCapitalGainEur)} €
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
          {hasCto && (
            <div className="mt-4 text-xs text-gray-400 space-y-1">
              <p><strong>Case 3VG</strong> — Plus-values imposables (résultat net positif).</p>
              <p><strong>Case 3VH</strong> — Moins-values reportables 10 ans (résultat net négatif).</p>
              <p>Calcul par coût moyen pondéré (CMP) — art. 150-0 D CGI.</p>
            </div>
          )}
        </>
      )}

      {/* Tableau Crypto cessions */}
      {subTab === 'crypto' && (
        <>
          {!hasCrypto ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
              <p className="text-lg mb-1">Aucune cession crypto en {cessions?.year}</p>
              <p className="text-sm">Les SELL_FIAT (ventes en euros) apparaissent ici.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      {['Date','Position','Prix cession (€)','PTA avant','+/− Value (€)'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cryptoCessions.map((c, i) => {
                      const pv = parseFloat(c.plusValueEur ?? 0)
                      return (
                        <tr key={i} className="border-t border-gray-100 hover:bg-gray-50 transition">
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{c.cessionDate}</td>
                          <td className="px-4 py-3 font-medium text-gray-800">{c.label ?? '—'}</td>
                          <td className="px-4 py-3 font-medium text-gray-800">{fmt(c.prixDeCessionEur)}</td>
                          <td className="px-4 py-3 text-gray-600">{fmt(c.ptaAvantCession)}</td>
                          <td className={`px-4 py-3 font-semibold ${pv >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                            {c.plusValueEur != null ? `${pv >= 0 ? '+' : ''}${fmt(c.plusValueEur)}` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div className="mt-4 text-xs text-gray-400">
            <p>Cessions crypto selon la méthode PTA/VGP (art. 150 VH bis CGI). Voir aussi <strong>Fiscalité crypto (2086)</strong> pour l'export complet.</p>
          </div>
        </>
      )}
    </div>
  )
}

// ── Section éducative ─────────────────────────────────────────────────────────

function TaxLossExplainer() {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-10 border-t border-gray-200 pt-6">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-indigo-600 transition w-full text-left"
      >
        <span className="text-base">{open ? '▲' : '▼'}</span>
        Comment ça marche ? Comprendre le tax-loss harvesting
      </button>

      {open && (
        <div className="mt-6 space-y-6 text-sm text-gray-700">

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
            <p className="font-bold text-blue-800 dark:text-blue-300 text-base mb-3">💡 L'idée en une phrase</p>
            <p className="text-blue-900 dark:text-blue-200 leading-relaxed">
              En France, quand tu gagnes de l'argent en bourse, tu paies 30 % d'impôt.
              Mais si tu réalises aussi des <strong>pertes</strong> la même année, elles viennent
              <strong> effacer</strong> une partie de tes gains — et donc réduire ta facture fiscale.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="font-bold text-gray-800 mb-4">📖 Un exemple très concret</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="bg-emerald-50 rounded-lg p-3 text-center">
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wide mb-1">Ce que tu as gagné</p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">+5 000 €</p>
                <p className="text-xs text-gray-500 mt-1">Vente d'une action Apple en mars</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <p className="text-xs text-red-500 dark:text-red-400 font-semibold uppercase tracking-wide mb-1">Ta position en perte</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">−3 000 €</p>
                <p className="text-xs text-gray-500 mt-1">ETF Asie actuellement dans le rouge</p>
              </div>
              <div className="bg-indigo-50 rounded-lg p-3 text-center">
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wide mb-1">Tu économises</p>
                <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">900 €</p>
                <p className="text-xs text-gray-500 mt-1">3 000 × 30 % = 900 € d'impôt évité</p>
              </div>
            </div>
            <p className="text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-3">
              Sans rien faire : tu paies <strong>1 500 €</strong> d'impôt sur tes 5 000 € de gains.<br />
              En vendant l'ETF en perte : tu ne paies que <strong>600 €</strong> (sur 2 000 € nets).<br />
              Le lendemain, tu <strong>rachètes le même ETF</strong> — ton portefeuille est identique,
              mais tu as économisé 900 € sur ta déclaration.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="font-bold text-gray-800 mb-3">📅 Pourquoi agir avant le 31 décembre ?</p>
            <p className="leading-relaxed text-gray-600">
              Le fisc regarde ton bilan au <strong>31 décembre à minuit</strong>. Passé cette date,
              une perte non réalisée ne compte plus pour l'année en cours. La fenêtre d'action
              est donc <strong>novembre-décembre</strong>.
            </p>
            <p className="leading-relaxed text-gray-600 mt-2">
              Bonne nouvelle : si tu n'as pas de gains à compenser cette année, la perte n'est
              pas perdue. Elle est <strong>reportée automatiquement sur 10 ans</strong>.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="font-bold text-gray-800 mb-3">🧱 La règle des « cloisons » fiscales</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="border border-gray-200 rounded-lg p-3">
                <p className="font-semibold text-gray-700 mb-2">Compte-titres ordinaire (CTO)</p>
                <p className="text-xs text-gray-500">Actions, ETF, obligations en CTO</p>
                <p className="text-xs text-emerald-600 mt-1 font-medium">✓ Pertes compensables entre elles</p>
                <p className="text-xs text-red-500 mt-0.5">✗ Ne compense pas les gains crypto</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-3">
                <p className="font-semibold text-gray-700 mb-2">Crypto-monnaies</p>
                <p className="text-xs text-gray-500">Bitcoin, Ethereum, altcoins…</p>
                <p className="text-xs text-emerald-600 mt-1 font-medium">✓ Pertes compensables entre elles</p>
                <p className="text-xs text-red-500 mt-0.5">✗ Ne compense pas les gains bourse</p>
              </div>
              <div className="border border-gray-100 rounded-lg p-3 bg-gray-50 sm:col-span-2">
                <p className="font-semibold text-gray-500 mb-1">PEA · Assurance-vie · PER · PEE</p>
                <p className="text-xs text-gray-400">Ces enveloppes ont leurs propres règles fiscales. Les pertes internes ne peuvent pas être utilisées en dehors de l'enveloppe.</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="font-bold text-gray-800 mb-3">🔄 « Je vends à perte… et après ? »</p>
            <p className="text-gray-600 leading-relaxed">
              Contrairement aux États-Unis (<em>wash sale rule</em>), <strong>la France n'interdit pas</strong> de racheter la même valeur immédiatement.
              Par prudence, il est recommandé d'attendre <strong>15 à 30 jours</strong> ou de racheter un ETF <strong>similaire mais différent</strong>
              (ex. vendre l'ETF MSCI Europe d'Amundi, racheter celui de BNP) pour éviter tout risque d'abus de droit.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="font-bold text-gray-800 mb-3">🧮 Le calcul du PFU</p>
            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-[140px] bg-indigo-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">12,8 %</p>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">Impôt sur le revenu</p>
              </div>
              <div className="flex items-center text-gray-400 font-bold text-xl">+</div>
              <div className="flex-1 min-w-[140px] bg-indigo-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">17,2 %</p>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">Prélèvements sociaux</p>
              </div>
              <div className="flex items-center text-gray-400 font-bold text-xl">=</div>
              <div className="flex-1 min-w-[140px] bg-indigo-700 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-white">30 %</p>
                <p className="text-xs text-indigo-200 mt-1">PFU total</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Option barème : TMI + 17,2 %. Utilisez le sélecteur en haut de page pour recalculer avec votre taux réel.
            </p>
          </div>

        </div>
      )}
    </div>
  )
}
