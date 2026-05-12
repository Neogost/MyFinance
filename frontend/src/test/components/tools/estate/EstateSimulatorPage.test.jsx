import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import EstateSimulatorPage from '../../../../components/tools/estate/EstateSimulatorPage'
import { getFamilyMembers, getPastDonations, simulateDonation } from '../../../../api/estate'

vi.mock('../../../../api/estate', () => ({
  getFamilyMembers:    vi.fn(),
  getPastDonations:    vi.fn(),
  simulateDonation:    vi.fn(),
  simulateJointDonation: vi.fn(),
  simulateMultiRecipientDonation: vi.fn(),
  simulateJointMultiRecipientDonation: vi.fn(),
  simulateSuccession:  vi.fn(),
  simulateStrategy:    vi.fn(),
  createFamilyMember:  vi.fn(),
  updateFamilyMember:  vi.fn(),
  deleteFamilyMember:  vi.fn(),
  recordPastDonation:  vi.fn(),
  deletePastDonation:  vi.fn(),
}))

vi.mock('../../../../hooks/useAnalytics', () => ({
  useAnalytics: () => ({ trackPageView: vi.fn(), trackEvent: vi.fn() }),
}))

const MEMBER_LEO = {
  id: 1, firstName: 'Léo', lastName: null,
  relation: 'ENFANT', handicap: false,
  birthDate: '2000-01-01', deathDate: null, notes: null,
}

const SIMULATION_RESULT = {
  giftValue: '60000.00',
  valueTransmitted: '60000.00',
  npRatio: null,
  abattementBase: '100000.00',
  abattementUsed: '0.00',
  abattementResiduel: '100000.00',
  taxable: '0.00',
  droits: '0.00',
  netReceived: '60000.00',
  warning: null,
}

describe('EstateSimulatorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getFamilyMembers.mockResolvedValue([])
    getPastDonations.mockResolvedValue([])
  })

  // ── Affichage général ──────────────────────────────────────

  it('affiche le titre de la page', async () => {
    render(<EstateSimulatorPage />)
    await waitFor(() => expect(screen.getByText(/Donation & succession/i)).toBeInTheDocument())
  })

  it('affiche les 3 onglets', async () => {
    render(<EstateSimulatorPage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Donation' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Succession' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Stratégie 15 ans' })).toBeInTheDocument()
    })
  })

  it('affiche le résultat de la stratégie 15 ans', async () => {
    const { simulateStrategy } = await import('../../../../api/estate')
    simulateStrategy.mockResolvedValue({
      userAge: 50, nbDonors: 2, nbHeirs: 2,
      patrimoineNetEur: '500000',
      cycles: [{
        cycleNumber: 1, year: 2026, donorAge: 50, npRatio: '0.4',
        totalAbattementsAvailable: '400000', heirs: [],
        maxTransmissibleSansDroits: '400000', maxTransmissibleAvecDemembrement: '1000000',
      }],
      totalSansAnticipation: '500000', droitsSansAnticipationEur: '60000',
      totalAvecDonationsPP: '400000', totalAvecDonationsNP: '1000000',
      economieMaxEur: '60000', recommendations: ['Test'],
    })
    render(<EstateSimulatorPage />)
    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: 'Stratégie 15 ans' })))
    await waitFor(() => expect(screen.getByText(/Frise chronologique/i)).toBeInTheDocument())
  })

  it('affiche le résultat de la simulation de succession', async () => {
    const { simulateSuccession } = await import('../../../../api/estate')
    simulateSuccession.mockResolvedValue({
      simulationDate: '2026-05-12',
      positionsValueEur: '100000', possessionsValueEur: '0', debtsRemainingEur: '0',
      patrimoineNetEur: '100000', donationsRapporteesEur: '0', masseSuccessoraleEur: '100000',
      hasConjoint: false, conjointName: null, nbEnfants: 0,
      reserveRatio: '0', reserveHereditaireEur: '0', quotiteDisponibleEur: '100000',
      heirs: [], totalDroitsEur: '0', totalNetReceivedEur: '0',
      warnings: ['Aucun héritier identifié dans la cellule familiale.']
    })

    render(<EstateSimulatorPage />)
    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: 'Succession' })))
    await waitFor(() => expect(screen.getAllByText(/Masse successorale/i).length).toBeGreaterThan(0))
  })

  // ── Onglet donation ────────────────────────────────────────

  it('affiche "Aucun membre" si la cellule est vide', async () => {
    render(<EstateSimulatorPage />)
    await waitFor(() => expect(screen.getByText(/Aucun membre/i)).toBeInTheDocument())
  })

  it('affiche le membre dans la cellule familiale', async () => {
    getFamilyMembers.mockResolvedValue([MEMBER_LEO])
    render(<EstateSimulatorPage />)
    await waitFor(() => expect(screen.getByText('Léo')).toBeInTheDocument())
  })

  it('affiche le bouton simuler', async () => {
    render(<EstateSimulatorPage />)
    await waitFor(() =>
      expect(screen.getByTestId('simulate-button')).toBeInTheDocument()
    )
  })

  it('affiche le résultat après simulation', async () => {
    const { simulateMultiRecipientDonation } = await import('../../../../api/estate')
    getFamilyMembers.mockResolvedValue([MEMBER_LEO])
    simulateMultiRecipientDonation.mockResolvedValue({
      assetValue: '60000', donorShareEur: '60000', totalAmountGivenEur: '60000',
      recipients: [{
        recipientId: 1, firstName: 'Léo', relation: 'ENFANT',
        share: '1.0', allocatedAmountEur: '60000', valueTransmittedEur: '60000',
        npRatio: null, abattementBaseEur: '100000', abattementUsedEur: '0',
        abattementResiduelEur: '100000', taxableEur: '0', droitsEur: '0',
        netReceivedEur: '60000',
      }],
      totalDroitsEur: '0', notaryFeesEur: '500', totalCostEur: '500',
      totalNetReceivedEur: '60000', abattementSummary: 'Abattements cumulés : 100 000 €',
      warnings: [],
    })
    render(<EstateSimulatorPage />)

    await waitFor(() => screen.getByTestId('simulate-button'))

    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: '1' } })
    fireEvent.change(screen.getByPlaceholderText(/Appartement/i), { target: { value: 'Liquidités' } })
    fireEvent.change(screen.getByPlaceholderText(/300000/i), { target: { value: '60000' } })
    fireEvent.click(screen.getByTestId('simulate-button'))

    // La card de résultat s'affiche → multiple "Léo" (cellule + result card)
    await waitFor(() => expect(screen.getAllByText(/Léo/).length).toBeGreaterThan(1))
    expect(screen.getAllByText(/60[\s ]?000\s?€/).length).toBeGreaterThan(0)
  })

  // ── Modal famille ──────────────────────────────────────────

  it('ouvre la modal famille au clic sur Gérer', async () => {
    getFamilyMembers.mockResolvedValue([MEMBER_LEO])
    render(<EstateSimulatorPage />)
    await waitFor(() => fireEvent.click(screen.getByText(/Gérer/i)))
    // La modal ouvre une 2e occurrence de "Cellule familiale" (titre du modal)
    expect(screen.getAllByText('Cellule familiale').length).toBeGreaterThanOrEqual(2)
  })
})
