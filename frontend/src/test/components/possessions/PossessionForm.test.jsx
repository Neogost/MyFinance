import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PossessionForm from '../../../components/possessions/PossessionForm'

const POSSESSION = {
  id: 1,
  category: 'VEHICULE',
  label: 'Renault Clio 2022',
  purchasePrice: 18500,
  purchaseDate: '2022-01-15',
  estimatedCurrentValue: null,
  notes: 'Kilométrage 45 000 km',
}

describe('PossessionForm', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Titre création / édition ───────────────────────────────

  it('affiche le titre de création', () => {
    render(<PossessionForm possession={null} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Ajouter une grande possession')).toBeInTheDocument()
  })

  it('affiche le titre d\'édition', () => {
    render(<PossessionForm possession={POSSESSION} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Modifier la possession')).toBeInTheDocument()
  })

  // ── Pré-remplissage en édition ────────────────────────────

  it('pré-remplit le libellé en édition', () => {
    render(<PossessionForm possession={POSSESSION} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByDisplayValue('Renault Clio 2022')).toBeInTheDocument()
  })

  it('pré-remplit le prix d\'achat en édition', () => {
    render(<PossessionForm possession={POSSESSION} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByDisplayValue('18500')).toBeInTheDocument()
  })

  it('pré-remplit les notes en édition', () => {
    render(<PossessionForm possession={POSSESSION} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByDisplayValue('Kilométrage 45 000 km')).toBeInTheDocument()
  })

  // ── Sélecteur de catégorie ────────────────────────────────

  it('affiche les 7 catégories dans le sélecteur', () => {
    render(<PossessionForm possession={null} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Véhicule')).toBeInTheDocument()
    expect(screen.getByText('Informatique & High-tech')).toBeInTheDocument()
    expect(screen.getByText('Collection')).toBeInTheDocument()
  })

  // ── Aperçu projection ─────────────────────────────────────

  it('affiche la projection automatique quand prix + date sont remplis', () => {
    render(<PossessionForm possession={POSSESSION} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Valeur estimée automatiquement')).toBeInTheDocument()
  })

  it('n\'affiche pas la projection si le prix d\'achat est vide', () => {
    render(<PossessionForm possession={null} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.queryByText('Valeur estimée automatiquement')).not.toBeInTheDocument()
  })

  it('masque la projection automatique quand une valeur manuelle est saisie', () => {
    // Quand estimatedCurrentValue est renseigné, projected = null → pas de bloc "Valeur estimée automatiquement"
    const withOverride = { ...POSSESSION, estimatedCurrentValue: 12000 }
    render(<PossessionForm possession={withOverride} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.queryByText('Valeur estimée automatiquement')).not.toBeInTheDocument()
  })

  // ── Soumission ────────────────────────────────────────────

  it('appelle onSubmit avec le bon payload', async () => {
    const onSubmit = vi.fn().mockResolvedValue()
    render(<PossessionForm possession={POSSESSION} onSubmit={onSubmit} onCancel={vi.fn()} />)
    fireEvent.submit(document.querySelector('form'))
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'VEHICULE',
          label: 'Renault Clio 2022',
          purchasePrice: 18500,
        })
      )
    })
  })

  it('affiche une erreur si onSubmit lève une exception', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Network error'))
    render(<PossessionForm possession={POSSESSION} onSubmit={onSubmit} onCancel={vi.fn()} />)
    fireEvent.submit(document.querySelector('form'))
    await waitFor(() => {
      expect(screen.getByText('Une erreur est survenue.')).toBeInTheDocument()
    })
  })

  it('affiche "Ajouter" pour une création et "Enregistrer" pour une édition', () => {
    const { unmount } = render(<PossessionForm possession={null} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Ajouter' })).toBeInTheDocument()
    unmount()
    render(<PossessionForm possession={POSSESSION} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeInTheDocument()
  })

  // ── Annulation ────────────────────────────────────────────

  it('appelle onCancel au clic sur Annuler', () => {
    const onCancel = vi.fn()
    render(<PossessionForm possession={null} onSubmit={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onCancel).toHaveBeenCalled()
  })
})
