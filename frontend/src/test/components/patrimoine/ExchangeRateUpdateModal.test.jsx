import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ExchangeRateUpdateModal from '../../../components/patrimoine/ExchangeRateUpdateModal'
import { getExchangeRates, updateExchangeRates } from '../../../api/patrimoine'

vi.mock('../../../api/patrimoine', () => ({
  getExchangeRates:    vi.fn(),
  updateExchangeRates: vi.fn(),
  getPositions:        vi.fn(),
  getPatrimoineScore:  vi.fn(),
  getInstruments:      vi.fn(),
}))

// ── Fixtures ─────────────────────────────────────���────────────────────────────

const RATES = [
  { currency: 'USD', rate: 1.08, lastUpdatedAt: new Date().toISOString() },
  { currency: 'GBP', rate: 0.85, lastUpdatedAt: new Date().toISOString() },
]

describe('ExchangeRateUpdateModal', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Chargement ────────────────────────────────────────────

  it('affiche "Chargement…" pendant le fetch initial', () => {
    getExchangeRates.mockReturnValue(new Promise(() => {}))
    render(<ExchangeRateUpdateModal onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })

  it('affiche une erreur si le chargement échoue', async () => {
    getExchangeRates.mockRejectedValue(new Error('Network error'))
    render(<ExchangeRateUpdateModal onClose={vi.fn()} onSaved={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('Impossible de charger les taux de change.')).toBeInTheDocument()
    })
  })

  it('affiche les taux existants après chargement', async () => {
    getExchangeRates.mockResolvedValue(RATES)
    render(<ExchangeRateUpdateModal onClose={vi.fn()} onSaved={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('USD')).toBeInTheDocument()
      expect(screen.getByText('GBP')).toBeInTheDocument()
    })
  })

  it('affiche le titre "Taux de change"', async () => {
    getExchangeRates.mockResolvedValue([])
    render(<ExchangeRateUpdateModal onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.getByText('Taux de change')).toBeInTheDocument()
  })

  // ── Ajout d'une nouvelle devise ───────────────────────────

  it('ajoute une nouvelle devise au clic sur le bouton d\'ajout', async () => {
    getExchangeRates.mockResolvedValue(RATES)
    render(<ExchangeRateUpdateModal onClose={vi.fn()} onSaved={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('USD')).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText('USD'), { target: { value: 'CHF' } })
    fireEvent.change(screen.getByPlaceholderText('1.08'), { target: { value: '0.95' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }))

    await waitFor(() => expect(screen.getByText('CHF')).toBeInTheDocument())
  })

  // ── Sauvegarde ────────────────────────���───────────────────

  it('désactive le bouton Enregistrer si aucune valeur saisie', async () => {
    getExchangeRates.mockResolvedValue(RATES)
    render(<ExchangeRateUpdateModal onClose={vi.fn()} onSaved={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('USD')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled()
  })

  it('appelle updateExchangeRates avec les valeurs saisies', async () => {
    updateExchangeRates.mockResolvedValue()
    getExchangeRates.mockResolvedValue(RATES)
    const onSaved = vi.fn()
    const onClose = vi.fn()
    render(<ExchangeRateUpdateModal onClose={onClose} onSaved={onSaved} />)
    await waitFor(() => expect(screen.getByText('USD')).toBeInTheDocument())

    // Les inputs de la table utilisent placeholder="—"
    const inputs = screen.getAllByPlaceholderText('—')
    fireEvent.change(inputs[0], { target: { value: '1.10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() => {
      expect(updateExchangeRates).toHaveBeenCalledWith([{ currency: 'USD', rate: 1.10 }])
      expect(onSaved).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('affiche une erreur si la mise à jour échoue', async () => {
    updateExchangeRates.mockRejectedValue(new Error('Server error'))
    getExchangeRates.mockResolvedValue(RATES)
    render(<ExchangeRateUpdateModal onClose={vi.fn()} onSaved={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('USD')).toBeInTheDocument())

    const inputs = screen.getAllByPlaceholderText('—')
    fireEvent.change(inputs[0], { target: { value: '1.10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() => {
      expect(screen.getByText('Erreur lors de la mise à jour des taux.')).toBeInTheDocument()
    })
  })

  // ── Fermeture ────────────────���────────────────────────────

  it('appelle onClose au clic sur Annuler', async () => {
    getExchangeRates.mockResolvedValue([])
    const onClose = vi.fn()
    render(<ExchangeRateUpdateModal onClose={onClose} onSaved={vi.fn()} />)
    await waitFor(() => expect(screen.queryByText('Chargement…')).not.toBeInTheDocument())
    fireEvent.click(screen.getByText('Annuler'))
    expect(onClose).toHaveBeenCalled()
  })
})
