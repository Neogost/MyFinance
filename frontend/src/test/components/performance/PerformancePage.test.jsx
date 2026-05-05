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
  byPosition: [
    {
      positionId: 1, label: 'CW8 - Amundi MSCI World', category: 'BOURSE',
      partner: 'Boursorama', currency: 'EUR',
      twrAnnualized: 0.085, mwrAnnualized: 0.072,
      currentValueEur: 40000, totalInvestedEur: 32000,
      absoluteGainEur: 8000, totalDividendsEur: 500,
    },
    {
      positionId: 2, label: 'Livret A', category: 'LIVRET',
      partner: 'Caisse Épargne', currency: 'EUR',
      twrAnnualized: 0.030, mwrAnnualized: 0.030,
      currentValueEur: 18900, totalInvestedEur: 13200,
      absoluteGainEur: 5700, totalDividendsEur: 740,
    },
  ],
  byCategory: [
    {
      category: 'BOURSE',
      twrAnnualized: 0.085,
      mwrAnnualized: 0.072,
      currentValueEur: 40000,
      totalInvestedEur: 32000,
      absoluteGainEur: 8000,
      totalDividendsEur: 500,
    },
    {
      category: 'LIVRET',
      twrAnnualized: 0.030,
      mwrAnnualized: 0.030,
      currentValueEur: 18900,
      totalInvestedEur: 13200,
      absoluteGainEur: 5700,
      totalDividendsEur: 740,
    },
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
      // "TWR annualisé" apparaît plusieurs fois (global + cartes catégories)
      expect(screen.getAllByText(/TWR annualisé/i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText(/MWR annualisé/i).length).toBeGreaterThanOrEqual(1)
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

  // ── Sélecteur de période ──────────────────────────────────────────────────

  it('affiche les boutons de période', async () => {
    getGlobalPerformance.mockResolvedValue(DTO_COMPLET)
    render(<PerformancePage />)

    expect(screen.getByText('Global')).toBeInTheDocument()
    expect(screen.getByText('YTD')).toBeInTheDocument()
    expect(screen.getByText('1 an')).toBeInTheDocument()
    expect(screen.getByText('3 ans')).toBeInTheDocument()
    expect(screen.getByText('5 ans')).toBeInTheDocument()
    expect(screen.getByText('Personnalisée')).toBeInTheDocument()
  })

  it('le bouton Global est actif par défaut', async () => {
    getGlobalPerformance.mockResolvedValue(DTO_COMPLET)
    render(<PerformancePage />)

    const globalBtn = screen.getByText('Global')
    expect(globalBtn.className).toContain('bg-indigo-600')
  })

  it('cliquer sur YTD recharge les données avec from=1er janvier', async () => {
    getGlobalPerformance.mockResolvedValue(DTO_COMPLET)
    render(<PerformancePage />)

    await waitFor(() => screen.getByText('+9.20 %/an'))

    getGlobalPerformance.mockResolvedValue({ ...DTO_COMPLET, from: `${new Date().getFullYear()}-01-01` })
    fireEvent.click(screen.getByText('YTD'))

    await waitFor(() => {
      const calls = getGlobalPerformance.mock.calls
      const ytdCall = calls.find(c => c[0] && c[0].startsWith(`${new Date().getFullYear()}-01-01`))
      expect(ytdCall).toBeDefined()
    })
  })

  it('cliquer sur Personnalisée affiche les champs de date', async () => {
    getGlobalPerformance.mockResolvedValue(DTO_COMPLET)
    render(<PerformancePage />)

    fireEvent.click(screen.getByText('Personnalisée'))

    // Les labels "Du" et "au" apparaissent pour les sélecteurs de date personnalisée
    expect(screen.getByText('Du')).toBeInTheDocument()
    expect(screen.getByText('au')).toBeInTheDocument()
  })

  // ── Décomposition du rendement ───────────────────────────────────────────

  it('affiche la décomposition du gain (marché + revenus)', async () => {
    getGlobalPerformance.mockResolvedValue(DTO_COMPLET)
    render(<PerformancePage />)

    await waitFor(() => {
      expect(screen.getByText('Décomposition du gain')).toBeInTheDocument()
      expect(screen.getByText('Plus-value de marché')).toBeInTheDocument()
      expect(screen.getByText('Revenus perçus')).toBeInTheDocument()
    })
  })

  // ── Section pédagogique ──────────────────────────────────────────────────

  it('affiche la section pédagogique dépliable et son contenu', async () => {
    getGlobalPerformance.mockResolvedValue(DTO_COMPLET)
    render(<PerformancePage />)

    await waitFor(() => {
      expect(screen.getByText(/TWR et MWR expliqués simplement/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/TWR et MWR expliqués simplement/i))

    expect(screen.getByText(/Ce qu'il faut retenir/i)).toBeInTheDocument()
    // "Alice" et "Bob" apparaissent dans plusieurs éléments (carte + texte) — vérifier au moins 1
    expect(screen.getAllByText(/Alice/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Bob/i).length).toBeGreaterThanOrEqual(1)
  })

  // ── Sélecteur benchmark taux fixe ────────────────────────────────────────

  it('affiche les deux modes du sélecteur de benchmark', async () => {
    getGlobalPerformance.mockResolvedValue(DTO_COMPLET)
    render(<PerformancePage />)

    await waitFor(() => screen.getByText('Performance cumulée (base 100)'))

    expect(screen.getByText('📈 Indice')).toBeInTheDocument()
    expect(screen.getByText('% Taux fixe')).toBeInTheDocument()
  })

  it('affiche le champ taux quand le mode Taux fixe est sélectionné', async () => {
    getGlobalPerformance.mockResolvedValue(DTO_COMPLET)
    render(<PerformancePage />)

    await waitFor(() => screen.getByText('% Taux fixe'))
    fireEvent.click(screen.getByText('% Taux fixe'))

    expect(screen.getByText('%/an')).toBeInTheDocument()
  })

  // ── Graphique TWR cumulé ──────────────────────────────────────────────────

  it('affiche le graphique TWR cumulé quand il y a des mois inclus', async () => {
    getGlobalPerformance.mockResolvedValue(DTO_COMPLET)
    render(<PerformancePage />)

    await waitFor(() => {
      expect(screen.getByText('Performance cumulée (base 100)')).toBeInTheDocument()
    })
  })

  it("n'affiche pas le graphique si monthlyBreakdown est vide", async () => {
    getGlobalPerformance.mockResolvedValue({ ...DTO_COMPLET, monthlyBreakdown: [] })
    render(<PerformancePage />)

    await waitFor(() => {
      expect(screen.queryByText('Performance cumulée (base 100)')).not.toBeInTheDocument()
    })
  })

  // ── Performance par position ──────────────────────────────────────────────

  it('affiche la section par position groupée par partenaire', async () => {
    getGlobalPerformance.mockResolvedValue(DTO_COMPLET)
    render(<PerformancePage />)

    await waitFor(() => {
      expect(screen.getByText('Par position')).toBeInTheDocument()
      expect(screen.getByText('Boursorama')).toBeInTheDocument()
      expect(screen.getByText('Caisse Épargne')).toBeInTheDocument()
      expect(screen.getByText('CW8 - Amundi MSCI World')).toBeInTheDocument()
    })
  })

  it("n'affiche pas la section position si byPosition est vide", async () => {
    getGlobalPerformance.mockResolvedValue({ ...DTO_COMPLET, byPosition: [] })
    render(<PerformancePage />)

    await waitFor(() => {
      expect(screen.queryByText('Par position')).not.toBeInTheDocument()
    })
  })

  // ── Performance par catégorie ─────────────────────────────────────────────

  it('affiche les cartes par catégorie', async () => {
    getGlobalPerformance.mockResolvedValue(DTO_COMPLET)
    render(<PerformancePage />)

    await waitFor(() => {
      expect(screen.getByText('Par catégorie')).toBeInTheDocument()
      // "Bourse" et "Livrets" apparaissent dans les cartes catégorie ET les badges de position
      expect(screen.getAllByText('Bourse').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Livret').length).toBeGreaterThanOrEqual(1)
    })
  })

  it("n'affiche pas la section catégorie si byCategory est vide", async () => {
    getGlobalPerformance.mockResolvedValue({ ...DTO_COMPLET, byCategory: [] })
    render(<PerformancePage />)

    await waitFor(() => {
      expect(screen.queryByText('Par catégorie')).not.toBeInTheDocument()
    })
  })

  // ── Synthèse ──────────────────────────────────────────────────────────────

  it('affiche la section synthèse avec les labels', async () => {
    getGlobalPerformance.mockResolvedValue(DTO_COMPLET)
    render(<PerformancePage />)

    await waitFor(() => {
      expect(screen.getByText('Synthèse')).toBeInTheDocument()
      expect(screen.getByText('Versé net')).toBeInTheDocument()
      // "Valeur actuelle" et "Plus-value" apparaissent aussi dans les cartes catégories
      expect(screen.getAllByText('Valeur actuelle').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Plus-value absolue').length).toBeGreaterThanOrEqual(1)
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
    expect(screen.getByText('✓')).toBeInTheDocument()
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
