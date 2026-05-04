import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PerformancePage from '../../../components/performance/PerformancePage'
import { getGlobalPerformance } from '../../../api/performance'

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('../../../api/performance', () => ({
  getGlobalPerformance: vi.fn(),
}))

vi.mock('../../../hooks/useAnalytics', () => ({
  useAnalytics: () => ({
    trackPageView: vi.fn(),
    trackEvent:    vi.fn(),
  }),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const DTO_COMPLET = {
  computedAt:       '2026-05-04T10:00:00Z',
  from:             '2021-01-01',
  to:               '2026-05-04',
  durationYears:    5.34,
  twrAnnualized:    0.092,
  mwrAnnualized:    0.078,
  totalInvestedEur: 45200,
  currentValueEur:  58900,
  absoluteGainEur:  13700,
  totalDividendsEur: 1240,
  warnings: [
    'Mois de 2015-01 exclu du chaînage TWR.',
    'Historique prix manquant pour BNP Technologies Europe.',
  ],
  monthlyBreakdown: [
    {
      month: '2021-02', included: true,
      valueStart: 1000, valueEnd: 1015,
      cashflowsNetEur: 0, weightedCashflowsEur: 0,
      monthlyReturn: 0.015, partial: false, reason: null,
    },
    {
      month: '2021-03', included: false,
      valueStart: null, valueEnd: null,
      cashflowsNetEur: null, weightedCashflowsEur: null,
      monthlyReturn: null, partial: false, reason: 'Aucune position active ni cashflow',
    },
  ],
}

const DTO_SANS_CALCUL = {
  computedAt:       '2026-05-04T10:00:00Z',
  from:             '2026-05-04',
  to:               '2026-05-04',
  durationYears:    0,
  twrAnnualized:    null,
  mwrAnnualized:    null,
  totalInvestedEur: 0,
  currentValueEur:  0,
  absoluteGainEur:  0,
  totalDividendsEur: 0,
  warnings: ['Aucune position éligible au calcul'],
  monthlyBreakdown: [],
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('PerformancePage', () => {

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Chargement ────────────────────────────────────────────────────────────

  it('affiche le bandeau de validation en cours', async () => {
    getGlobalPerformance.mockResolvedValue(DTO_COMPLET)
    render(<PerformancePage />)
    expect(screen.getByText(/Fonctionnalité en cours de validation/i)).toBeInTheDocument()
  })

  it('affiche un indicateur de chargement puis les KPIs', async () => {
    getGlobalPerformance.mockResolvedValue(DTO_COMPLET)
    render(<PerformancePage />)

    expect(screen.getByText(/Calcul en cours/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('+9.20 %/an')).toBeInTheDocument()
      expect(screen.getByText('+7.80 %/an')).toBeInTheDocument()
    })
  })

  it('affiche les KPIs TWR et MWR correctement formatés', async () => {
    getGlobalPerformance.mockResolvedValue(DTO_COMPLET)
    render(<PerformancePage />)

    await waitFor(() => {
      expect(screen.getByText(/TWR annualisé/i)).toBeInTheDocument()
      expect(screen.getByText(/MWR annualisé/i)).toBeInTheDocument()
      expect(screen.getByText('+9.20 %/an')).toBeInTheDocument()
      expect(screen.getByText('+7.80 %/an')).toBeInTheDocument()
    })
  })

  it('affiche "—" quand TWR et MWR sont null', async () => {
    getGlobalPerformance.mockResolvedValue(DTO_SANS_CALCUL)
    render(<PerformancePage />)

    await waitFor(() => {
      const dashes = screen.getAllByText('—')
      expect(dashes.length).toBeGreaterThanOrEqual(2)
    })
  })

  // ── Synthèse ──────────────────────────────────────────────────────────────

  it('affiche la section synthèse avec les labels', async () => {
    getGlobalPerformance.mockResolvedValue(DTO_COMPLET)
    render(<PerformancePage />)

    await waitFor(() => {
      expect(screen.getByText('Synthèse')).toBeInTheDocument()
      expect(screen.getByText('Versé net')).toBeInTheDocument()
      expect(screen.getByText('Valeur actuelle')).toBeInTheDocument()
      expect(screen.getByText('Plus-value absolue')).toBeInTheDocument()
    })
  })

  // ── Avertissements ────────────────────────────────────────────────────────

  it('affiche le compteur de warnings et les déplie au clic', async () => {
    getGlobalPerformance.mockResolvedValue(DTO_COMPLET)
    render(<PerformancePage />)

    await waitFor(() => {
      expect(screen.getByText(/2 avertissements/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/2 avertissements/i))

    expect(screen.getByText(/Mois de 2015-01 exclu/)).toBeInTheDocument()
    expect(screen.getByText(/Historique prix manquant/)).toBeInTheDocument()
  })

  it("n'affiche pas la section warnings si la liste est vide", async () => {
    getGlobalPerformance.mockResolvedValue({ ...DTO_COMPLET, warnings: [] })
    render(<PerformancePage />)

    await waitFor(() => {
      expect(screen.queryByText(/avertissement/i)).not.toBeInTheDocument()
    })
  })

  // ── Tableau mensuel dépliable ─────────────────────────────────────────────

  it('affiche le bouton pour déplier le détail mensuel', async () => {
    getGlobalPerformance.mockResolvedValue(DTO_COMPLET)
    render(<PerformancePage />)

    await waitFor(() => {
      expect(screen.getByText(/Voir le détail du calcul/i)).toBeInTheDocument()
    })
  })

  it('déplie et affiche le tableau mensuel au clic', async () => {
    getGlobalPerformance.mockResolvedValue(DTO_COMPLET)
    render(<PerformancePage />)

    await waitFor(() => {
      fireEvent.click(screen.getByText(/Voir le détail du calcul/i))
    })

    expect(screen.getByText('2021-02')).toBeInTheDocument()
    expect(screen.getByText('2021-03')).toBeInTheDocument()
    // Mois inclus : check mark
    expect(screen.getByText('✓')).toBeInTheDocument()
    // Mois exclu : raison affichée
    expect(screen.getByText('Aucune position active ni cashflow')).toBeInTheDocument()
  })

  // ── Gestion d'erreur ──────────────────────────────────────────────────────

  it("affiche un message d'erreur si l'API échoue", async () => {
    getGlobalPerformance.mockRejectedValue(new Error('Erreur réseau'))
    render(<PerformancePage />)

    await waitFor(() => {
      expect(screen.getByText(/Erreur réseau/i)).toBeInTheDocument()
    })
  })
})
