import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SalaryContractPage from '../../../components/income/SalaryContractPage'
import {
  getSalaryContracts, createSalaryContract,
  updateSalaryContract, deleteSalaryContract,
  getBonuses, getBenefits, getOnCalls,
} from '../../../api/income'

vi.mock('../../../api/income', () => ({
  getSalaryContracts:    vi.fn(),
  createSalaryContract:  vi.fn(),
  updateSalaryContract:  vi.fn(),
  deleteSalaryContract:  vi.fn(),
  getBonuses:            vi.fn(),
  getBenefits:           vi.fn(),
  getOnCalls:            vi.fn(),
  getMonthlyPaySlips:    vi.fn(),
  getSalaryRevisions:    vi.fn(),
  getOtherIncomes:       vi.fn(),
}))

vi.mock('../../../components/income/SalaryContractForm', () => ({
  default: ({ contract, onSubmit, onCancel }) => (
    <div data-testid="contract-form">
      <span data-testid="form-mode">{contract?.id ? 'edit' : 'create'}</span>
      <button data-testid="form-submit"
        onClick={() => onSubmit({ companyName: 'ACME', annualGrossSalary: 45000, paidMonthsPerYear: 12, weeklyHours: 35, mealVoucherAmount: 9, mealVoucherEmployeeRate: 50, isCadre: false })}>
        Soumettre
      </button>
      <button data-testid="form-cancel" onClick={onCancel}>Annuler</button>
    </div>
  ),
}))

vi.mock('../../../components/income/ProjectionGrid',  () => ({ default: () => <div data-testid="projection-grid" /> }))
vi.mock('../../../components/income/PaySlipPanel',    () => ({ default: () => <div data-testid="payslip-panel" /> }))
vi.mock('../../../components/income/BonusPanel',      () => ({ default: () => <div data-testid="bonus-panel" /> }))
vi.mock('../../../components/income/BenefitPanel',    () => ({ default: () => <div data-testid="benefit-panel" /> }))
vi.mock('../../../components/income/RevisionPanel',   () => ({ default: () => <div data-testid="revision-panel" /> }))
vi.mock('../../../components/income/OnCallPanel',     () => ({ default: () => <div data-testid="oncall-panel" /> }))

const CONTRACT = {
  id: 1,
  companyName: 'ACME Corp',
  annualGrossSalary: 45000,
  baseGrossSalary: 3750,
  paidMonthsPerYear: 12,
  weeklyHours: 35,
  mealVoucherAmount: 9,
  mealVoucherEmployeeRate: 50,
  isCadre: false,
  endDate: null,
  monthlyNetAfterTax: 2800,
}

function mockAll(contracts = [CONTRACT]) {
  getSalaryContracts.mockResolvedValue(contracts)
  getBonuses.mockResolvedValue([])
  getBenefits.mockResolvedValue([])
  getOnCalls.mockResolvedValue([])
}

