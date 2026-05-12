import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import TaxLossHarvestingPage from '../../../components/tools/TaxLossHarvestingPage'
import { getTaxLossHarvesting, getCtoCessions, getCryptoCessions, exportCtoCessionsCsv } from '../../../api/taxLoss'

vi.mock('../../../api/taxLoss', () => ({
  getTaxLossHarvesting:  vi.fn(),
  getCtoCessions:        vi.fn(),
  getCryptoCessions:     vi.fn(),
  exportCtoCessionsCsv:  vi.fn(),
}))

vi.mock('../../../hooks/useAnalytics', () => ({
  useAnalytics: () => ({ trackPageView: vi.fn(), trackEvent: vi.fn() }),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const EMPTY_BASKET = {
  basketLabel: 'Compte-titres ordinaire',
  realizedGainsYearEur: '0.00',
  totalUnrealizedLossEur: '0.00',
  compensableAmountEur: '0.00',
  estimatedTaxSavingEur: '0.00',
  candidates: [],
}

const CRYPTO_BASKET = {
  basketLabel: 'Crypto-monnaies',
  realizedGainsYearEur: '0.00',
  totalUnrealizedLossEur: '0.00',
  compensableAmountEur: '0.00',
  estimatedTaxSavingEur: '0.00',
  candidates: [],
}

const SUMMARY_EMPTY = {
  cto: EMPTY_BASKET,
  crypto: CRYPTO_BASKET,
  year: new Date().getFullYear(),
}

const SUMMARY_WITH_SAVING = {
  cto: {
    ...EMPTY_BASKET,
    realizedGainsYearEur: '5000.00',
    totalUnrealizedLossEur: '-3000.00',
    compensableAmountEur: '3000.00',
    estimatedTaxSavingEur: '900.00',
    candidates: [
      {
        positionId: 1,
        label: 'ETF Monde',
        partner: 'Boursobank',
        category: 'BOURSE',
        envelope: 'CTO',
        currentQuantity: '100.000000',
        unrealizedLossEur: '-3000.00',
        recommendedSellQuantity: '100.000000',
        recommendedRealizedLossEur: '-3000.00',
        estimatedTaxSavingEur: '900.00',
      },
    ],
  },
  crypto: CRYPTO_BASKET,
  year: new Date().getFullYear(),
}

const EMPTY_CESSIONS = {
  year: new Date().getFullYear(),
  cessions: [],
  netCapitalGainEur: '0.00',
  case3VG: '0.00',
  case3VH: '0.00',
}

const CESSIONS_WITH_DATA = {
  year: new Date().getFullYear(),
  cessions: [
    {
      positionId: 1,
      positionLabel: 'ETF Monde',
      partner: 'Boursobank',
      cessionDate: `${new Date().getFullYear()}-06-15`,
      quantity: '5.000000',
      sellAmountEur: '600.00',
      costBasisEur: '500.00',
      capitalGainEur: '100.00',
      runningTotalEur: '100.00',
    },
  ],
  netCapitalGainEur: '100.00',
  case3VG: '100.00',
  case3VH: '0.00',
}

describe('TaxLossHarvestingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getCtoCessions.mockResolvedValue(EMPTY_CESSIONS)
    getCryptoCessions.mockResolvedValue([])
  })

  // ── Chargement ─────────────────────────────────────────────────────────────

  it('affiche le titre de la page', async () => {
    getTaxLossHarvesting.mockResolvedValue(SUMMARY_EMPTY)
    render(<TaxLossHarvestingPage />)
    expect(screen.getByText(/Optimisation fiscale fin d'année/i)).toBeInTheDocument()
  })

  it('affiche un indicateur de chargement puis le résultat', async () => {
    getTaxLossHarvesting.mockResolvedValue(SUMMARY_EMPTY)
    render(<TaxLossHarvestingPage />)
    expect(screen.getByText(/Calcul en cours/i)).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByText('Compte-titres ordinaire')).toBeInTheDocument()
    )
  })

  // ── Affichage des données ──────────────────────────────────────────────────

  it('affiche les deux cards de basket', async () => {
    getTaxLossHarvesting.mockResolvedValue(SUMMARY_EMPTY)
    render(<TaxLossHarvestingPage />)
    await waitFor(() => {
      expect(screen.getByText('Compte-titres ordinaire')).toBeInTheDocument()
      expect(screen.getByText('Crypto-monnaies')).toBeInTheDocument()
    })
  })

  it('affiche le résumé d\'économie totale si positif', async () => {
    getTaxLossHarvesting.mockResolvedValue(SUMMARY_WITH_SAVING)
    render(<TaxLossHarvestingPage />)
    await waitFor(() => {
      expect(screen.getByText(/Économie potentielle totale/i)).toBeInTheDocument()
    })
  })

  it('affiche le candidat CTO dans le tableau', async () => {
    getTaxLossHarvesting.mockResolvedValue(SUMMARY_WITH_SAVING)
    render(<TaxLossHarvestingPage />)
    await waitFor(() => {
      expect(screen.getByText('ETF Monde')).toBeInTheDocument()
      expect(screen.getByText('Boursobank')).toBeInTheDocument()
    })
  })

  it('affiche "Aucune position en moins-value" si le basket est vide', async () => {
    getTaxLossHarvesting.mockResolvedValue(SUMMARY_EMPTY)
    render(<TaxLossHarvestingPage />)
    await waitFor(() => {
      const msgs = screen.getAllByText(/Aucune position en moins-value/i)
      expect(msgs.length).toBeGreaterThan(0)
    })
  })

  // ── Sélecteur d'année ──────────────────────────────────────────────────────

  it('affiche un sélecteur d\'année', async () => {
    getTaxLossHarvesting.mockResolvedValue(SUMMARY_EMPTY)
    render(<TaxLossHarvestingPage />)
    expect(screen.getByRole('combobox', { name: /année fiscale/i })).toBeInTheDocument()
  })

  it('recharge les données quand l\'année change', async () => {
    getTaxLossHarvesting.mockResolvedValue(SUMMARY_EMPTY)
    render(<TaxLossHarvestingPage />)
    await waitFor(() => expect(getTaxLossHarvesting).toHaveBeenCalledTimes(1))

    const select = screen.getByRole('combobox', { name: /année fiscale/i })
    const prevYear = String(new Date().getFullYear() - 1)
    fireEvent.change(select, { target: { value: prevYear } })

    await waitFor(() => expect(getTaxLossHarvesting).toHaveBeenCalledTimes(2))
  })

  // ── Gestion d'erreur ───────────────────────────────────────────────────────

  it('affiche un message d\'erreur si l\'API échoue', async () => {
    getTaxLossHarvesting.mockRejectedValue(new Error('Erreur réseau'))
    render(<TaxLossHarvestingPage />)
    await waitFor(() =>
      expect(screen.getByText(/Impossible de calculer/i)).toBeInTheDocument()
    )
  })

  // ── Section conseils ───────────────────────────────────────────────────────

  it('affiche la section conseils une fois les données chargées', async () => {
    getTaxLossHarvesting.mockResolvedValue(SUMMARY_EMPTY)
    render(<TaxLossHarvestingPage />)
    await waitFor(() =>
      expect(screen.getByText(/Conseils importants/i)).toBeInTheDocument()
    )
  })

  // ── Onglets ────────────────────────────────────────────────────────────────

  it('affiche les deux onglets Analyse et Récapitulatif', () => {
    getTaxLossHarvesting.mockResolvedValue(SUMMARY_EMPTY)
    render(<TaxLossHarvestingPage />)
    expect(screen.getByRole('button', { name: /Analyse & candidats/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Récapitulatif cessions/i })).toBeInTheDocument()
  })

  it('affiche le tableau des cessions en cliquant sur l\'onglet Récapitulatif', async () => {
    getTaxLossHarvesting.mockResolvedValue(SUMMARY_EMPTY)
    getCtoCessions.mockResolvedValue(CESSIONS_WITH_DATA)
    render(<TaxLossHarvestingPage />)

    const tab = screen.getByRole('button', { name: /Récapitulatif cessions/i })
    fireEvent.click(tab)

    await waitFor(() =>
      expect(screen.getByText(/ETF Monde/i)).toBeInTheDocument()
    )
    expect(screen.getByText(/Case 3VG/i)).toBeInTheDocument()
  })

  it('affiche le bouton export CSV dans l\'onglet cessions', async () => {
    getTaxLossHarvesting.mockResolvedValue(SUMMARY_EMPTY)
    getCtoCessions.mockResolvedValue(CESSIONS_WITH_DATA)
    render(<TaxLossHarvestingPage />)

    fireEvent.click(screen.getByRole('button', { name: /Récapitulatif cessions/i }))

    await waitFor(() =>
      expect(screen.getByTestId('export-cessions-csv-button')).toBeInTheDocument()
    )
  })

  it('affiche "Aucune cession" si la liste est vide dans l\'onglet cessions', async () => {
    getTaxLossHarvesting.mockResolvedValue(SUMMARY_EMPTY)
    render(<TaxLossHarvestingPage />)

    fireEvent.click(screen.getByRole('button', { name: /Récapitulatif cessions/i }))

    await waitFor(() =>
      expect(screen.getByText(/Aucune cession CTO en/i)).toBeInTheDocument()
    )
  })
})
