import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PatrimoineStrategyModal from '../../../components/patrimoine/PatrimoineStrategyModal'
import { savePatrimoineTargets } from '../../../api/patrimoine'

vi.mock('../../../api/patrimoine', () => ({
  savePatrimoineTargets: vi.fn(),
  getPositions:          vi.fn(),
  getPatrimoineScore:    vi.fn(),
  getInstruments:        vi.fn(),
}))

vi.mock('../../../components/patrimoine/constants', () => ({
  CATEGORY_META: {
    LIQUIDITE:     { label: 'Liquidités',    color: 'bg-green-100 text-green-600',  icon: '💵' },
    LIVRET:        { label: 'Livret',         color: 'bg-green-100 text-green-700',  icon: '🏦' },
    BOURSE:        { label: 'Bourse',         color: 'bg-blue-100 text-blue-700',    icon: '📈' },
    CRYPTO:        { label: 'Crypto',         color: 'bg-yellow-100 text-yellow-600',icon: '🪙' },
    IMMO_PAPIER:   { label: 'Immo. Papier',   color: 'bg-gray-100 text-gray-500',    icon: '🏗️' },
    IMMO_PHYSIQUE: { label: 'Immo. Physique', color: 'bg-gray-100 text-gray-600',    icon: '🏠' },
  },
}))

const TARGETS = { BOURSE: 50000, CRYPTO: 10000 }

describe('PatrimoineStrategyModal', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Affichage ─────────────────────────────────────────────

  it('affiche le titre "Stratégie & Objectifs patrimoniaux"', () => {
    render(<PatrimoineStrategyModal onClose={vi.fn()} targets={{}} onSave={vi.fn()} />)
    expect(screen.getByText('Stratégie & Objectifs patrimoniaux')).toBeInTheDocument()
  })

  it('affiche les 6 catégories', () => {
    render(<PatrimoineStrategyModal onClose={vi.fn()} targets={{}} onSave={vi.fn()} />)
    expect(screen.getByText('Liquidités')).toBeInTheDocument()
    expect(screen.getByText('Livret')).toBeInTheDocument()
    expect(screen.getByText('Bourse')).toBeInTheDocument()
    expect(screen.getByText('Crypto')).toBeInTheDocument()
    expect(screen.getByText('Immo. Papier')).toBeInTheDocument()
    expect(screen.getByText('Immo. Physique')).toBeInTheDocument()
  })

  it('pré-remplit les objectifs existants', () => {
    render(<PatrimoineStrategyModal onClose={vi.fn()} targets={TARGETS} onSave={vi.fn()} />)
    expect(screen.getByDisplayValue('50000')).toBeInTheDocument()
    expect(screen.getByDisplayValue('10000')).toBeInTheDocument()
  })

  it('affiche 6 inputs "Pas d\'objectif" pour des targets vides', () => {
    render(<PatrimoineStrategyModal onClose={vi.fn()} targets={{}} onSave={vi.fn()} />)
    const inputs = screen.getAllByPlaceholderText("Pas d'objectif")
    expect(inputs).toHaveLength(6)
  })

  // ── Sauvegarde ────────────────────────────────────────────

  it('appelle savePatrimoineTargets avec les valeurs saisies', async () => {
    savePatrimoineTargets.mockResolvedValue(TARGETS)
    render(<PatrimoineStrategyModal onClose={vi.fn()} targets={TARGETS} onSave={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => {
      expect(savePatrimoineTargets).toHaveBeenCalledWith(
        expect.objectContaining({ BOURSE: 50000, CRYPTO: 10000 })
      )
    })
  })

  it('appelle onSave et onClose après sauvegarde réussie', async () => {
    const onSave  = vi.fn()
    const onClose = vi.fn()
    savePatrimoineTargets.mockResolvedValue(TARGETS)
    render(<PatrimoineStrategyModal onClose={onClose} targets={TARGETS} onSave={onSave} />)
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(TARGETS)
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('affiche une erreur si la sauvegarde échoue', async () => {
    savePatrimoineTargets.mockRejectedValue(new Error('Server error'))
    render(<PatrimoineStrategyModal onClose={vi.fn()} targets={TARGETS} onSave={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => {
      expect(screen.getByText("Impossible d'enregistrer les objectifs.")).toBeInTheDocument()
    })
  })

  // ── Fermeture ─────────────────────────────────────────────

  it('appelle onClose au clic sur "Annuler"', () => {
    const onClose = vi.fn()
    render(<PatrimoineStrategyModal onClose={onClose} targets={{}} onSave={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('appelle onClose au clic sur ✕', () => {
    const onClose = vi.fn()
    render(<PatrimoineStrategyModal onClose={onClose} targets={{}} onSave={vi.fn()} />)
    fireEvent.click(screen.getByText('✕'))
    expect(onClose).toHaveBeenCalled()
  })
})
