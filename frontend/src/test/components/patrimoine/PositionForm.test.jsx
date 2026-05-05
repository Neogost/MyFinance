import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PositionForm from '../../../components/patrimoine/PositionForm'
import { getInstruments, createInstrument } from '../../../api/patrimoine'

vi.mock('../../../api/patrimoine', () => ({
  getInstruments: vi.fn(),
  createInstrument: vi.fn(),
  getPositions: vi.fn(),
  getPatrimoineScore: vi.fn(),
}))

vi.mock('../../../components/patrimoine/constants', () => ({
  CATEGORY_META: {
    BOURSE:        { label: 'Bourse',         icon: '📈' },
    CRYPTO:        { label: 'Crypto',         icon: '🪙' },
    IMMO_PAPIER:   { label: 'Immo. Papier',   icon: '🏗️' },
    IMMO_PHYSIQUE: { label: 'Immo. Physique', icon: '🏠' },
    LIVRET:        { label: 'Livret',         icon: '🏦' },
    LIQUIDITE:     { label: 'Liquidités',     icon: '💵' },
  },
  FISCAL_ENVELOPE_LABELS: {
    NONE: { label: 'Hors enveloppe', formLabel: 'Hors enveloppe fiscale' },
    CTO:  { label: 'CTO',            formLabel: 'CTO' },
    PEA:  { label: 'PEA',            formLabel: 'PEA' },
    AV:   { label: 'AV',             formLabel: 'AV' },
  },
  FISCAL_ENVELOPES_BY_CATEGORY: {
    BOURSE:      ['CTO', 'PEA', 'AV'],
    CRYPTO:      ['FLAT_TAX'],
    IMMO_PAPIER: ['FLAT_TAX'],
  },
  ASSET_SUB_TYPES: [
    { value: 'ETF', label: 'ETF' },
    { value: 'ACTION', label: 'Action' },
  ],
  OWNERSHIP_TYPES: [
    { value: 'PLEINE_PROPRIETE', label: 'Pleine propriété' },
    { value: 'NUE_PROPRIETE',   label: 'Nue-propriété' },
  ],
  PROJECTION_RATES: { BOURSE: 0.07, CRYPTO: 0.15 },
  PROPERTY_USAGE_TYPES: [
    { value: '',                     label: '— Non renseigné —' },
    { value: 'RESIDENCE_PRINCIPALE', label: 'Résidence principale' },
    { value: 'LOCATIF',              label: 'Locatif' },
    { value: 'SECONDAIRE_LOISIRS',   label: 'Résidence secondaire / Loisirs' },
    { value: 'AUTRE',                label: 'Autre' },
  ],
}))

const INSTRUMENT_ETF = {
  id: 1, category: 'BOURSE', isin: 'FR0010315770',
  name: 'Lyxor CAC 40 ETF', currency: 'EUR', lastPrice: 32.15,
}

