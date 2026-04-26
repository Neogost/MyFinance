import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminInstrumentForm from '../../../components/admin/AdminInstrumentForm'

// Pas d'appel API — le formulaire délègue à onSubmit via prop

const INSTRUMENT_BOURSE = {
  id: 1, category: 'BOURSE',
  isin: 'LU0011850077', ticker: null,
  name: 'Amundi ETF S&P 500', currency: 'EUR',
  stablePrice: false, marketSymbol: '', coinGeckoId: '', boursoramaSymbol: '1rTESE',
}

const INSTRUMENT_CRYPTO = {
  id: 2, category: 'CRYPTO',
  isin: null, ticker: 'BTC',
  name: 'Bitcoin', currency: 'USD',
  stablePrice: false, marketSymbol: '', coinGeckoId: 'bitcoin', boursoramaSymbol: '',
}

describe('AdminInstrumentForm', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Titre ─────────────────────────────────────────────────

  it('affiche le titre "Ajouter un instrument" en création', () => {
    render(<AdminInstrumentForm item={null} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Ajouter un instrument')).toBeInTheDocument()
  })

  it('affiche le titre "Modifier l\'instrument" en édition', () => {
    render(<AdminInstrumentForm item={INSTRUMENT_BOURSE} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText("Modifier l'instrument")).toBeInTheDocument()
  })

  // ── Champs conditionnels selon catégorie ──────────────────

  it('affiche le sélecteur de catégorie en création', () => {
    render(<AdminInstrumentForm item={null} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByText('BOURSE')).toBeInTheDocument()
    expect(screen.getByText('CRYPTO')).toBeInTheDocument()
  })

  it('masque le sélecteur de catégorie en édition', () => {
    render(<AdminInstrumentForm item={INSTRUMENT_BOURSE} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('affiche le champ ISIN pour la catégorie BOURSE', () => {
    render(<AdminInstrumentForm item={null} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('ISIN *')).toBeInTheDocument()
  })

  it('affiche les champs Boursorama et Twelve Data pour BOURSE', () => {
    render(<AdminInstrumentForm item={null} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Symbole Boursorama')).toBeInTheDocument()
    expect(screen.getByText('Symbole Twelve Data')).toBeInTheDocument()
  })

  it('affiche le champ Ticker pour la catégorie CRYPTO', () => {
    render(<AdminInstrumentForm item={INSTRUMENT_CRYPTO} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Ticker *')).toBeInTheDocument()
  })

  it('affiche le champ CoinGecko ID pour CRYPTO', () => {
    render(<AdminInstrumentForm item={INSTRUMENT_CRYPTO} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('ID CoinGecko')).toBeInTheDocument()
  })

  it('change les champs affichés au changement de catégorie vers CRYPTO', () => {
    render(<AdminInstrumentForm item={null} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('ISIN *')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('combobox'), { target: { name: 'category', value: 'CRYPTO' } })
    expect(screen.queryByText('ISIN *')).not.toBeInTheDocument()
    expect(screen.getByText('Ticker *')).toBeInTheDocument()
  })

  // ── Pré-remplissage en édition ────────────────────────────

  it('pré-remplit le nom et la devise', () => {
    render(<AdminInstrumentForm item={INSTRUMENT_BOURSE} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByDisplayValue('Amundi ETF S&P 500')).toBeInTheDocument()
    expect(screen.getByDisplayValue('EUR')).toBeInTheDocument()
  })

  it('pré-remplit le symbole Boursorama', () => {
    render(<AdminInstrumentForm item={INSTRUMENT_BOURSE} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByDisplayValue('1rTESE')).toBeInTheDocument()
  })

  it('coche "Prix fixe" si stablePrice=true', () => {
    render(<AdminInstrumentForm item={{ ...INSTRUMENT_BOURSE, stablePrice: true }} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  // ── Soumission ────────────────────────────────────────────

  it('appelle onSubmit avec le bon payload à la soumission', async () => {
    const onSubmit = vi.fn().mockResolvedValue()
    render(<AdminInstrumentForm item={INSTRUMENT_BOURSE} onSubmit={onSubmit} onCancel={vi.fn()} />)
    fireEvent.submit(document.querySelector('form'))
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Amundi ETF S&P 500', category: 'BOURSE' })
      )
    })
  })

  it('affiche une erreur si onSubmit lève une exception', async () => {
    const onSubmit = vi.fn().mockRejectedValue({ response: { data: { message: 'ISIN déjà existant' } } })
    render(<AdminInstrumentForm item={INSTRUMENT_BOURSE} onSubmit={onSubmit} onCancel={vi.fn()} />)
    fireEvent.submit(document.querySelector('form'))
    await waitFor(() => {
      expect(screen.getByText('ISIN déjà existant')).toBeInTheDocument()
    })
  })

  it('affiche "Ajouter" en création et "Enregistrer" en édition', () => {
    const { unmount } = render(<AdminInstrumentForm item={null} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Ajouter' })).toBeInTheDocument()
    unmount()
    render(<AdminInstrumentForm item={INSTRUMENT_BOURSE} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeInTheDocument()
  })

  // ── Annulation ────────────────────────────────────────────

  it('appelle onCancel au clic sur Annuler', () => {
    const onCancel = vi.fn()
    render(<AdminInstrumentForm item={null} onSubmit={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onCancel).toHaveBeenCalled()
  })
})
