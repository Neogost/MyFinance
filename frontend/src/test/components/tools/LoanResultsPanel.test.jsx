import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import LoanResultsPanel from '../../../components/tools/LoanResultsPanel'

// AmortizationTable : mock minimal qui conserve le bouton toggle
vi.mock('../../../components/tools/AmortizationTable', () => ({
  default: ({ showTable, setShowTable }) => (
    <div>
      <button onClick={() => setShowTable(!showTable)}>
        Tableau d'amortissement <span>{showTable ? '▲' : '▼'}</span>
      </button>
      {showTable && <div data-testid="amortization-table" />}
    </div>
  ),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const AMORTIZATION = {
  monthlyPrincipal: 850,
  monthlyInsurance: 50,
  actualMonths: 240,
  annualSummary: [],
}

const BASE_CALC = {
  amortization: AMORTIZATION,
  totalCreditCost: 61200,
  totalProjectCost: 311200,
  totalInterest: 42000,
  totalInsurance: 14400,
  totalPrepayments: 0,
  totalFees: 4800,
  acquisitionCost: 250000,
  ptzMonthlyPayment: 0,
  totalMonthlyAfterDeferral: 900,
  totalMonthlyCost: 900,
  monthlyPropertyTax: 0,
  debtRatio: 30,
  maxLoanCapacity: 0,
  pricePerSqm: 0,
  taeg: 3.85,
  requiredContrib: 30000,
  contribGap: 0,
  comparison: null,
  resale: { netProceeds: 0, plusValue: 0, remainingCapital: 150000, agencyFeesAmt: 0 },
  rentVsBuy: { buyTotalCost: 0, rentTotalCost: 0, buyNetWealth: 0, rentNetWealth: 0, rentWins: false, horizon: 20, yearlyData: [] },
  donutData: [],
  capitalChartData: [],
  breakdownChartData: [],
  notaryFees: 0,
  agencyFeesAmt: 0,
  dossierFeesAmt: 0,
  guaranteeFeesAmt: 0,
  brokerageFeesAmt: 0,
}

const BASE_LOAN = {
  loanAmount: 200000, loanDuration: 20, annualRate: 3.5,
  ptzEnabled: false, ptzAmount: 0,
  insuranceBase: 'initial',
  condoFees: 0,
  monthlyIncome: 3000,
  participants: [{ id: 1, name: 'Emprunteur 1', percent: 100 }],
  percentBalanced: true,
  requiredContrib: 30000,
  hasRepayments: false,
}

const BASE_SCENARIOS = {
  showComparison: false, showResale: false, showRentComparison: false,
  resaleYear: 10, resalePrice: 0, propertyAppreciation: 2, resaleAgencyFeesPct: 5,
  monthlyRent: 1200, rentIncreaseRate: 2, investmentReturnRate: 5,
  compDuration: 25, compRate: 3.0,
}

function makeTableState() {
  return {
    showTable: false, setShowTable: vi.fn(),
    showMonthly: false, setShowMonthly: vi.fn(),
    tableMaxHeight: 400,
    tableBodyRef: { current: null },
  }
}

function renderPanel(overrides = {}) {
  return render(
    <LoanResultsPanel
      calc={{ ...BASE_CALC, ...overrides.calc }}
      loan={{ ...BASE_LOAN, ...overrides.loan }}
      scenarios={{ ...BASE_SCENARIOS, ...overrides.scenarios }}
      tableState={makeTableState()}
    />
  )
}

describe('LoanResultsPanel', () => {

  // ── KPIs principaux ───────────────────────────────────────

  it('affiche la mensualité principale', () => {
    renderPanel()
    expect(screen.getByText('Mensualité principale')).toBeInTheDocument()
  })

  it('affiche le taux d\'endettement', () => {
    renderPanel()
    expect(screen.getByText('Taux d\'endettement')).toBeInTheDocument()
    expect(screen.getByText(/30,00/)).toBeInTheDocument()
  })

  it('affiche le coût total du crédit', () => {
    renderPanel()
    expect(screen.getByText('Coût total du crédit')).toBeInTheDocument()
  })

  it('affiche le coût total du projet', () => {
    renderPanel()
    expect(screen.getByText('Coût total du projet')).toBeInTheDocument()
  })

  it('affiche le TAEG', () => {
    renderPanel()
    expect(screen.getByText('TAEG estimé')).toBeInTheDocument()
    expect(screen.getByText(/3,85/)).toBeInTheDocument()
  })

  // ── Couleur du taux d'endettement ─────────────────────────

  it('affiche en vert si taux d\'endettement ≤ 33 %', () => {
    renderPanel({ calc: { ...BASE_CALC, debtRatio: 25 } })
    expect(screen.getByText(/✓ Sous le seuil HCSF/)).toBeInTheDocument()
  })

  it('affiche en orange si taux d\'endettement entre 33 % et 35 %', () => {
    renderPanel({ calc: { ...BASE_CALC, debtRatio: 34 } })
    expect(screen.getByText(/Proche du seuil HCSF/)).toBeInTheDocument()
  })

  it('affiche en rouge si taux d\'endettement > 35 %', () => {
    renderPanel({ calc: { ...BASE_CALC, debtRatio: 38 } })
    expect(screen.getByText(/⚠ Dépasse le seuil HCSF/)).toBeInTheDocument()
  })

  // ── Section PTZ ───────────────────────────────────────────

  it('affiche la mensualité PTZ si ptzEnabled et ptzMonthlyPayment > 0', () => {
    renderPanel({
      loan: { ...BASE_LOAN, ptzEnabled: true, ptzAmount: 30000 },
      calc: { ...BASE_CALC, ptzMonthlyPayment: 150, totalMonthlyAfterDeferral: 1050 },
    })
    expect(screen.getByText(/\+ PTZ/)).toBeInTheDocument()
  })

  // ── Tableau d'amortissement ───────────────────────────────

  it('affiche le bouton pour afficher le tableau d\'amortissement', () => {
    renderPanel()
    expect(screen.getByText(/Tableau d'amortissement/)).toBeInTheDocument()
  })

  it('affiche le tableau d\'amortissement au clic', () => {
    const tableState = makeTableState()
    render(
      <LoanResultsPanel
        calc={BASE_CALC} loan={BASE_LOAN} scenarios={BASE_SCENARIOS}
        tableState={{ ...tableState, showTable: false }}
      />
    )
    fireEvent.click(screen.getByText(/Tableau d'amortissement/))
    expect(tableState.setShowTable).toHaveBeenCalledWith(true)
  })

  // ── Section comparaison ───────────────────────────────────

  it('n\'affiche pas la section comparaison si showComparison=false', () => {
    renderPanel()
    expect(screen.queryByText('Scénario alternatif')).not.toBeInTheDocument()
  })

  it('affiche la section comparaison si showComparison=true', () => {
    const comparison = {
      monthlyTotal: 950, monthlyPrincipal: 900, monthlyInsurance: 50,
      totalInterest: 48000, totalInsurance: 15000, totalCreditCost: 68200,
      debtRatio: 32, taeg: 3.9,
    }
    renderPanel({
      scenarios: { ...BASE_SCENARIOS, showComparison: true, compDuration: 25, compRate: 3.0 },
      calc: { ...BASE_CALC, comparison },
    })
    expect(screen.getByText('Comparaison de scénarios')).toBeInTheDocument()
  })

  // ── Section revente ───────────────────────────────────────

  it('n\'affiche pas la section revente si showResale=false', () => {
    renderPanel()
    expect(screen.queryByText('Simulation de revente')).not.toBeInTheDocument()
  })

  it('affiche la section revente si showResale=true', () => {
    renderPanel({ scenarios: { ...BASE_SCENARIOS, showResale: true } })
    expect(screen.getByText(/Simulation de revente/)).toBeInTheDocument()
  })

  // ── Section Louer vs Acheter ──────────────────────────────

  it('n\'affiche pas Louer vs Acheter si showRentComparison=false', () => {
    renderPanel()
    expect(screen.queryByText(/Louer vs Acheter/)).not.toBeInTheDocument()
  })

  it('affiche Louer vs Acheter si showRentComparison=true', () => {
    renderPanel({ scenarios: { ...BASE_SCENARIOS, showRentComparison: true } })
    expect(screen.getByText(/Louer vs Acheter/)).toBeInTheDocument()
  })
})