describe('PositionForm — wizard 2 étapes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getInstruments.mockResolvedValue([])
  })

  // ── Étape 1 — Sélection de catégorie ─────────────────────────────────────

  it('affiche l\'étape 1 par défaut pour une création', () => {
    render(<PositionForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Choisissez le type de position à créer :')).toBeInTheDocument()
  })

  it('affiche les 6 catégories dans l\'étape 1', () => {
    render(<PositionForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Bourse')).toBeInTheDocument()
    expect(screen.getByText('Crypto')).toBeInTheDocument()
    expect(screen.getByText('Immo. Papier')).toBeInTheDocument()
    expect(screen.getByText('Immo. Physique')).toBeInTheDocument()
    expect(screen.getByText('Livret')).toBeInTheDocument()
    expect(screen.getByText('Liquidités')).toBeInTheDocument()
  })

  it('affiche "Nouvelle position" comme titre', () => {
    render(<PositionForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Nouvelle position')).toBeInTheDocument()
  })

  it('passe à l\'étape 2 après sélection d\'une catégorie', () => {
    render(<PositionForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByText('Livret'))
    expect(screen.queryByText('Choisissez le type de position à créer :')).not.toBeInTheDocument()
  })

  it('appelle onCancel depuis l\'étape 1', () => {
    const onCancel = vi.fn()
    render(<PositionForm onSubmit={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  // ── Étape 2 — BOURSE ──────────────────────────────────────────────────────

  it('affiche la recherche d\'instrument pour BOURSE', () => {
    render(<PositionForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByText('Bourse'))
    expect(screen.getByPlaceholderText(/Rechercher par ISIN/)).toBeInTheDocument()
  })

  it('recherche des instruments via API après saisie de 2+ caractères', async () => {
    getInstruments.mockResolvedValue([INSTRUMENT_ETF])
    render(<PositionForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByText('Bourse'))

    const searchInput = screen.getByPlaceholderText(/Rechercher par ISIN/)
    fireEvent.change(searchInput, { target: { value: 'FR00' } })

    await waitFor(() => {
      expect(getInstruments).toHaveBeenCalled()
    }, { timeout: 500 })
  })

  it('affiche "Créer un nouvel instrument" quand aucun résultat (après debounce)', async () => {
    getInstruments.mockResolvedValue([])
    render(<PositionForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByText('Bourse'))

    const searchInput = screen.getByPlaceholderText(/Rechercher par ISIN/)
    fireEvent.change(searchInput, { target: { value: 'XY123' } })

    await waitFor(() => {
      expect(screen.getByText(/Créer un nouvel instrument/)).toBeInTheDocument()
    }, { timeout: 600 })
  })

  // ── Étape 2 — LIQUIDITE ───────────────────────────────────────────────────

  it('affiche le champ "Solde actuel" pour LIQUIDITE', () => {
    render(<PositionForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByText('Liquidités'))
    expect(screen.getByText(/Solde actuel/)).toBeInTheDocument()
  })

  it("n'affiche pas la recherche d'instrument pour LIQUIDITE", () => {
    render(<PositionForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByText('Liquidités'))
    expect(screen.queryByPlaceholderText(/Rechercher par ISIN/)).not.toBeInTheDocument()
  })

  // ── Étape 2 — IMMO_PHYSIQUE ───────────────────────────────────────────────

  it('affiche les champs spécifiques à IMMO_PHYSIQUE', () => {
    render(<PositionForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByText('Immo. Physique'))
    expect(screen.getByText(/Type de propriété/)).toBeInTheDocument()
    expect(screen.getByText(/Adresse/)).toBeInTheDocument()
    expect(screen.getByText(/Valeur estimée/)).toBeInTheDocument()  // label réel : "Valeur estimée (€)"
    expect(screen.getByText(/Date d'acquisition/)).toBeInTheDocument()
    expect(screen.getByText(/Prix d'acquisition/)).toBeInTheDocument()
  })

  // ── Étape 2 — LIVRET ─────────────────────────────────────────────────────

  it('affiche le champ "Taux annuel" pour LIVRET', () => {
    render(<PositionForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByText('Livret'))
    expect(screen.getByText(/Taux annuel/)).toBeInTheDocument()
  })

  // ── Mode édition ──────────────────────────────────────────────────────────

  it('démarre à l\'étape 2 en mode édition', () => {
    const position = {
      id: 1, category: 'LIVRET', label: 'Livret A', partner: 'Banque',
      currency: 'EUR', annualRate: 3, fiscalEnvelope: 'NONE',
      includeInIncomeProjection: true,
    }
    render(<PositionForm position={position} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.queryByText('Choisissez le type de position à créer :')).not.toBeInTheDocument()
    expect(screen.getByText('Modifier la position')).toBeInTheDocument()
  })

  it('préfille le label en mode édition', () => {
    const position = {
      id: 1, category: 'LIVRET', label: 'Livret A', currency: 'EUR',
      annualRate: 3, fiscalEnvelope: 'NONE', includeInIncomeProjection: true,
    }
    render(<PositionForm position={position} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByDisplayValue('Livret A')).toBeInTheDocument()
  })

  // ── Soumission ────────────────────────────────────────────────────────────

  it('appelle onSubmit avec category et les champs renseignés', async () => {
    const onSubmit = vi.fn().mockResolvedValue()
    render(<PositionForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    // Étape 1 : sélectionner LIQUIDITE
    fireEvent.click(screen.getByText('Liquidités'))

    // Attendre le rendu de l'étape 2 puis soumettre via l'événement submit du form
    await waitFor(() => expect(screen.getByText(/Solde actuel/)).toBeInTheDocument())
    const form = document.querySelector('form')
    fireEvent.submit(form)

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'LIQUIDITE' })
      )
    })
  })

  it('appelle onCancel depuis l\'étape 2', () => {
    const onCancel = vi.fn()
    render(<PositionForm onSubmit={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByText('Livret'))
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
