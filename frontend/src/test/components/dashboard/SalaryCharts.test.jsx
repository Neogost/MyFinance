import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import SalaryEvolutionChart from '../../../components/dashboard/SalaryEvolutionChart'
import SalaryAnnualBarChart from '../../../components/dashboard/SalaryAnnualBarChart'
import { getSalaryEvolution } from '../../../api/dashboard'
import { getSalaryContracts, getRevisions } from '../../../api/income'

vi.mock('../../../api/dashboard', () => ({ getSalaryEvolution: vi.fn() }))
vi.mock('../../../api/income', () => ({
  getSalaryContracts: vi.fn(),
  getRevisions:       vi.fn(),
}))

const SALARY_POINTS = [
  { period: '2024-01-01', grossSalary: 3750, taxableNetSalary: 3100, netSalary: 2800, incomeTaxWithholding: 280, companyName: 'ACME' },
  { period: '2024-02-01', grossSalary: 3750, taxableNetSalary: 3100, netSalary: 2800, incomeTaxWithholding: 280, companyName: 'ACME' },
]

const CONTRACT = {
  id: 1,
  companyName: 'ACME',
  startDate: '2023-01-01',
  endDate: null,
  baseGrossSalary: 45000,
  annualGrossSalary: 45000,
  paidMonthsPerYear: 12,
  annualNetImposable: null,
  annualNetAfterTax: null,
}

// ── SalaryEvolutionChart ───────────────────────────────────────────────────────

describe('SalaryEvolutionChart', () => {
  beforeEach(() => vi.clearAllMocks())

  it('affiche "Chargement…" pendant le fetch', () => {
    getSalaryEvolution.mockReturnValue(new Promise(() => {}))
    render(<SalaryEvolutionChart />)
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })

  it("affiche une erreur si l'API échoue", async () => {
    getSalaryEvolution.mockRejectedValue(new Error('network'))
    render(<SalaryEvolutionChart />)
    await waitFor(() => {
      expect(screen.getByText(/Impossible de charger/)).toBeInTheDocument()
    })
  })

  it('appelle onHasData(false) et ne rend rien quand la liste est vide', async () => {
    getSalaryEvolution.mockResolvedValue([])
    const onHasData = vi.fn()
    const { container } = render(<SalaryEvolutionChart onHasData={onHasData} />)
    await waitFor(() => expect(onHasData).toHaveBeenCalledWith(false))
    expect(container.firstChild).toBeNull()
  })

  it('n\'affiche pas l\'état vide quand des données sont présentes', async () => {
    getSalaryEvolution.mockResolvedValue(SALARY_POINTS)
    render(<SalaryEvolutionChart />)
    await waitFor(() => {
      expect(screen.queryByText(/Aucun bulletin de paie/)).not.toBeInTheDocument()
      expect(screen.queryByText('Chargement…')).not.toBeInTheDocument()
    })
  })
})

// ── SalaryAnnualBarChart ───────────────────────────────────────────────────────

describe('SalaryAnnualBarChart', () => {
  beforeEach(() => vi.clearAllMocks())

  it('affiche "Chargement…" pendant le fetch', () => {
    getSalaryContracts.mockReturnValue(new Promise(() => {}))
    render(<SalaryAnnualBarChart />)
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })

  it("affiche une erreur si l'API échoue", async () => {
    getSalaryContracts.mockRejectedValue(new Error('network'))
    render(<SalaryAnnualBarChart />)
    await waitFor(() => {
      expect(screen.getByText(/Impossible de charger/)).toBeInTheDocument()
    })
  })

  it('affiche "Aucun contrat salarial" quand la liste est vide', async () => {
    getSalaryContracts.mockResolvedValue([])
    render(<SalaryAnnualBarChart />)
    await waitFor(() => {
      expect(screen.getByText(/Aucun contrat salarial saisi/)).toBeInTheDocument()
    })
  })

  it('n\'affiche pas l\'état vide quand un contrat existe', async () => {
    getSalaryContracts.mockResolvedValue([CONTRACT])
    getRevisions.mockResolvedValue([])
    render(<SalaryAnnualBarChart />)
    await waitFor(() => {
      expect(screen.queryByText(/Aucun contrat salarial/)).not.toBeInTheDocument()
      expect(screen.queryByText('Chargement…')).not.toBeInTheDocument()
    })
  })
})
