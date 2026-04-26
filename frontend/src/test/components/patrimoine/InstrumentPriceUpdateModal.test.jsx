import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import InstrumentPriceUpdateModal from '../../../components/patrimoine/InstrumentPriceUpdateModal'
import {
  getActiveInstruments,
  updateInstrumentPrices,
  updateInstrumentStablePrice,
} from '../../../api/patrimoine'

vi.mock('../../../api/patrimoine', () => ({
  getActiveInstruments:        vi.fn(),
  updateInstrumentPrices:      vi.fn(),
  updateInstrumentStablePrice: vi.fn(),
  getPositions:                vi.fn(),
  getPatrimoineScore:          vi.fn(),
  getInstruments:              vi.fn(),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const INSTRUMENTS = [
  {
    id: 1, name: 'Lyxor CAC 40', category: 'BOURSE',
    isin: 'FR0010315770', currency: 'EUR',
    lastPrice: 32.50, lastPriceUpdatedAt: new Date().toISOString(),
    stablePrice: false,
  },
  {
    id: 2, name: 'Bitcoin', category: 'CRYPTO',
    ticker: 'BTC', currency: 'USD',
    lastPrice: 42000, lastPriceUpdatedAt: new Date().toISOString(),
    stablePrice: false,
  },
  {
    id: 3, name: 'Fond euros AV', category: 'BOURSE',
    isin: 'FR0000000001', currency: 'EUR',
    lastPrice: 1.05, lastPriceUpdatedAt: '2020-01-01T00:00:00Z',
    stablePrice: true,
  },
]

describe('InstrumentPriceUpdateModal', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Chargement ────────────────────────────────────────────

  it('affiche "Chargement…" pendant le fetch initial', () => {
    getActiveInstruments.mockReturnValue(new Promise(() => {}))
    render(<InstrumentPriceUpdateModal onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })

  it('affiche un message si aucun instrument actif', async () => {
    getActiveInstruments.mockResolvedValue([])
    render(<InstrumentPriceUpdateModal onClose={vi.fn()} onSaved={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('Aucun instrument actif trouvé.')).toBeInTheDocument()
    })
  })

  it('affiche les instruments après chargement', async () => {
    getActiveInstruments.mockResolvedValue(INSTRUMENTS)
    render(<InstrumentPriceUpdateModal onClose={vi.fn()} onSaved={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('Lyxor CAC 40')).toBeInTheDocument()
      expect(screen.getByText('Bitcoin')).toBeInTheDocument()
    })
  })

  it('affiche une erreur si le fetch échoue', async () => {
    getActiveInstruments.mockRejectedValue(new Error('Network error'))
    render(<InstrumentPriceUpdateModal onClose={vi.fn()} onSaved={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('Impossible de charger les instruments.')).toBeInTheDocument()
    })
  })

  // ── Compteur d'obsolètes ──────────────────────────────────

  it('affiche le compteur de cours obsolètes', async () => {
    getActiveInstruments.mockResolvedValue(INSTRUMENTS)
    render(<InstrumentPriceUpdateModal onClose={vi.fn()} onSaved={vi.fn()} />)
    await waitFor(() => {
      // Instrument 3 a un lastPriceUpdatedAt de 2020 → obsolète mais stablePrice=true → exclu
      // Instruments 1 et 2 ont un lastPriceUpdatedAt récent → non obsolètes
      expect(screen.queryByText(/cours obsolète/)).not.toBeInTheDocument()
    })
  })

  // ── Sauvegarde ────────────────────────────────────────────

  it('n\'appelle pas updateInstrumentPrices si aucun prix saisi', async () => {
    getActiveInstruments.mockResolvedValue(INSTRUMENTS)
    render(<InstrumentPriceUpdateModal onClose={vi.fn()} onSaved={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('Lyxor CAC 40')).toBeInTheDocument())
    // Le bouton est disabled quand filledCount === 0 → click ignoré
    const saveBtn = screen.getByRole('button', { name: /Enregistrer/i })
    expect(saveBtn).toBeDisabled()
    expect(updateInstrumentPrices).not.toHaveBeenCalled()
  })

  it('appelle updateInstrumentPrices avec les prix saisis', async () => {
    updateInstrumentPrices.mockResolvedValue()
    getActiveInstruments.mockResolvedValue(INSTRUMENTS)
    const onSaved = vi.fn()
    const onClose = vi.fn()
    render(<InstrumentPriceUpdateModal onClose={onClose} onSaved={onSaved} />)
    await waitFor(() => expect(screen.getByText('Lyxor CAC 40')).toBeInTheDocument())

    // Placeholder "—" sur les inputs de prix non-stablePrice
    const inputs = screen.getAllByPlaceholderText('—').filter(i => !i.disabled)
    fireEvent.change(inputs[0], { target: { value: '33.10' } })
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer/i }))

    await waitFor(() => {
      expect(updateInstrumentPrices).toHaveBeenCalledWith([
        { instrumentId: 1, lastPrice: 33.10 },
      ])
      expect(onSaved).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('affiche une erreur si la mise à jour échoue', async () => {
    updateInstrumentPrices.mockRejectedValue(new Error('Server error'))
    getActiveInstruments.mockResolvedValue(INSTRUMENTS)
    render(<InstrumentPriceUpdateModal onClose={vi.fn()} onSaved={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('Lyxor CAC 40')).toBeInTheDocument())

    const inputs = screen.getAllByPlaceholderText('—').filter(i => !i.disabled)
    fireEvent.change(inputs[0], { target: { value: '33.10' } })
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer/i }))

    await waitFor(() => {
      expect(screen.getByText('Erreur lors de la mise à jour des cours.')).toBeInTheDocument()
    })
  })

  // ── Toggle prix fixe ──────────────────────────────────────

  it('bascule le prix fixe d\'un instrument (mise à jour optimiste)', async () => {
    updateInstrumentStablePrice.mockResolvedValue()
    getActiveInstruments.mockResolvedValue([INSTRUMENTS[0]])
    render(<InstrumentPriceUpdateModal onClose={vi.fn()} onSaved={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('Lyxor CAC 40')).toBeInTheDocument())

    const toggleBtn = screen.getByTitle('Marquer comme prix fixe')
    fireEvent.click(toggleBtn)

    await waitFor(() => {
      expect(updateInstrumentStablePrice).toHaveBeenCalledWith(1, true)
    })
  })

  it('annule le toggle si l\'API échoue (revert optimiste)', async () => {
    updateInstrumentStablePrice.mockRejectedValue(new Error('Error'))
    getActiveInstruments.mockResolvedValue([INSTRUMENTS[0]])
    render(<InstrumentPriceUpdateModal onClose={vi.fn()} onSaved={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('Lyxor CAC 40')).toBeInTheDocument())

    fireEvent.click(screen.getByTitle('Marquer comme prix fixe'))

    await waitFor(() => {
      expect(screen.getByText('Impossible de modifier le statut de prix fixe.')).toBeInTheDocument()
    })
  })

  // ── Fermeture ─────────────────────────────────────────────

  it('ferme la modal au clic sur "Fermer"', async () => {
    getActiveInstruments.mockResolvedValue([])
    const onClose = vi.fn()
    render(<InstrumentPriceUpdateModal onClose={onClose} onSaved={vi.fn()} />)
    await waitFor(() => expect(screen.queryByText('Chargement…')).not.toBeInTheDocument())
    fireEvent.click(screen.getByText('Fermer'))
    expect(onClose).toHaveBeenCalled()
  })
})
