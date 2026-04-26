import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminInstrumentPage from '../../../components/admin/AdminInstrumentPage'
import {
  getInstruments, createInstrument, updateInstrument,
  deleteInstrument, runMarketDataUpdate, runAllocationUpdate,
} from '../../../api/patrimoine'

vi.mock('../../../api/patrimoine', () => ({
  getInstruments:                vi.fn(),
  createInstrument:              vi.fn(),
  updateInstrument:              vi.fn(),
  deleteInstrument:              vi.fn(),
  runMarketDataUpdate:           vi.fn(),
  runAllocationUpdate:           vi.fn(),
  getPositions:                  vi.fn(),
  getPatrimoineScore:            vi.fn(),
  updateInstrumentAllocations:   vi.fn(),
  updateInstrumentSectorAllocations: vi.fn(),
}))

// Sous-modales mockées — on ne teste pas leur contenu ici
vi.mock('../../../components/admin/AdminInstrumentForm', () => ({
  default: ({ onCancel }) => (
    <div data-testid="instrument-form">
      <button onClick={onCancel}>Annuler form</button>
    </div>
  ),
}))
vi.mock('../../../components/admin/AdminAllocationModal', () => ({
  default: ({ onCancel }) => <div data-testid="allocation-modal"><button onClick={onCancel}>Fermer alloc</button></div>,
}))
vi.mock('../../../components/admin/AdminSectorAllocationModal', () => ({
  default: ({ onCancel }) => <div data-testid="sector-modal"><button onClick={onCancel}>Fermer secteur</button></div>,
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const INSTRUMENTS = [
  {
    id: 1, category: 'BOURSE', name: 'Amundi ETF S&P 500',
    isin: 'LU0011850077', ticker: null, currency: 'EUR',
    lastPrice: 32.50, lastPriceUpdatedAt: new Date().toISOString(),
    stablePrice: false, boursoramaSymbol: '1rTESE', coinGeckoId: null,
    countryAllocation: [], sectorAllocation: [],
  },
  {
    id: 2, category: 'CRYPTO', name: 'Bitcoin',
    isin: null, ticker: 'BTC', currency: 'USD',
    lastPrice: 42000, lastPriceUpdatedAt: new Date().toISOString(),
    stablePrice: false, boursoramaSymbol: null, coinGeckoId: 'bitcoin',
    countryAllocation: [], sectorAllocation: [],
  },
]

describe('AdminInstrumentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.confirm = vi.fn(() => true)
  })

  // ── Chargement ────────────────────────────────────────────

  it('affiche "Chargement…" pendant le fetch initial', () => {
    getInstruments.mockReturnValue(new Promise(() => {}))
    render(<AdminInstrumentPage />)
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })

  it('affiche l\'erreur si le chargement échoue', async () => {
    getInstruments.mockRejectedValue(new Error('Network error'))
    render(<AdminInstrumentPage />)
    await waitFor(() => {
      expect(screen.getByText('Impossible de charger les instruments.')).toBeInTheDocument()
    })
  })

  // ── Affichage ─────────────────────────────────────────────

  it('affiche le titre "Gestion des instruments"', async () => {
    getInstruments.mockResolvedValue([])
    render(<AdminInstrumentPage />)
    await waitFor(() => expect(screen.queryByText('Chargement…')).not.toBeInTheDocument())
    expect(screen.getByText('Gestion des instruments')).toBeInTheDocument()
  })

  it('affiche les instruments après chargement', async () => {
    getInstruments.mockResolvedValue(INSTRUMENTS)
    render(<AdminInstrumentPage />)
    await waitFor(() => {
      expect(screen.getByText('Amundi ETF S&P 500')).toBeInTheDocument()
      expect(screen.getByText('Bitcoin')).toBeInTheDocument()
    })
  })

  it('groupe les instruments en sections BOURSE et CRYPTO', async () => {
    getInstruments.mockResolvedValue(INSTRUMENTS)
    render(<AdminInstrumentPage />)
    await waitFor(() => {
      expect(screen.getByText('BOURSE')).toBeInTheDocument()
      expect(screen.getByText('CRYPTO')).toBeInTheDocument()
    })
  })

  // ── Bouton Ajouter ────────────────────────────────────────

  it('affiche le bouton "+ Ajouter"', async () => {
    getInstruments.mockResolvedValue([])
    render(<AdminInstrumentPage />)
    await waitFor(() => expect(screen.queryByText('Chargement…')).not.toBeInTheDocument())
    expect(screen.getByText('+ Ajouter')).toBeInTheDocument()
  })

  it('ouvre le formulaire de création au clic sur "+ Ajouter"', async () => {
    getInstruments.mockResolvedValue([])
    render(<AdminInstrumentPage />)
    await waitFor(() => expect(screen.getByText('+ Ajouter')).toBeInTheDocument())
    fireEvent.click(screen.getByText('+ Ajouter'))
    expect(screen.getByTestId('instrument-form')).toBeInTheDocument()
  })

  it('ferme le formulaire au clic sur Annuler', async () => {
    getInstruments.mockResolvedValue([])
    render(<AdminInstrumentPage />)
    await waitFor(() => expect(screen.getByText('+ Ajouter')).toBeInTheDocument())
    fireEvent.click(screen.getByText('+ Ajouter'))
    fireEvent.click(screen.getByText('Annuler form'))
    expect(screen.queryByTestId('instrument-form')).not.toBeInTheDocument()
  })

  // ── Suppression ───────────────────────────────────────────

  it('affiche le bouton Supprimer pour chaque instrument', async () => {
    getInstruments.mockResolvedValue(INSTRUMENTS)
    render(<AdminInstrumentPage />)
    await waitFor(() => expect(screen.getAllByText('Supprimer').length).toBe(2))
  })

  it('ouvre la modale de confirmation de suppression', async () => {
    getInstruments.mockResolvedValue(INSTRUMENTS)
    render(<AdminInstrumentPage />)
    await waitFor(() => expect(screen.getAllByText('Supprimer')[0]).toBeInTheDocument())
    fireEvent.click(screen.getAllByText('Supprimer')[0])
    // La modale affiche un texte de confirmation
    expect(screen.getByText(/Supprimer définitivement/)).toBeInTheDocument()
  })

  it('supprime l\'instrument après confirmation dans la modale', async () => {
    deleteInstrument.mockResolvedValue()
    getInstruments.mockResolvedValue(INSTRUMENTS)
    render(<AdminInstrumentPage />)
    await waitFor(() => expect(screen.getAllByText('Supprimer')[0]).toBeInTheDocument())
    fireEvent.click(screen.getAllByText('Supprimer')[0])
    fireEvent.click(screen.getByText('Supprimer définitivement'))
    await waitFor(() => {
      expect(deleteInstrument).toHaveBeenCalledWith(INSTRUMENTS[0].id)
      expect(screen.queryByText('Amundi ETF S&P 500')).not.toBeInTheDocument()
    })
  })

  // ── Mise à jour des cours ─────────────────────────────────

  it('affiche le bouton "Mettre à jour les cours"', async () => {
    getInstruments.mockResolvedValue([])
    render(<AdminInstrumentPage />)
    await waitFor(() => expect(screen.queryByText('Chargement…')).not.toBeInTheDocument())
    expect(screen.getByText('Mettre à jour les cours')).toBeInTheDocument()
  })

  it('appelle runMarketDataUpdate au clic sur "Mettre à jour les cours"', async () => {
    runMarketDataUpdate.mockResolvedValue({ updated: 2, failed: 0 })
    getInstruments.mockResolvedValue(INSTRUMENTS)
    render(<AdminInstrumentPage />)
    await waitFor(() => expect(screen.getByText('Mettre à jour les cours')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Mettre à jour les cours'))
    await waitFor(() => expect(runMarketDataUpdate).toHaveBeenCalled())
  })
})
