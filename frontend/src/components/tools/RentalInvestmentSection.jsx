import { useEffect, useMemo, useState } from 'react'
import {
  BarChart, Bar, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { fmt, fmtPct } from './loanSimulatorUtils'
import { NumInput, Section } from './LoanSimulatorInputs'

const PS_RATE = 17.2

const TMI_OPTIONS = [
  { value: 0,  label: '0 % (non imposable)' },
  { value: 11, label: '11 %' },
  { value: 30, label: '30 %' },
  { value: 41, label: '41 %' },
  { value: 45, label: '45 %' },
]

const SCENARIO_COLORS = { mf: '#6366f1', reelNu: '#8b5cf6', lmnpMicro: '#06b6d4', lmnpReel: '#10b981', reelNuP2P: '#f97316' }
const SCENARIO_LABELS = { mf: 'Micro-foncier', reelNu: 'Réel nu', lmnpMicro: 'LMNP micro-BIC', lmnpReel: 'LMNP réel', reelNuP2P: 'Réel nu (P. à P.)' }

// ── Tooltip KPI ───────────────────────────────────────────────────────────────
function InfoTooltip({ color = 'text-gray-400', children }) {
  return (
    <span className={`relative group cursor-help ${color} text-xs`}>
      ⓘ
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl text-left whitespace-normal">
        {children}
      </div>
    </span>
  )
}

// ── Tooltip ligne de carte ────────────────────────────────────────────────────
function CalcTooltip({ wide, children }) {
  return (
    <span className="relative group cursor-help text-gray-300 text-[10px] ml-0.5 shrink-0">
      ⓘ
      <div className={`absolute bottom-full left-0 mb-1.5 hidden group-hover:block z-50 ${wide ? 'w-72' : 'w-64'} bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl text-left whitespace-normal`}>
        {children}
      </div>
    </span>
  )
}

function TRow({ label, value, highlight }) {
  return (
    <div className={`flex justify-between gap-3 ${highlight ? 'text-white font-semibold border-t border-gray-700 pt-1.5 mt-1' : 'text-gray-300'}`}>
      <span className="text-gray-400 shrink-0">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )
}

// ── Carte scénario ────────────────────────────────────────────────────────────
function ScenarioCard({ title, badge, rows, taxSaving, note, color }) {
  return (
    <div className={`rounded-xl border ${color} p-4 flex flex-col gap-3`}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-bold text-gray-800 leading-tight">{title}</span>
        {badge && <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>{badge.label}</span>}
      </div>
      <div className="space-y-1.5 text-sm">
        {rows.map((row, i) => (
          <div key={i} className={`flex justify-between items-center ${row.separator ? 'border-t border-gray-100 pt-1.5' : ''} ${row.bold ? 'text-gray-700' : 'text-gray-600'}`}>
            <span className="flex items-center gap-0.5 min-w-0">
              <span className="truncate">{row.label}</span>
              {row.tooltip && <CalcTooltip wide={row.wideTooltip}>{row.tooltip}</CalcTooltip>}
            </span>
            <span className={`font-medium shrink-0 ml-2 ${row.bold ? 'font-bold text-base' : ''} ${row.valueClass ?? 'text-gray-900'}`}>
              {row.value}
            </span>
          </div>
        ))}
      </div>
      {taxSaving && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 space-y-1">
          <div className="flex justify-between text-emerald-700">
            <span className="font-semibold text-xs">{taxSaving.label}</span>
            <span className="font-bold">+ {fmt(taxSaving.annual)}/an</span>
          </div>
          <p className="text-xs text-emerald-600 leading-relaxed">{taxSaving.hint}</p>
        </div>
      )}
      {note && <p className="text-xs text-gray-400 italic border-t border-gray-100 pt-2 leading-relaxed">{note}</p>}
    </div>
  )
}

// ── Calcul d'un scénario ──────────────────────────────────────────────────────
function computeScenarios({
  annualEffectiveRent, annualChargesBase, annualMortgage,
  yearInterest, yearInsurance,
  taxeFonciere, localCondoFees, annualGLI, annualWorks, annualGestion, pnoInsurance, accountingFees,
  furnitureVal, propertyPrice, acquisitionCost, ir, ps,
}) {
  const mfImposable = annualEffectiveRent * 0.70
  const mfNetTax    = mfImposable * (ir + ps)
  const mfCashflow  = (annualEffectiveRent - annualMortgage - annualChargesBase - mfNetTax) / 12
  const mfRendement = acquisitionCost > 0 ? (annualEffectiveRent - annualChargesBase - mfNetTax) / acquisitionCost * 100 : 0

  const reelDeductibles = yearInterest + yearInsurance + taxeFonciere + localCondoFees * 12 + annualGLI + annualWorks + annualGestion + pnoInsurance
  const reelRevenuNet   = annualEffectiveRent - reelDeductibles
  const reelNetTax      = reelRevenuNet >= 0
    ? reelRevenuNet * (ir + ps)
    : -(Math.min(10700, Math.abs(reelRevenuNet)) * ir)
  const reelCashflow  = (annualEffectiveRent - annualMortgage - annualChargesBase - reelNetTax) / 12
  const reelRendement = acquisitionCost > 0 ? (annualEffectiveRent - annualChargesBase - reelNetTax) / acquisitionCost * 100 : 0

  const lmnpMicroImposable = annualEffectiveRent * 0.50
  const lmnpMicroNetTax    = lmnpMicroImposable * (ir + ps)
  const lmnpMicroCashflow  = (annualEffectiveRent - annualMortgage - annualChargesBase - lmnpMicroNetTax) / 12
  const lmnpMicroRendement = acquisitionCost > 0 ? (annualEffectiveRent - annualChargesBase - lmnpMicroNetTax) / acquisitionCost * 100 : 0

  const amortBien     = propertyPrice * 0.85 / 30
  const amortMobilier = furnitureVal > 0 ? furnitureVal / 10 : 0
  const lmnpReelDeductibles = yearInterest + yearInsurance + taxeFonciere + localCondoFees * 12 + annualGLI + annualWorks + annualGestion + pnoInsurance + accountingFees + amortBien + amortMobilier
  const lmnpReelResultat    = annualEffectiveRent - lmnpReelDeductibles
  const lmnpReelNetTax      = lmnpReelResultat > 0 ? lmnpReelResultat * (ir + ps) : 0
  const lmnpReelCashflow    = (annualEffectiveRent - annualMortgage - annualChargesBase - accountingFees - lmnpReelNetTax) / 12
  const lmnpReelRendement   = acquisitionCost > 0 ? (annualEffectiveRent - annualChargesBase - accountingFees - lmnpReelNetTax) / acquisitionCost * 100 : 0

  return {
    mf:        { imposable: mfImposable,       netTax: mfNetTax,        cashflow: mfCashflow,       rendement: mfRendement },
    reelNu:    { revenuNet: reelRevenuNet,      netTax: reelNetTax,      cashflow: reelCashflow,      rendement: reelRendement, deficit: reelRevenuNet < 0, deductibles: reelDeductibles },
    lmnpMicro: { imposable: lmnpMicroImposable, netTax: lmnpMicroNetTax, cashflow: lmnpMicroCashflow, rendement: lmnpMicroRendement },
    lmnpReel:  { resultat:  lmnpReelResultat,   netTax: lmnpReelNetTax,  cashflow: lmnpReelCashflow,  rendement: lmnpReelRendement, amortBien, amortMobilier, deductibles: lmnpReelDeductibles },
  }
}

