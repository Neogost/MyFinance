import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LombardSimulatorPage from '../../../components/tools/LombardSimulatorPage'
import { getPositions } from '../../../api/patrimoine'

// ── Mocks API ──────────────────────────────────────────────────────────────────

vi.mock('../../../api/patrimoine', () => ({
  getPositions: vi.fn(),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const POSITIONS = [
  { id: 1, status: 'ACTIVE', category: 'BOURSE',        computed: { currentValueEur: '60000', capitalGainEur: '10000' } },
  { id: 2, status: 'ACTIVE', category: 'LIVRET',        computed: { currentValueEur: '20000', capitalGainEur: '0' } },
  { id: 3, status: 'ACTIVE', category: 'IMMO_PHYSIQUE', computed: { currentValueEur: '200000', capitalGainEur: '0' } },
]

describe('LombardSimulatorPage', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Chargement / état vide ──────────────────────────────

  it('affiche "Chargement…" pendant le fetch initial', () => {
    getPositions.mockReturnValue(new Promise(() => {}))
    render(<LombardSimulatorPage />)
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })

  it('affiche un message si aucune position active', async () => {
    getPositions.mockResolvedValue([])
    render(<LombardSimulatorPage />)
    await waitFor(() => {
      expect(screen.getByText(/Aucune position active/i)).toBeInTheDocument()
    })
  })

  it('affiche une erreur si le fetch échoue', async () => {
    getPositions.mockRejectedValue(new Error('Network'))
    render(<LombardSimulatorPage />)
    await waitFor(() => {
      expect(screen.getByText(/Impossible de charger/i)).toBeInTheDocument()
    })
  })

  // ── Rendu nominal ───────────────────────────────────────

  it('affiche les 4 cartes de scénarios LTV avec les capacités calculées', async () => {
    getPositions.mockResolvedValue(POSITIONS)
    render(<LombardSimulatorPage />)
    await waitFor(() => {
      // "Prudent" et "Optimiste" apparaissent dans la bannière + le tableau de comparaison
      expect(screen.getAllByText('Prudent').length).toBeGreaterThan(0)
    })
    expect(screen.getAllByText('Réaliste').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Optimiste').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Personnalisé').length).toBeGreaterThan(0)
  })

  it('affiche les KPIs synthèse après chargement', async () => {
    getPositions.mockResolvedValue(POSITIONS)
    render(<LombardSimulatorPage />)
    await waitFor(() => {
      // "Coût total intérêts" apparaît dans les KPIs + tableaux de comparaison/sensibilité
      expect(screen.getAllByText(/Coût total intérêts/i).length).toBeGreaterThan(0)
    })
    expect(screen.getAllByText(/Marge avant margin call/i).length).toBeGreaterThan(0)
  })

  it('affiche la section "Comparaison des scénarios LTV"', async () => {
    getPositions.mockResolvedValue(POSITIONS)
    render(<LombardSimulatorPage />)
    await waitFor(() => {
      expect(screen.getByText(/Comparaison des scénarios LTV/i)).toBeInTheDocument()
    })
  })

  it('affiche la section "Sensibilité aux taux variables"', async () => {
    getPositions.mockResolvedValue(POSITIONS)
    render(<LombardSimulatorPage />)
    await waitFor(() => {
      expect(screen.getByText(/Sensibilité aux taux variables/i)).toBeInTheDocument()
    })
  })

  it('affiche la section stress test avec les scénarios de crise', async () => {
    getPositions.mockResolvedValue(POSITIONS)
    render(<LombardSimulatorPage />)
    await waitFor(() => {
      // "Stress test" apparaît dans le titre + tableau récap
      expect(screen.getAllByText(/Stress test/i).length).toBeGreaterThan(0)
    })
    // Les scénarios sont des boutons et un encart actif (label en double)
    expect(screen.getAllByText(/2008 — Subprimes/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/2020 — COVID-19/i).length).toBeGreaterThan(0)
  })

  // ── Interactions ────────────────────────────────────────

  it('bascule en mode "Montant précis" et affiche l\'input', async () => {
    getPositions.mockResolvedValue(POSITIONS)
    render(<LombardSimulatorPage />)
    await waitFor(() => screen.getByText('Mode'))
    fireEvent.click(screen.getByText(/Montant précis/i))
    await waitFor(() => {
      expect(screen.getByText(/Montant souhaité/i)).toBeInTheDocument()
    })
  })

  it('change de scénario LTV au clic', async () => {
    getPositions.mockResolvedValue(POSITIONS)
    render(<LombardSimulatorPage />)
    await waitFor(() => screen.getAllByText('Optimiste'))
    // Le premier "Optimiste" est le bouton de la bannière
    const optimistButtons = screen.getAllByText('Optimiste')
    fireEvent.click(optimistButtons[0])
    await waitFor(() => {
      expect(screen.getByText(/Capacité optimiste/i)).toBeInTheDocument()
    })
  })

  it('active l\'effet de levier via la checkbox', async () => {
    getPositions.mockResolvedValue(POSITIONS)
    render(<LombardSimulatorPage />)
    await waitFor(() => screen.getByText(/Effet de levier/i))
    const checkbox = screen.getByLabelText(/Effet de levier/i)
    fireEvent.click(checkbox)
    await waitFor(() => {
      expect(screen.getByText(/Rendement attendu du réinvestissement/i)).toBeInTheDocument()
    })
  })

  it('active la comparaison vente d\'actifs via la checkbox', async () => {
    getPositions.mockResolvedValue(POSITIONS)
    render(<LombardSimulatorPage />)
    await waitFor(() => screen.getByText(/Comparer avec une vente/i))
    const checkbox = screen.getByLabelText(/Comparer avec une vente d'actifs/i)
    fireEvent.click(checkbox)
    await waitFor(() => {
      expect(screen.getByText(/Rendement attendu portefeuille/i)).toBeInTheDocument()
    })
  })

  // ── Détail par catégorie ────────────────────────────────

  it('liste les catégories du portefeuille avec leur LTV applicable', async () => {
    getPositions.mockResolvedValue(POSITIONS)
    render(<LombardSimulatorPage />)
    await waitFor(() => screen.getByText('Détail par catégorie'))
    expect(screen.getByText('Bourse')).toBeInTheDocument()
    expect(screen.getByText('Livrets')).toBeInTheDocument()
    expect(screen.getByText('Immobilier physique')).toBeInTheDocument()
  })
})
