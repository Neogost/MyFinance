import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import TaxSimulatorPage from '../../../components/tools/TaxSimulatorPage'
import { getOtherIncomes } from '../../../api/income'
import { simulateTax } from '../../../api/tools'

vi.mock('../../../api/income', () => ({
  getOtherIncomes: vi.fn(),
  getSalaryContracts: vi.fn(),
}))

vi.mock('../../../api/tools', () => ({
  simulateTax: vi.fn(),
}))

const INCOMES = [
  { id: 1, type: 'LOCATIF', label: 'Loyer T2', amount: 800,
    date: `${new Date().getFullYear()}-03-01`, isTaxable: true, specificTaxRate: null },
  { id: 2, type: 'DIVIDENDE', label: 'Dividendes', amount: 200,
    date: `${new Date().getFullYear()}-06-01`, isTaxable: true, specificTaxRate: 30 },
]

const TAX_RESULT = {
  year: new Date().getFullYear(),
  salaryIncomeSource: 'PROJECTION_CONTRAT',
  salaryIncome: 36000,
  otherIncomeInBareme: 800,
  otherIncomeSeparatelyTaxed: 200,
  separateTaxAmount: 60,
  grossTaxableIncome: 36800,
  professionalDeduction: 3680,
  deductionType: 'ABATTEMENT_FORFAITAIRE',
  netTaxableIncome: 33120,
  fiscalParts: 1.0,
  baremeEstimatedTax: 2800,
  totalEstimatedTax: 2860,
  effectiveTaxRate: 7.77,
}

describe('TaxSimulatorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getOtherIncomes.mockResolvedValue([])
    simulateTax.mockResolvedValue(TAX_RESULT)
  })

  // ── Rendu initial ─────────────────────────────────────────────────────────

  it('affiche le titre "Simulateur des impôts"', () => {
    render(<TaxSimulatorPage />)
    expect(screen.getByText('Simulateur des impôts')).toBeInTheDocument()
  })

  it('affiche les deux sources de revenus salariaux', () => {
    render(<TaxSimulatorPage />)
    expect(screen.getByText('Projection du contrat salarial')).toBeInTheDocument()
    expect(screen.getByText('Bulletins de paie réels')).toBeInTheDocument()
  })

  it('affiche le bouton "Simuler"', () => {
    render(<TaxSimulatorPage />)
    expect(screen.getByRole('button', { name: /Simuler/i })).toBeInTheDocument()
  })

  it('charge les revenus complémentaires au montage', async () => {
    getOtherIncomes.mockResolvedValue(INCOMES)
    render(<TaxSimulatorPage />)
    await waitFor(() => {
      expect(getOtherIncomes).toHaveBeenCalledTimes(1)
    })
  })

  // ── Affichage des revenus complémentaires ─────────────────────────────────

  it('affiche les revenus imposables de l\'année courante dans la liste', async () => {
    getOtherIncomes.mockResolvedValue(INCOMES)
    render(<TaxSimulatorPage />)
    await waitFor(() => {
      expect(screen.getByText('Loyer T2')).toBeInTheDocument()
    })
  })

  // ── Simulation ────────────────────────────────────────────────────────────

  it('appelle simulateTax au clic sur "Simuler"', async () => {
    render(<TaxSimulatorPage />)
    fireEvent.click(screen.getByRole('button', { name: /Simuler/i }))
    await waitFor(() => {
      expect(simulateTax).toHaveBeenCalledTimes(1)
    })
  })

  it('affiche le résultat après simulation réussie', async () => {
    render(<TaxSimulatorPage />)
    fireEvent.click(screen.getByRole('button', { name: /Simuler/i }))
    await waitFor(() => {
      expect(screen.getByText(/Impôt total estimé/i)).toBeInTheDocument()
    })
  })

  it('affiche le taux effectif dans le résultat', async () => {
    render(<TaxSimulatorPage />)
    fireEvent.click(screen.getByRole('button', { name: /Simuler/i }))
    await waitFor(() => {
      expect(screen.getByText("Taux effectif d'imposition")).toBeInTheDocument()
    })
  })

  it("affiche un message d'erreur si la simulation échoue", async () => {
    simulateTax.mockRejectedValue({
      response: { data: { message: 'Profil fiscal incomplet.' } }
    })
    render(<TaxSimulatorPage />)
    fireEvent.click(screen.getByRole('button', { name: /Simuler/i }))
    await waitFor(() => {
      expect(screen.getByText(/Profil fiscal incomplet\./)).toBeInTheDocument()
    })
  })

  it('affiche "Chargement…" pendant la simulation', async () => {
    simulateTax.mockReturnValue(new Promise(() => {}))
    render(<TaxSimulatorPage />)
    fireEvent.click(screen.getByRole('button', { name: /Simuler/i }))
    expect(screen.getByText(/Chargement|Simulation/i)).toBeInTheDocument()
  })

  // ── Paramètres ────────────────────────────────────────────────────────────

  it('transmet salarySource dans l\'appel simulateTax', async () => {
    render(<TaxSimulatorPage />)

    const radioReal = screen.getByLabelText(/Bulletins de paie réels/)
    fireEvent.click(radioReal)

    fireEvent.click(screen.getByRole('button', { name: /Simuler/i }))

    await waitFor(() => {
      expect(simulateTax).toHaveBeenCalledWith(
        expect.objectContaining({ salarySource: 'BULLETINS_REELS' })
      )
    })
  })

  it('transmet les ids des revenus cochés dans l\'appel simulateTax', async () => {
    getOtherIncomes.mockResolvedValue(INCOMES)
    render(<TaxSimulatorPage />)

    await waitFor(() => expect(screen.getByText('Loyer T2')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /Simuler/i }))

    await waitFor(() => {
      expect(simulateTax).toHaveBeenCalledWith(
        expect.objectContaining({ includedIncomes: expect.any(Array) })
      )
    })
  })
})
