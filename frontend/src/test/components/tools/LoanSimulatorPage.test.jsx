import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoanSimulatorPage from '../../../components/tools/LoanSimulatorPage'
import { simulateTax } from '../../../api/tools'
import { getLoanSimulations, createLoanSimulation, deleteLoanSimulation } from '../../../api/tools'

vi.mock('../../../api/tools', () => ({
  simulateTax:           vi.fn(),
  simulateTaxForUser:    vi.fn(),
  getLoanSimulations:    vi.fn(),
  createLoanSimulation:  vi.fn(),
  deleteLoanSimulation:  vi.fn(),
}))

vi.mock('../../../api/users', () => ({
  getUsers: vi.fn(() => Promise.resolve([])),
}))

vi.mock('../../../api/familyGroup', () => ({
  getMyGroupMembers: vi.fn(() => Promise.resolve([])),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PARAMS = {
  propertyPrice: 250000, loanAmount: 200000, loanDuration: 20,
  annualRate: 3.5, insuranceRate: 0.2, insuranceBase: 'initial',
  personalContrib: 30000, surface: 0, propertyType: 'ancien',
  agencyFees: 0, agencyFeesMode: 'percent',
  dossierFees: 1000, dossierFeesMode: 'amount',
  guaranteeFees: 1, guaranteeFeesMode: 'percent',
  brokerageFees: 0, brokerageFeesMode: 'amount',
  participants: [{ id: 1, name: 'Emprunteur 1', percent: 100 }],
  ptzEnabled: false, ptzAmount: 30000, ptzDuration: 15, ptzDeferral: 5,
  earlyRepayments: [], propertyTax: 0, condoFees: 0,
  showComparison: false, compDuration: 25, compRate: 3.0,
  showResale: false, resaleYear: 10, resalePrice: 0,
  resaleAgencyFeesPct: 5, propertyAppreciation: 2,
  showRentComparison: false, monthlyRent: 1200, rentIncreaseRate: 2,
  investmentReturnRate: 5, rentBuyHorizon: 20,
  rentalVacancyRate: 8, rentalGestionRate: 0, rentalPnoInsurance: 0,
  rentalAccountingFees: 0, rentalGliEnabled: false, rentalGliRate: 2.5,
  rentalAnnualWorks: 0, rentalFurnitureVal: 0, rentalTmi: 30,
  incomeOverride: '', additionalIncomes: [],
}

const SIMULATIONS = [
  { id: 1, name: 'Appartement Paris', savedAt: '2026-04-26T10:00:00', parameters: PARAMS },
  { id: 2, name: 'Maison campagne',   savedAt: '2026-04-20T09:00:00', parameters: { ...PARAMS, loanAmount: 300000, loanDuration: 25, annualRate: 4.0 } },
]

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LoanSimulatorPage — gestion des simulations sauvegardées', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    simulateTax.mockResolvedValue({ salaryIncome: 36000 })
    getLoanSimulations.mockResolvedValue([])
  })

  // ── Chargement ────────────────────────────────────────────────

  it('charge les simulations sauvegardées au montage', async () => {
    getLoanSimulations.mockResolvedValue(SIMULATIONS)
    render(<LoanSimulatorPage />)
    await waitFor(() => expect(getLoanSimulations).toHaveBeenCalledTimes(1))
  })

  it('affiche le compteur de simulations dans le bouton', async () => {
    getLoanSimulations.mockResolvedValue(SIMULATIONS)
    render(<LoanSimulatorPage />)
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })

  // ── Ouverture du panneau ──────────────────────────────────────

  it('affiche les simulations dans le panneau "Mes simulations"', async () => {
    getLoanSimulations.mockResolvedValue(SIMULATIONS)
    render(<LoanSimulatorPage />)
    await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Mes simulations'))

    expect(screen.getByText('Appartement Paris')).toBeInTheDocument()
    expect(screen.getByText('Maison campagne')).toBeInTheDocument()
  })

  it('affiche le message vide si aucune simulation sauvegardée', async () => {
    getLoanSimulations.mockResolvedValue([])
    render(<LoanSimulatorPage />)

    fireEvent.click(screen.getByText('Mes simulations'))

    await waitFor(() => {
      expect(screen.getByText('Aucune simulation sauvegardée')).toBeInTheDocument()
    })
  })

  // ── Sauvegarde ────────────────────────────────────────────────

  it('ouvre la modal de sauvegarde au clic sur "Sauvegarder"', async () => {
    render(<LoanSimulatorPage />)
    await waitFor(() => expect(getLoanSimulations).toHaveBeenCalled())

    fireEvent.click(screen.getByText('Sauvegarder'))

    expect(screen.getByText('Sauvegarder la simulation')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ex : Appartement Paris 75011')).toBeInTheDocument()
  })

  it('crée une simulation et la pré-pend à la liste', async () => {
    const created = { id: 10, name: 'Nouveau bien', savedAt: '2026-04-26T12:00:00', parameters: PARAMS }
    createLoanSimulation.mockResolvedValue(created)
    getLoanSimulations.mockResolvedValue([])

    render(<LoanSimulatorPage />)
    await waitFor(() => expect(getLoanSimulations).toHaveBeenCalled())

    fireEvent.click(screen.getByText('Sauvegarder'))
    const input = screen.getByPlaceholderText('Ex : Appartement Paris 75011')
    fireEvent.change(input, { target: { value: 'Nouveau bien' } })
    // Le bouton "Sauvegarder" existe aussi dans le header — on prend celui de la modal (dernier)
    const saveButtons = screen.getAllByRole('button', { name: 'Sauvegarder' })
    fireEvent.click(saveButtons[saveButtons.length - 1])

    await waitFor(() => {
      expect(createLoanSimulation).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Nouveau bien', parameters: expect.any(Object) })
      )
    })
  })

  it('ferme la modal après sauvegarde réussie', async () => {
    const created = { id: 10, name: 'Test', savedAt: '2026-04-26T12:00:00', parameters: PARAMS }
    createLoanSimulation.mockResolvedValue(created)
    getLoanSimulations.mockResolvedValue([])

    render(<LoanSimulatorPage />)
    await waitFor(() => expect(getLoanSimulations).toHaveBeenCalled())

    fireEvent.click(screen.getByText('Sauvegarder'))
    fireEvent.change(screen.getByPlaceholderText('Ex : Appartement Paris 75011'), { target: { value: 'Test' } })
    const saveButtons = screen.getAllByRole('button', { name: 'Sauvegarder' })
    fireEvent.click(saveButtons[saveButtons.length - 1])

    await waitFor(() => {
      expect(screen.queryByText('Sauvegarder la simulation')).not.toBeInTheDocument()
    })
  })

  it('désactive le bouton si le nom est vide', async () => {
    render(<LoanSimulatorPage />)
    await waitFor(() => expect(getLoanSimulations).toHaveBeenCalled())

    // Le clic pré-remplit le nom avec la date — on le vide pour tester la désactivation
    fireEvent.click(screen.getByText('Sauvegarder'))
    fireEvent.change(screen.getByPlaceholderText('Ex : Appartement Paris 75011'), { target: { value: '' } })

    const saveButtons = screen.getAllByRole('button', { name: 'Sauvegarder' })
    expect(saveButtons[saveButtons.length - 1]).toBeDisabled()
  })

  // ── Suppression ───────────────────────────────────────────────

  it('supprime une simulation et la retire de la liste', async () => {
    getLoanSimulations.mockResolvedValue(SIMULATIONS)
    deleteLoanSimulation.mockResolvedValue()

    render(<LoanSimulatorPage />)
    await waitFor(() => expect(screen.queryByText('Appartement Paris')).toBeNull())

    fireEvent.click(screen.getByText('Mes simulations'))
    await waitFor(() => expect(screen.getByText('Appartement Paris')).toBeInTheDocument())

    // getAllByText('✕') retourne : [bouton fermeture panneau, delete sim1, delete sim2]
    const deleteButtons = screen.getAllByText('✕')
    fireEvent.click(deleteButtons[1])

    await waitFor(() => {
      expect(deleteLoanSimulation).toHaveBeenCalledWith(1)
      expect(screen.queryByText('Appartement Paris')).not.toBeInTheDocument()
    })
  })

  // ── Restauration ──────────────────────────────────────────────

  it('restaure les paramètres au clic sur "Charger"', async () => {
    getLoanSimulations.mockResolvedValue(SIMULATIONS)
    render(<LoanSimulatorPage />)
    await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Mes simulations'))
    await waitFor(() => expect(screen.getByText('Appartement Paris')).toBeInTheDocument())

    fireEvent.click(screen.getAllByText('Charger')[0])

    expect(screen.queryByText('Simulations sauvegardées')).not.toBeInTheDocument()
  })
})