// ── Loyer minimum pour cashflow nul (recherche dichotomique) ──────────────────
function findBreakevenRent({ scenario, annualMortgage, taxeFonciere, localCondoFees, pnoInsurance, annualWorks, accountingFees, furnitureVal, propertyPrice, year1Interest, year1Insurance, vacancyRate, gestionRate, gliEnabled, gliRate, ir, ps }) {
  let lo = 0, hi = 30000
  for (let i = 0; i < 80; i++) {
    const mid   = (lo + hi) / 2
    const rent  = mid * 12 * (1 - vacancyRate / 100)
    const gestion = rent * gestionRate / 100
    const gli   = gliEnabled ? rent * gliRate / 100 : 0
    const charges = taxeFonciere + localCondoFees * 12 + gli + annualWorks + gestion + pnoInsurance
    let cf
    if (scenario === 'mf') {
      cf = (rent - annualMortgage - charges - rent * 0.7 * (ir + ps)) / 12
    } else if (scenario === 'reelNu') {
      const deductibles = year1Interest + year1Insurance + taxeFonciere + localCondoFees * 12 + gli + annualWorks + gestion + pnoInsurance
      const revenuNet = rent - deductibles
      const tax = revenuNet >= 0 ? revenuNet * (ir + ps) : -(Math.min(10700, Math.abs(revenuNet)) * ir)
      cf = (rent - annualMortgage - charges - tax) / 12
    } else if (scenario === 'lmnpMicro') {
      cf = (rent - annualMortgage - charges - rent * 0.5 * (ir + ps)) / 12
    } else {
      const amortBien = propertyPrice * 0.85 / 30
      const amortMobilier = furnitureVal > 0 ? furnitureVal / 10 : 0
      const deductibles = year1Interest + year1Insurance + taxeFonciere + localCondoFees * 12 + gli + annualWorks + gestion + pnoInsurance + accountingFees + amortBien + amortMobilier
      const resultat = rent - deductibles
      const tax = resultat > 0 ? resultat * (ir + ps) : 0
      cf = (rent - annualMortgage - charges - accountingFees - tax) / 12
    }
    if (cf < 0) lo = mid; else hi = mid
  }
  return Math.ceil(hi)
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function RentalInvestmentSection({
  acquisitionCost, propertyPrice, totalMonthlyPayment, loanAmount, personalContrib: personalContribProp,
  propertyTax: propertyTaxProp, condoFees: condoFeesProp, annualSummary,
  monthlyRent, onMonthlyRent, vacancyRate, onVacancyRate,
  gestionRate, onGestionRate, pnoInsurance, onPnoInsurance,
  accountingFees, onAccountingFees, gliEnabled, onGliEnabled,
  gliRate, onGliRate, annualWorks, onAnnualWorks,
  furnitureVal, onFurnitureVal, tmi, onTmi,
}) {
  const [taxeFonciere,    setTaxeFonciere]    = useState(propertyTaxProp ?? 0)
  const [localCondoFees,  setLocalCondoFees]  = useState(condoFeesProp   ?? 0)
  const [bilanHorizon,    setBilanHorizon]    = useState(10)
  const [bilanApprec,     setBilanApprec]     = useState(2)

  useEffect(() => setTaxeFonciere(propertyTaxProp ?? 0), [propertyTaxProp])
  useEffect(() => setLocalCondoFees(condoFeesProp ?? 0),  [condoFeesProp])

  const calc = useMemo(() => {
    const annualEffectiveRent = monthlyRent * 12 * (1 - vacancyRate / 100)
    const year1Interest  = annualSummary[0]?.interets  ?? 0
    const year1Insurance = annualSummary[0]?.assurance ?? 0
    const annualMortgage = totalMonthlyPayment * 12
    const annualGLI      = gliEnabled ? annualEffectiveRent * gliRate / 100 : 0
    const annualGestion  = annualEffectiveRent * gestionRate / 100
    const annualChargesBase = taxeFonciere + localCondoFees * 12 + annualGLI + annualWorks + annualGestion + pnoInsurance

    const rendementBrut       = acquisitionCost > 0 ? annualEffectiveRent / acquisitionCost * 100 : 0
    const rendementNetCharges = acquisitionCost > 0 ? (annualEffectiveRent - annualChargesBase) / acquisitionCost * 100 : 0
    const cashflowBrut        = (annualEffectiveRent - annualMortgage - annualChargesBase) / 12

    const ir = tmi / 100
    const ps = PS_RATE / 100

    const params = {
      annualEffectiveRent, annualChargesBase, annualMortgage,
      yearInterest: year1Interest, yearInsurance: year1Insurance,
      taxeFonciere, localCondoFees, annualGLI, annualWorks, annualGestion, pnoInsurance, accountingFees,
      furnitureVal, propertyPrice, acquisitionCost, ir, ps,
    }
    const scenarios = computeScenarios(params)

    // Scénario P2P : réel nu sans frais de gestion
    const paramsP2P = { ...params, annualGestion: 0, annualChargesBase: taxeFonciere + localCondoFees * 12 + annualGLI + annualWorks + pnoInsurance }
    const scenariosP2P = computeScenarios(paramsP2P)

    const projectionData = annualSummary.map((ys, i) => {
      const s    = computeScenarios({ ...params,    yearInterest: ys.interets, yearInsurance: ys.assurance })
      const sP2P = computeScenarios({ ...paramsP2P, yearInterest: ys.interets, yearInsurance: ys.assurance })
      return {
        label: `An ${i + 1}`,
        [SCENARIO_LABELS.mf]:        Math.round(s.mf.cashflow),
        [SCENARIO_LABELS.reelNu]:    Math.round(s.reelNu.cashflow),
        [SCENARIO_LABELS.lmnpMicro]: Math.round(s.lmnpMicro.cashflow),
        [SCENARIO_LABELS.lmnpReel]:  Math.round(s.lmnpReel.cashflow),
        [SCENARIO_LABELS.reelNuP2P]: Math.round(sP2P.reelNu.cashflow),
      }
    })

    // ── Loyers de rentabilité ─────────────────────────────────────────────
    const breakevenParams = {
      annualMortgage, taxeFonciere, localCondoFees, pnoInsurance, annualWorks,
      accountingFees, furnitureVal, propertyPrice,
      year1Interest, year1Insurance, vacancyRate, gestionRate, gliEnabled, gliRate, ir, ps,
    }
    const minRents = {
      mf:        findBreakevenRent({ scenario: 'mf',        ...breakevenParams }),
      reelNu:    findBreakevenRent({ scenario: 'reelNu',    ...breakevenParams }),
      lmnpMicro: findBreakevenRent({ scenario: 'lmnpMicro', ...breakevenParams }),
      lmnpReel:  findBreakevenRent({ scenario: 'lmnpReel',  ...breakevenParams }),
    }

    const minRentP2P = findBreakevenRent({ scenario: 'reelNu', ...breakevenParams, gestionRate: 0 })

    return {
      annualEffectiveRent, annualChargesBase, annualGLI, annualGestion, annualMortgage,
      year1Interest, year1Insurance, rendementBrut, rendementNetCharges, cashflowBrut,
      ...scenarios, reelNuP2P: scenariosP2P.reelNu,
      projectionData, minRents: { ...minRents, reelNuP2P: minRentP2P },
    }
  }, [monthlyRent, vacancyRate, taxeFonciere, localCondoFees, gestionRate, pnoInsurance, accountingFees,
      gliEnabled, gliRate, annualWorks, furnitureVal, tmi,
      acquisitionCost, propertyPrice, totalMonthlyPayment, annualSummary])

  // ── Bilan patrimonial (dépend de bilanHorizon et bilanApprec) ────────────
  const bilan = useMemo(() => {
    if (!annualSummary.length || !monthlyRent) return null
    const horizon    = Math.min(bilanHorizon, calc.projectionData.length)
    const propValueN = propertyPrice * Math.pow(1 + bilanApprec / 100, horizon)
    const debtN      = annualSummary[horizon - 1]?.capitalTotal ?? 0
    const equityN    = propValueN - debtN
    const initialOut = Math.max(0, personalContribProp ?? (acquisitionCost - (loanAmount ?? 0)))

    const compute = (key) => {
      const annualCashflows = calc.projectionData.slice(0, horizon).map(d => d[key] * 12)
      const cumCashflow = annualCashflows.reduce((s, v) => s + v, 0)
      const totalCashOut = initialOut + Math.max(0, -cumCashflow)
      const totalWealth  = equityN + Math.max(0, cumCashflow)
      const netGain      = equityN + cumCashflow - initialOut
      const cagr         = totalCashOut > 0 && horizon > 0
        ? (Math.pow(Math.max(0.01, (equityN + Math.max(0, cumCashflow)) / totalCashOut), 1 / horizon) - 1) * 100
        : null
      return { cumCashflow: Math.round(cumCashflow), equityN: Math.round(equityN), netGain: Math.round(netGain), totalWealth: Math.round(totalWealth), cagr, totalCashOut: Math.round(totalCashOut) }
    }

    return {
      horizon, propValueN: Math.round(propValueN), debtN: Math.round(debtN), initialOut: Math.round(initialOut),
      mf:        compute(SCENARIO_LABELS.mf),
      reelNu:    compute(SCENARIO_LABELS.reelNu),
      reelNuP2P: compute(SCENARIO_LABELS.reelNuP2P),
      lmnpMicro: compute(SCENARIO_LABELS.lmnpMicro),
      lmnpReel:  compute(SCENARIO_LABELS.lmnpReel),
    }
  }, [bilanHorizon, bilanApprec, calc.projectionData, annualSummary, propertyPrice, personalContribProp, acquisitionCost, loanAmount, monthlyRent])

  const {
    annualEffectiveRent, annualChargesBase, annualGLI, annualGestion, annualMortgage,
    year1Interest, year1Insurance, rendementBrut, rendementNetCharges, cashflowBrut,
    mf, reelNu, reelNuP2P, lmnpMicro, lmnpReel, projectionData, minRents,
  } = calc

  const eligibleMicroFoncier = annualEffectiveRent <= 15000
  const eligibleMicroBIC     = annualEffectiveRent <= 77700
  const ir = tmi / 100

  // ── Helpers tooltip ───────────────────────────────────────────────────────
  const ttRendement = (net, tax, charges = annualChargesBase) => (
    <>
      <p className="font-semibold text-gray-300 mb-1.5">Rendement net-net</p>
      <TRow label="Loyer annuel"      value={`+ ${fmt(annualEffectiveRent)}`} />
      <TRow label="− Charges"         value={fmt(charges)} />
      <TRow label={tax >= 0 ? '− Impôt' : '+ Économie fiscale'} value={fmt(Math.abs(tax))} />
      <TRow label="÷ Coût acquisition" value={fmt(acquisitionCost)} />
      <TRow label="= Rendement"       value={fmtPct(net)} highlight />
    </>
  )

  const ttCashflow = (cf, tax, charges = annualChargesBase) => (
    <>
      <p className="font-semibold text-gray-300 mb-1.5">{cf >= 0 ? 'Cashflow mensuel net' : 'Effort d\'épargne mensuel'}</p>
      <TRow label="Loyer mensuel"     value={`+ ${fmt(annualEffectiveRent / 12)}`} />
      <TRow label="− Mensualité"      value={fmt(annualMortgage / 12)} />
      <TRow label="− Charges"         value={fmt(charges / 12)} />
      <TRow label={tax >= 0 ? '− Impôt mensuel' : '+ Économie'} value={fmt(Math.abs(tax) / 12)} />
      <TRow label={cf >= 0 ? '= Cashflow' : '= À compléter/mois'} value={`${cf >= 0 ? '+' : ''}${fmt(cf)}`} highlight />
      {cf < 0 && <p className="text-gray-400 mt-1.5 leading-relaxed">Vous devez apporter {fmt(Math.abs(cf))}/mois de votre poche pour couvrir la différence.</p>}
    </>
  )

  const ttDeductiblesReel = (total) => (
    <>
      <p className="font-semibold text-gray-300 mb-1.5">Charges déductibles (régime réel)</p>
      <TRow label="Loyer annuel"       value={`+ ${fmt(annualEffectiveRent)}`} />
      <TRow label="− Intérêts (an 1)"  value={fmt(year1Interest)} />
      <TRow label="− Assurance (an 1)" value={fmt(year1Insurance)} />
      {taxeFonciere   > 0 && <TRow label="− Taxe foncière"  value={fmt(taxeFonciere)} />}
      {localCondoFees > 0 && <TRow label="− Charges copro"  value={fmt(localCondoFees * 12)} />}
      {annualGLI      > 0 && <TRow label="− GLI"            value={fmt(annualGLI)} />}
      {annualGestion  > 0 && <TRow label="− Frais gestion"  value={fmt(annualGestion)} />}
      {pnoInsurance   > 0 && <TRow label="− Assurance PNO"  value={fmt(pnoInsurance)} />}
      {annualWorks    > 0 && <TRow label="− Entretien"       value={fmt(annualWorks)} />}
      <TRow label="= Résultat"         value={fmt(total)} highlight />
    </>
  )

  // ── Lignes par scénario ───────────────────────────────────────────────────
  const makeRows = (scenario, imposable, netTax, rendement, cashflow, revenuLabel, taxLabel, revenuExtra) => [
    {
      label: revenuLabel, value: imposable !== null ? fmt(imposable) : fmt(revenuExtra?.revenuNet),
      valueClass: revenuExtra?.deficit ? 'text-amber-600' : 'text-gray-900',
      wideTooltip: !!revenuExtra,
      tooltip: revenuExtra
        ? ttDeductiblesReel(revenuExtra.revenuNet)
        : (
          <>
            <p className="font-semibold text-gray-300 mb-1.5">{revenuLabel}</p>
            <TRow label="Loyer annuel effectif" value={fmt(annualEffectiveRent)} />
            <TRow label={scenario === 'mf' ? '× Abattement (70 %)' : '× Abattement (50 %)'} value={scenario === 'mf' ? '× 0,70' : '× 0,50'} />
            <TRow label="= Imposable" value={fmt(imposable)} highlight />
            <p className="text-gray-400 mt-2 leading-relaxed">
              {scenario === 'mf' ? 'L\'abattement de 30 % remplace toutes les charges réelles.' : 'L\'abattement de 50 % remplace charges et amortissement.'}
            </p>
          </>
        ),
    },
    {
      label: taxLabel,
      value: netTax === 0 ? '—' : netTax < 0 ? `− ${fmt(Math.abs(netTax))}` : fmt(netTax),
      valueClass: netTax > 0 ? 'text-red-600' : netTax < 0 ? 'text-emerald-600' : 'text-gray-400',
      tooltip: netTax === 0 || revenuExtra?.deficit ? (
        <>
          <p className="font-semibold text-gray-300 mb-1.5">{revenuExtra?.deficit ? 'Déficit foncier' : 'Bouclier fiscal'}</p>
          <p className="text-gray-300 leading-relaxed">Résultat nul ou négatif : aucun impôt à payer.</p>
          {revenuExtra?.deficit && <p className="text-gray-400 mt-1.5 leading-relaxed">Jusqu'à 10 700 €/an déductible des autres revenus. Solde reportable 10 ans.</p>}
          {!revenuExtra?.deficit && <p className="text-gray-400 mt-1.5 leading-relaxed">Le déficit BIC LMNP est reportable sur les bénéfices LMNP futurs.</p>}
        </>
      ) : (
        <>
          <p className="font-semibold text-gray-300 mb-1.5">{revenuExtra?.deficit ? 'Économie fiscale' : 'Impôt + prélèvements sociaux'}</p>
          {netTax > 0 && <>
            <TRow label="Base imposable" value={fmt(imposable ?? revenuExtra?.revenuNet)} />
            <TRow label={`× IR (${tmi} %)`} value={fmt((imposable ?? revenuExtra?.revenuNet ?? 0) * ir)} />
            <TRow label="× PS (17,2 %)"  value={fmt((imposable ?? revenuExtra?.revenuNet ?? 0) * PS_RATE / 100)} />
            <TRow label="= Total" value={fmt(netTax)} highlight />
          </>}
        </>
      ),
    },
    {
      label: 'Rendement net-net', value: fmtPct(rendement), separator: true,
      valueClass: rendement >= 4 ? 'text-emerald-600 font-semibold' : rendement >= 2 ? 'text-amber-600 font-semibold' : 'text-red-500 font-semibold',
      tooltip: ttRendement(rendement, netTax, scenario === 'lmnpReel' ? annualChargesBase + accountingFees : annualChargesBase),
    },
    {
      label: cashflow >= 0 ? 'Cashflow mensuel net' : 'Effort d\'épargne mensuel',
      value: `${cashflow >= 0 ? '+' : ''}${fmt(cashflow)}`, bold: true,
      valueClass: cashflow >= 0 ? 'text-emerald-600' : 'text-red-600',
      tooltip: ttCashflow(cashflow, netTax, scenario === 'lmnpReel' ? annualChargesBase + accountingFees : annualChargesBase),
    },
  ]

  const mfRows        = makeRows('mf',        mf.imposable,       mf.netTax,        mf.rendement,        mf.cashflow,        'Imposable (abatt. 30 %)', `Impôt + PS (${tmi + PS_RATE} %)`)
  const reelNuRows    = makeRows('reelNu',     null,               reelNu.netTax,    reelNu.rendement,    reelNu.cashflow,    reelNu.deficit ? 'Déficit foncier' : 'Revenu net foncier', reelNu.deficit ? 'Aucun impôt foncier' : `Impôt + PS (${tmi + PS_RATE} %)`, reelNu)
  const lmnpMicroRows = makeRows('lmnpMicro',  lmnpMicro.imposable, lmnpMicro.netTax, lmnpMicro.rendement, lmnpMicro.cashflow, 'Imposable (abatt. 50 %)', `Impôt + PS (${tmi + PS_RATE} %)`)
  const lmnpReelRows  = makeRows('lmnpReel',   null,               lmnpReel.netTax,  lmnpReel.rendement,  lmnpReel.cashflow,  'Résultat comptable',       lmnpReel.netTax === 0 ? 'Aucun impôt (résultat nul)' : `Impôt + PS (${tmi + PS_RATE} %)`, { revenuNet: lmnpReel.resultat, deficit: false })

  const barData = [
    { name: 'Micro-foncier',       cashflow: Math.round(mf.cashflow),         fill: SCENARIO_COLORS.mf },
    { name: 'Réel nu (agence)',    cashflow: Math.round(reelNu.cashflow),      fill: SCENARIO_COLORS.reelNu },
    { name: 'Réel nu (P. à P.)',   cashflow: Math.round(reelNuP2P.cashflow),   fill: SCENARIO_COLORS.reelNuP2P },
    { name: 'LMNP micro-BIC',      cashflow: Math.round(lmnpMicro.cashflow),   fill: SCENARIO_COLORS.lmnpMicro },
    { name: 'LMNP réel',           cashflow: Math.round(lmnpReel.cashflow),    fill: SCENARIO_COLORS.lmnpReel },
  ]

  const BILAN_SCENARIOS = [
    { key: 'mf',        label: 'Micro-foncier',          color: SCENARIO_COLORS.mf },
    { key: 'reelNu',    label: 'Réel nu (avec agence)',   color: SCENARIO_COLORS.reelNu },
    { key: 'reelNuP2P', label: 'Réel nu (P. à P.)',       color: SCENARIO_COLORS.reelNuP2P, badge: 'Sans frais de gestion' },
    { key: 'lmnpMicro', label: 'LMNP micro-BIC',          color: SCENARIO_COLORS.lmnpMicro },
    { key: 'lmnpReel',  label: 'LMNP réel',               color: SCENARIO_COLORS.lmnpReel },
  ]

  return (
    <Section title="Investissement locatif" collapsible defaultOpen={false}>
      <p className="text-xs text-gray-400 -mt-2">Simulez la rentabilité d'un achat destiné à la location.</p>

      {/* ── Revenus ── */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Revenus locatifs</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <NumInput label="Loyer mensuel (€)" value={monthlyRent} onChange={onMonthlyRent} min={0} step={50} />
          <NumInput label="Taux de vacance (%)" value={vacancyRate} onChange={onVacancyRate} min={0} max={50} step={0.5} hint="Vide locatif estimé sur l'année" />
          <NumInput label="Frais de gestion (%)" value={gestionRate} onChange={onGestionRate} min={0} max={15} step={0.5} hint="Agence locative — % du loyer effectif" />
        </div>
      </div>

      {/* ── Charges ── */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Charges propriétaire</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <NumInput label="Taxe foncière (€/an)" value={taxeFonciere} onChange={setTaxeFonciere} min={0} step={50} hint="Entièrement à la charge du propriétaire" />
          <NumInput label="Charges copro (€/mois)" value={localCondoFees} onChange={setLocalCondoFees} min={0} step={10} hint="Part propriétaire non récupérable" />
          <NumInput label="Assurance PNO (€/an)" value={pnoInsurance} onChange={onPnoInsurance} min={0} step={50} hint="Propriétaire Non-Occupant — ~150 à 300 €/an" />
          <NumInput label="Entretien (€/an)" value={annualWorks} onChange={onAnnualWorks} min={0} step={100} hint="Réparations, petits travaux" />
        </div>
      </div>

      {/* ── LMNP & fiscalité ── */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">LMNP & fiscalité</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <NumInput label="Valeur mobilier (€)" value={furnitureVal} onChange={onFurnitureVal} min={0} step={500} hint="Amortissement sur 10 ans en LMNP réel" />
          <NumInput label="Frais de comptabilité (€/an)" value={accountingFees} onChange={onAccountingFees} min={0} step={100} hint="Obligatoire en LMNP réel — ~800 à 1 200 €/an" />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">GLI (loyers impayés)</label>
            <label className="flex items-center gap-2 cursor-pointer mt-1">
              <input type="checkbox" checked={gliEnabled} onChange={e => onGliEnabled(e.target.checked)} className="accent-indigo-600 w-4 h-4" />
              <span className="text-sm text-gray-600">{gliEnabled ? 'Activée' : 'Désactivée'}</span>
            </label>
            {gliEnabled && <NumInput label="Taux GLI (%/loyer)" value={gliRate} onChange={onGliRate} min={0.5} max={5} step={0.1} hint="Généralement entre 2 et 3,5 %" />}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Tranche marginale d'imposition</label>
            <select value={tmi} onChange={e => onTmi(Number(e.target.value))}
              className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition">
              {TMI_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {monthlyRent > 0 ? (
        <>
          {/* ── KPIs ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-indigo-50 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <p className="text-xs text-indigo-500 font-medium">Loyer annuel effectif</p>
                <InfoTooltip color="text-indigo-300">
                  <p className="font-semibold text-gray-300 mb-1.5">Loyer annuel effectif</p>
                  <TRow label="Loyer mensuel" value={fmt(monthlyRent)} />
                  <TRow label="× 12 mois" value={fmt(monthlyRent * 12)} />
                  {vacancyRate > 0 && <TRow label={`× (1 − ${vacancyRate} % vacance)`} value={`× ${(1 - vacancyRate / 100).toFixed(2)}`} />}
                  <TRow label="= Loyer effectif" value={fmt(annualEffectiveRent)} highlight />
                </InfoTooltip>
              </div>
              <p className="text-lg font-bold text-indigo-800">{fmt(annualEffectiveRent)}</p>
              <p className="text-xs text-indigo-400">{vacancyRate > 0 ? `Après ${vacancyRate} % de vacance` : 'Sans vacance locative'}</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <p className="text-xs text-gray-500 font-medium">Rendement brut</p>
                <InfoTooltip>
                  <p className="font-semibold text-gray-300 mb-1.5">Rendement brut</p>
                  <TRow label="Loyer annuel effectif" value={fmt(annualEffectiveRent)} />
                  <TRow label="÷ Coût acquisition" value={fmt(acquisitionCost)} />
                  <TRow label="= Rendement brut" value={fmtPct(rendementBrut)} highlight />
                </InfoTooltip>
              </div>
              <p className={`text-lg font-bold ${rendementBrut >= 6 ? 'text-emerald-600' : rendementBrut >= 4 ? 'text-amber-600' : 'text-red-500'}`}>{fmtPct(rendementBrut)}</p>
              <p className="text-xs text-gray-400">sur coût total d'acquisition</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <p className="text-xs text-gray-500 font-medium">Rendement net de charges</p>
                <InfoTooltip>
                  <p className="font-semibold text-gray-300 mb-1.5">Rendement net de charges</p>
                  <TRow label="Loyer annuel" value={`+ ${fmt(annualEffectiveRent)}`} />
                  {taxeFonciere   > 0 && <TRow label="− Taxe foncière"     value={fmt(taxeFonciere)} />}
                  {localCondoFees > 0 && <TRow label="− Charges copro"     value={fmt(localCondoFees * 12)} />}
                  {pnoInsurance   > 0 && <TRow label="− Assurance PNO"     value={fmt(pnoInsurance)} />}
                  {annualGLI      > 0 && <TRow label={`− GLI (${gliRate} %)`} value={fmt(annualGLI)} />}
                  {annualGestion  > 0 && <TRow label={`− Gestion (${gestionRate} %)`} value={fmt(annualGestion)} />}
                  {annualWorks    > 0 && <TRow label="− Entretien"          value={fmt(annualWorks)} />}
                  <TRow label="÷ Coût acquisition" value={fmt(acquisitionCost)} />
                  <TRow label="= Rendement net" value={fmtPct(rendementNetCharges)} highlight />
                </InfoTooltip>
              </div>
              <p className={`text-lg font-bold ${rendementNetCharges >= 4 ? 'text-emerald-600' : rendementNetCharges >= 2 ? 'text-amber-600' : 'text-red-500'}`}>{fmtPct(rendementNetCharges)}</p>
              <p className="text-xs text-gray-400">après TF, charges, GLI, entretien, gestion</p>
            </div>
          </div>

          {/* ── Cashflow brut ── */}
          <div className={`rounded-xl border px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${cashflowBrut >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
            <div>
              <p className="text-sm font-semibold text-gray-800">Cashflow mensuel avant impôts</p>
              <p className="text-xs text-gray-500">Loyer effectif − mensualité crédit − taxe foncière{gliEnabled ? ' − GLI' : ''}{gestionRate > 0 ? ' − gestion' : ''} − autres charges</p>
              <p className="text-xs text-gray-400">
                {fmt(annualEffectiveRent / 12)} − {fmt(annualMortgage / 12)} − {fmt(taxeFonciere / 12)}{gliEnabled ? ` − ${fmt(annualGLI / 12)}` : ''}{gestionRate > 0 ? ` − ${fmt(annualGestion / 12)}` : ''} − {fmt((annualChargesBase - taxeFonciere - annualGLI - annualGestion) / 12)}
              </p>
            </div>
            <p className={`text-2xl font-bold shrink-0 ${cashflowBrut >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {cashflowBrut >= 0 ? '+' : ''}{fmt(cashflowBrut)}
            </p>
          </div>

          {/* ── Scénarios fiscaux ── */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">Scénarios fiscaux (TMI {tmi} % + PS {PS_RATE} %)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <ScenarioCard title="Location nue — Micro-foncier" badge={!eligibleMicroFoncier ? { label: '> 15 000 €/an', cls: 'bg-red-100 text-red-700' } : null} rows={mfRows} color="border-gray-200" />
              <ScenarioCard
                title="Location nue — Régime réel" rows={reelNuRows} color="border-gray-200"
                taxSaving={reelNu.deficit ? { label: 'Réduction d\'impôt sur revenu global', annual: Math.abs(reelNu.netTax), hint: `Déficit de ${fmt(Math.abs(reelNu.revenuNet))} — jusqu'à 10 700 €/an déduit de vos autres revenus au taux de ${tmi} %. Solde reportable 10 ans.` } : null}
              />
              <ScenarioCard title="LMNP — Micro-BIC" badge={!eligibleMicroBIC ? { label: '> 77 700 €/an', cls: 'bg-red-100 text-red-700' } : null} rows={lmnpMicroRows} color="border-indigo-100" />
              <ScenarioCard
                title="LMNP — Régime réel" rows={lmnpReelRows} color="border-indigo-100"
                taxSaving={lmnpReel.netTax === 0 && lmnpReel.resultat <= 0 ? { label: 'Bouclier fiscal (amortissement)', annual: lmnpReel.amortBien + lmnpReel.amortMobilier, hint: `L'amortissement du bien (${fmt(lmnpReel.amortBien)}/an) neutralise la fiscalité. Déficit reportable sur BIC LMNP des années suivantes.` } : null}
                note={`Amort. bien : ${fmt(lmnpReel.amortBien)}/an${lmnpReel.amortMobilier > 0 ? ` + mobilier : ${fmt(lmnpReel.amortMobilier)}/an` : ''}${accountingFees > 0 ? ` + comptabilité : ${fmt(accountingFees)}/an` : ''} (simplifié)`}
              />
            </div>
          </div>

          {/* ── Loyer de rentabilité ── */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-700 mb-1">Loyer mensuel minimum pour être à l'équilibre (cashflow = 0)</p>
            <p className="text-xs text-gray-400 mb-3">En dessous de ce seuil, l'investissement coûte de l'argent chaque mois après impôts.</p>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                {
                  label: 'Micro-foncier', min: minRents.mf, color: SCENARIO_COLORS.mf,
                  tooltip: (() => {
                    const eff = minRents.mf * 12 * (1 - vacancyRate / 100)
                    const gli = gliEnabled ? eff * gliRate / 100 : 0
                    const gest = eff * gestionRate / 100
                    const tax = eff * 0.70 * (tmi / 100 + PS_RATE / 100)
                    return <>
                      <p className="font-semibold text-gray-300 mb-1.5">Loyer min — Micro-foncier</p>
                      <p className="text-gray-300 mb-1">Revenus :</p>
                      <TRow label="Loyer brut" value={fmt(minRents.mf)} />
                      {vacancyRate > 0 && <TRow label={`× (1 − ${vacancyRate} % vacance)`} value={fmt(eff / 12)} />}
                      <p className="text-gray-300 mt-1.5 mb-1">Sorties cash :</p>
                      <TRow label="Mensualité crédit" value={fmt(annualMortgage / 12)} />
                      {taxeFonciere   > 0 && <TRow label="Taxe foncière" value={fmt(taxeFonciere / 12)} />}
                      {localCondoFees > 0 && <TRow label="Charges copro" value={fmt(localCondoFees)} />}
                      {pnoInsurance   > 0 && <TRow label="Assurance PNO" value={fmt(pnoInsurance / 12)} />}
                      {annualWorks    > 0 && <TRow label="Entretien" value={fmt(annualWorks / 12)} />}
                      {gest           > 0 && <TRow label={`Frais gestion (${gestionRate} %)`} value={fmt(gest / 12)} />}
                      {gli            > 0 && <TRow label={`GLI (${gliRate} %)`} value={fmt(gli / 12)} />}
                      <TRow label={`Impôt (loyer × 70 % × ${tmi + PS_RATE} %)`} value={fmt(tax / 12)} />
                      <TRow label="= Balance (cashflow)" value="≈ 0 €" highlight />
                    </>
                  })(),
                },
                {
                  label: 'Réel nu (avec agence)', min: minRents.reelNu, color: SCENARIO_COLORS.reelNu,
                  tooltip: (() => {
                    const eff = minRents.reelNu * 12 * (1 - vacancyRate / 100)
                    const gli = gliEnabled ? eff * gliRate / 100 : 0
                    const gest = eff * gestionRate / 100
                    const deduct = year1Interest + year1Insurance + taxeFonciere + localCondoFees * 12 + gli + annualWorks + gest + pnoInsurance
                    const revNet = eff - deduct
                    const tax = revNet >= 0 ? revNet * (tmi / 100 + PS_RATE / 100) : -(Math.min(10700, Math.abs(revNet)) * tmi / 100)
                    return <>
                      <p className="font-semibold text-gray-300 mb-1.5">Loyer min — Réel nu (avec agence)</p>
                      <p className="text-gray-300 mb-1">Revenus :</p>
                      <TRow label={`Loyer brut`} value={fmt(minRents.reelNu)} />
                      {vacancyRate > 0 && <TRow label={`× (1 − ${vacancyRate} % vacance)`} value={fmt(eff / 12)} />}
                      <p className="text-gray-300 mt-1.5 mb-1">Sorties cash :</p>
                      <TRow label="Mensualité crédit" value={fmt(annualMortgage / 12)} />
                      {taxeFonciere   > 0 && <TRow label="Taxe foncière" value={fmt(taxeFonciere / 12)} />}
                      {localCondoFees > 0 && <TRow label="Charges copro" value={fmt(localCondoFees)} />}
                      {pnoInsurance   > 0 && <TRow label="Assurance PNO" value={fmt(pnoInsurance / 12)} />}
                      {annualWorks    > 0 && <TRow label="Entretien" value={fmt(annualWorks / 12)} />}
                      {gest           > 0 && <TRow label={`Frais gestion (${gestionRate} %)`} value={fmt(gest / 12)} />}
                      {gli            > 0 && <TRow label={`GLI (${gliRate} %)`} value={fmt(gli / 12)} />}
                      <TRow label={tax >= 0 ? 'Impôt sur revenu foncier' : 'Économie fiscale'} value={tax >= 0 ? fmt(tax / 12) : `− ${fmt(Math.abs(tax) / 12)}`} />
                      <TRow label="= Balance (cashflow)" value="≈ 0 €" highlight />
                    </>
                  })(),
                },
                {
                  label: 'Réel nu (P. à P.)', min: minRents.reelNuP2P, color: SCENARIO_COLORS.reelNuP2P,
                  tooltip: (() => {
                    const eff = minRents.reelNuP2P * 12 * (1 - vacancyRate / 100)
                    const gli = gliEnabled ? eff * gliRate / 100 : 0
                    const deduct = year1Interest + year1Insurance + taxeFonciere + localCondoFees * 12 + gli + annualWorks + pnoInsurance
                    const revNet = eff - deduct
                    const tax = revNet >= 0 ? revNet * (tmi / 100 + PS_RATE / 100) : -(Math.min(10700, Math.abs(revNet)) * tmi / 100)
                    return <>
                      <p className="font-semibold text-gray-300 mb-1.5">Loyer min — Réel nu P. à P.</p>
                      <p className="text-gray-300 mb-1">Revenus :</p>
                      <TRow label="Loyer brut" value={fmt(minRents.reelNuP2P)} />
                      {vacancyRate > 0 && <TRow label={`× (1 − ${vacancyRate} % vacance)`} value={fmt(eff / 12)} />}
                      <p className="text-gray-300 mt-1.5 mb-1">Sorties cash :</p>
                      <TRow label="Mensualité crédit" value={fmt(annualMortgage / 12)} />
                      {taxeFonciere   > 0 && <TRow label="Taxe foncière" value={fmt(taxeFonciere / 12)} />}
                      {localCondoFees > 0 && <TRow label="Charges copro" value={fmt(localCondoFees)} />}
                      {pnoInsurance   > 0 && <TRow label="Assurance PNO" value={fmt(pnoInsurance / 12)} />}
                      {annualWorks    > 0 && <TRow label="Entretien" value={fmt(annualWorks / 12)} />}
                      {gli            > 0 && <TRow label={`GLI (${gliRate} %)`} value={fmt(gli / 12)} />}
                      <TRow label={tax >= 0 ? 'Impôt sur revenu foncier' : 'Économie fiscale'} value={tax >= 0 ? fmt(tax / 12) : `− ${fmt(Math.abs(tax) / 12)}`} />
                      <TRow label="= Balance (cashflow)" value="≈ 0 €" highlight />
                    </>
                  })(),
                },
                {
                  label: 'LMNP micro-BIC', min: minRents.lmnpMicro, color: SCENARIO_COLORS.lmnpMicro,
                  tooltip: <>
                    <p className="font-semibold text-gray-300 mb-1.5">Loyer min — LMNP micro-BIC</p>
                    <p className="text-gray-400 mb-2 leading-relaxed">Loyer tel que cashflow = 0 après impôts.</p>
                    <p className="text-gray-300 mb-1">Sorties cash mensuelles :</p>
                    <TRow label="Mensualité crédit complète" value={fmt(annualMortgage / 12)} />
                    {taxeFonciere   > 0 && <TRow label="Taxe foncière" value={fmt(taxeFonciere / 12)} />}
                    {localCondoFees > 0 && <TRow label="Charges copro" value={fmt(localCondoFees)} />}
                    {pnoInsurance   > 0 && <TRow label="Assurance PNO" value={fmt(pnoInsurance / 12)} />}
                    {annualWorks    > 0 && <TRow label="Entretien" value={fmt(annualWorks / 12)} />}
                    <p className="text-gray-400 mt-1.5 leading-relaxed">+ Impôt = loyer × 50 % × {tmi + PS_RATE} % → abattement 50 % plus avantageux que micro-foncier (30 %) → seuil plus bas.</p>
                  </>,
                },
                {
                  label: 'LMNP réel', min: minRents.lmnpReel, color: SCENARIO_COLORS.lmnpReel,
                  tooltip: <>
                    <p className="font-semibold text-gray-300 mb-1.5">Loyer min — LMNP réel</p>
                    <p className="text-gray-400 mb-2 leading-relaxed">Loyer tel que cashflow = 0 après impôts.</p>
                    <p className="text-gray-300 mb-1">Sorties cash mensuelles :</p>
                    <TRow label="Mensualité crédit complète" value={fmt(annualMortgage / 12)} />
                    <p className="text-gray-500 text-[10px] -mt-0.5 mb-1">dont intérêts {fmt(year1Interest / 12)} + capital + assurance {fmt(year1Insurance / 12)}</p>
                    {taxeFonciere   > 0 && <TRow label="Taxe foncière" value={fmt(taxeFonciere / 12)} />}
                    {localCondoFees > 0 && <TRow label="Charges copro" value={fmt(localCondoFees)} />}
                    {pnoInsurance   > 0 && <TRow label="Assurance PNO" value={fmt(pnoInsurance / 12)} />}
                    {annualWorks    > 0 && <TRow label="Entretien" value={fmt(annualWorks / 12)} />}
                    {accountingFees > 0 && <TRow label="Comptabilité" value={fmt(accountingFees / 12)} />}
                    <p className="text-gray-400 mt-1.5 leading-relaxed">L'amortissement ({fmt(lmnpReel.amortBien / 12)}/mois) neutralise le résultat fiscal → souvent 0 impôt → seuil le plus bas.</p>
                  </>,
                },
              ].map(({ label, min, color, tooltip }) => {
                const diff = monthlyRent - min
                return (
                  <div key={label} className="bg-white rounded-lg border border-gray-200 p-3 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <p className="text-xs text-gray-500">{label}</p>
                      <CalcTooltip wide>{tooltip}</CalcTooltip>
                    </div>
                    <p className="text-base font-bold text-gray-900">{fmt(min)}<span className="text-xs font-normal text-gray-400">/mois</span></p>
                    <p className={`text-xs font-semibold mt-1 ${diff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {diff >= 0 ? `+ ${fmt(diff)} de marge` : `${fmt(Math.abs(diff))} manquant`}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Comparaison cashflow ── */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">Comparaison cashflow mensuel net par scénario</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `${v} €`} tick={{ fontSize: 11 }} width={60} />
                <RTooltip formatter={v => [`${v} €/mois`, 'Cashflow net']} />
                <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} />
                <Bar dataKey="cashflow" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, i) => <Cell key={i} fill={entry.cashflow >= 0 ? entry.fill : '#f87171'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── Projection cashflow ── */}
          {projectionData.length > 1 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1">Évolution du cashflow mensuel net sur la durée du crédit</p>
              <p className="text-xs text-gray-400 mb-3">La baisse des intérêts améliore le cashflow des régimes réels au fil du temps.</p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={projectionData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={Math.floor(projectionData.length / 8)} />
                  <YAxis tickFormatter={v => `${v} €`} tick={{ fontSize: 11 }} width={60} />
                  <RTooltip formatter={(v, name) => [`${v} €/mois`, name]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} />
                  {Object.entries(SCENARIO_COLORS).map(([key, color]) => (
                    <Line key={key} type="monotone" dataKey={SCENARIO_LABELS[key]} stroke={color} strokeWidth={key === 'reelNuP2P' ? 2 : 2} strokeDasharray={key === 'reelNuP2P' ? '5 3' : undefined} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── Bilan patrimonial ── */}
          {bilan && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1">Bilan patrimonial à {bilan.horizon} ans</p>
              <p className="text-xs text-gray-400 mb-3">Richesse nette créée : équité immobilière + cashflows cumulés − apport initial.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">Horizon d'analyse</label>
                  <div className="flex items-center gap-3">
                    <input type="range" min={1} max={Math.max(1, projectionData.length)} value={bilanHorizon}
                      onChange={e => setBilanHorizon(Number(e.target.value))} className="flex-1 accent-indigo-600" />
                    <span className="text-sm font-semibold text-indigo-700 w-12 text-right">{bilanHorizon} ans</span>
                  </div>
                </div>
                <NumInput label="Appréciation annuelle du bien (%)" value={bilanApprec} onChange={setBilanApprec} min={-5} max={15} step={0.5}
                  hint={`Valeur estimée dans ${bilan.horizon} ans : ${fmt(bilan.propValueN)}`} />
              </div>

              <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-2.5 mb-3 text-xs text-indigo-700 flex flex-wrap gap-x-6 gap-y-1">
                <span>Apport initial : <strong>{fmt(bilan.initialOut)}</strong></span>
                <span>Valeur du bien : <strong>{fmt(bilan.propValueN)}</strong></span>
                <span>Capital restant dû : <strong>{fmt(bilan.debtN)}</strong></span>
                <span>Équité nette : <strong>{fmt(bilan.propValueN - bilan.debtN)}</strong></span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left px-3 py-2 text-gray-600 font-semibold">Scénario</th>
                      <th className="text-right px-3 py-2 text-gray-600 font-semibold">Cashflow cumulé</th>
                      <th className="text-right px-3 py-2 text-gray-600 font-semibold">Patrimoine net</th>
                      <th className="text-right px-3 py-2 text-gray-600 font-semibold">Gain net</th>
                      <th className="text-right px-3 py-2 text-gray-600 font-semibold">CAGR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {BILAN_SCENARIOS.map(({ key, label, color, badge }) => {
                      const b = bilan[key]
                      const best = Math.max(...BILAN_SCENARIOS.map(s => bilan[s.key].netGain))
                      const isBest = b.netGain === best
                      return (
                        <tr key={key} className={`border-t border-gray-100 ${isBest ? 'bg-emerald-50' : ''}`}>
                          <td className="px-3 py-2.5 font-semibold flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                            {label}
                            {isBest && <span className="text-emerald-600 text-[10px] font-bold">★ meilleur</span>}
                          {badge && <span className="text-orange-500 text-[10px]">{badge}</span>}
                          </td>
                          <td className={`px-3 py-2.5 text-right font-medium ${b.cumCashflow >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {b.cumCashflow >= 0 ? '+' : ''}{fmt(b.cumCashflow)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-medium text-gray-900">{fmt(b.totalWealth)}</td>
                          <td className={`px-3 py-2.5 text-right font-bold ${b.netGain >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {b.netGain >= 0 ? '+' : ''}{fmt(b.netGain)}
                          </td>
                          <td className={`px-3 py-2.5 text-right font-semibold ${b.cagr != null && b.cagr >= 0 ? 'text-indigo-600' : 'text-red-500'}`}>
                            {b.cagr != null ? `${b.cagr >= 0 ? '+' : ''}${b.cagr.toFixed(1)} %/an` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Cashflow cumulé = somme des cashflows nets annuels sur {bilan.horizon} ans. Patrimoine net = équité + cashflows positifs cumulés. CAGR = rendement annualisé sur le capital investi total.
              </p>
            </div>
          )}

          {/* ── Disclaimer ── */}
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5 leading-relaxed">
            ⚠️ <strong>Simulation simplifiée à titre indicatif.</strong> Les calculs fiscaux utilisent la TMI saisie et les prélèvements sociaux (17,2 %). LMNP réel : amortissement linéaire simplifié (85 % du bien sur 30 ans, mobilier sur 10 ans). Intérêts et loyers supposés constants sur l'horizon du bilan. Pour une analyse précise, consultez un expert-comptable ou un conseiller en gestion de patrimoine.
          </p>
        </>
      ) : (
        <p className="text-sm text-gray-400 text-center py-4">Saisissez un loyer mensuel pour lancer la simulation.</p>
      )}
    </Section>
  )
}