describe('SalaryContractPage', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── États de chargement ───────────────────────────────────────────────────

  it('affiche "Chargement…" pendant le fetch', () => {
    getSalaryContracts.mockReturnValue(new Promise(() => {}))
    render(<SalaryContractPage />)
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })

  it("affiche le message d'erreur si l'API échoue", async () => {
    getSalaryContracts.mockRejectedValue(new Error('network'))
    render(<SalaryContractPage />)
    await waitFor(() => {
      expect(screen.getByText('Impossible de charger les contrats.')).toBeInTheDocument()
    })
  })

  it('affiche "Aucun contrat salarial" quand la liste est vide', async () => {
    mockAll([])
    render(<SalaryContractPage />)
    await waitFor(() => {
      expect(screen.getByText(/Aucun contrat salarial/)).toBeInTheDocument()
    })
  })

  // ── Affichage du contrat actif ────────────────────────────────────────────

  it('affiche le nom de l\'entreprise du contrat actif', async () => {
    mockAll()
    render(<SalaryContractPage />)
    await waitFor(() => {
      expect(screen.getByText('ACME Corp')).toBeInTheDocument()
    })
  })

  it('sélectionne automatiquement le contrat actif (endDate = null)', async () => {
    mockAll()
    render(<SalaryContractPage />)
    await waitFor(() => {
      expect(screen.getByTestId('projection-grid')).toBeInTheDocument()
    })
  })

  // ── Formulaire ────────────────────────────────────────────────────────────

  it('ouvre le formulaire de création au clic sur "+ Nouveau contrat"', async () => {
    mockAll([])
    render(<SalaryContractPage />)
    await waitFor(() => expect(screen.getByRole('button', { name: /Nouveau contrat/ })).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /Nouveau contrat/ }))
    expect(screen.getByTestId('contract-form')).toBeInTheDocument()
    expect(screen.getByTestId('form-mode')).toHaveTextContent('create')
  })

  it('ouvre le formulaire d\'édition au clic sur "Modifier"', async () => {
    mockAll()
    render(<SalaryContractPage />)
    await waitFor(() => expect(screen.getByText('Modifier')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Modifier'))
    expect(screen.getByTestId('contract-form')).toBeInTheDocument()
    expect(screen.getByTestId('form-mode')).toHaveTextContent('edit')
  })

  it('ferme le formulaire au clic sur Annuler', async () => {
    mockAll([])
    render(<SalaryContractPage />)
    await waitFor(() => expect(screen.getByRole('button', { name: /Nouveau contrat/ })).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /Nouveau contrat/ }))
    fireEvent.click(screen.getByTestId('form-cancel'))
    expect(screen.queryByTestId('contract-form')).not.toBeInTheDocument()
  })

  // ── Création ──────────────────────────────────────────────────────────────

  it('crée un contrat et le sélectionne', async () => {
    mockAll([])
    const created = { ...CONTRACT, id: 10, companyName: 'ACME' }
    createSalaryContract.mockResolvedValue(created)
    getBonuses.mockResolvedValue([])
    getBenefits.mockResolvedValue([])
    getOnCalls.mockResolvedValue([])

    render(<SalaryContractPage />)
    await waitFor(() => expect(screen.getByRole('button', { name: /Nouveau contrat/ })).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /Nouveau contrat/ }))
    fireEvent.click(screen.getByTestId('form-submit'))

    await waitFor(() => {
      expect(createSalaryContract).toHaveBeenCalledTimes(1)
    })
  })

  // ── Panels ────────────────────────────────────────────────────────────────

  it('charge les bonus, avantages et astreintes au changement de contrat', async () => {
    mockAll()
    render(<SalaryContractPage />)
    await waitFor(() => {
      expect(getBonuses).toHaveBeenCalledWith(CONTRACT.id)
      expect(getBenefits).toHaveBeenCalledWith(CONTRACT.id)
      expect(getOnCalls).toHaveBeenCalledWith(CONTRACT.id)
    })
  })

  // ── Suppression ───────────────────────────────────────────────────────────

  it('ouvre la DeleteConfirmModal au clic sur "Supprimer"', async () => {
    mockAll()
    render(<SalaryContractPage />)
    await waitFor(() => expect(screen.getByText('Supprimer')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Supprimer'))
    expect(screen.getByText('Supprimer définitivement')).toBeInTheDocument()
  })

  it('appelle deleteSalaryContract après confirmation', async () => {
    mockAll()
    deleteSalaryContract.mockResolvedValue()

    render(<SalaryContractPage />)
    await waitFor(() => expect(screen.getByText('Supprimer')).toBeInTheDocument())

    // Préparer le refetch post-suppression
    getSalaryContracts.mockResolvedValue([])

    fireEvent.click(screen.getByText('Supprimer'))
    fireEvent.click(screen.getByText('Supprimer définitivement'))

    await waitFor(() => {
      expect(deleteSalaryContract).toHaveBeenCalledWith(CONTRACT.id)
    })
  })
})
