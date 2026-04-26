import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminAllocationModal from '../../../components/admin/AdminAllocationModal'
import { updateInstrumentAllocations } from '../../../api/patrimoine'

vi.mock('../../../api/patrimoine', () => ({
  updateInstrumentAllocations: vi.fn(),
  getPositions:                vi.fn(),
  getPatrimoineScore:          vi.fn(),
  getInstruments:              vi.fn(),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const INSTRUMENT_EMPTY = {
  id: 1, name: 'Lyxor CAC 40 ETF',
  countryAllocation: [],
}

const INSTRUMENT_WITH_ALLOC = {
  id: 2, name: 'iShares Core MSCI World',
  countryAllocation: [
    { country: 'États-Unis', percentage: 68 },
    { country: 'Japon',      percentage: 6  },
    { country: 'Autres',     percentage: 26 },
  ],
}

describe('AdminAllocationModal', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Affichage ─────────────────────────────────────────────

  it('affiche le titre "Allocation géographique"', () => {
    render(<AdminAllocationModal instrument={INSTRUMENT_EMPTY} onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Allocation géographique')).toBeInTheDocument()
  })

  it('affiche le nom de l\'instrument', () => {
    render(<AdminAllocationModal instrument={INSTRUMENT_EMPTY} onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Lyxor CAC 40 ETF')).toBeInTheDocument()
  })

  it('affiche une ligne vide par défaut si pas d\'allocation existante', () => {
    render(<AdminAllocationModal instrument={INSTRUMENT_EMPTY} onSave={vi.fn()} onCancel={vi.fn()} />)
    const inputs = screen.getAllByPlaceholderText('Pays')
    expect(inputs).toHaveLength(1)
    expect(inputs[0].value).toBe('')
  })

  it('pré-remplit les allocations existantes', () => {
    render(<AdminAllocationModal instrument={INSTRUMENT_WITH_ALLOC} onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByDisplayValue('États-Unis')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Japon')).toBeInTheDocument()
    expect(screen.getByDisplayValue('68')).toBeInTheDocument()
  })

  // ── Total ─────────────────────────────────────────────────

  it('affiche le total à 100 % en vert si correct', () => {
    render(<AdminAllocationModal instrument={INSTRUMENT_WITH_ALLOC} onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Total : 100.00 %')).toBeInTheDocument()
  })

  it('affiche un avertissement si le total est différent de 100 %', () => {
    render(<AdminAllocationModal instrument={INSTRUMENT_EMPTY} onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText(/devrait être 100 %/)).toBeInTheDocument()
  })

  // ── Ajout / suppression de lignes ─────────────────────────

  it('ajoute une ligne au clic sur "+ Ajouter un pays"', () => {
    render(<AdminAllocationModal instrument={INSTRUMENT_EMPTY} onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getAllByPlaceholderText('Pays')).toHaveLength(1)
    fireEvent.click(screen.getByText('+ Ajouter un pays'))
    expect(screen.getAllByPlaceholderText('Pays')).toHaveLength(2)
  })

  it('supprime une ligne au clic sur × (si plus d\'une ligne)', () => {
    render(<AdminAllocationModal instrument={INSTRUMENT_WITH_ALLOC} onSave={vi.fn()} onCancel={vi.fn()} />)
    const deleteButtons = screen.getAllByText('×')
    expect(deleteButtons).toHaveLength(3)
    fireEvent.click(deleteButtons[0])
    expect(screen.getAllByPlaceholderText('Pays')).toHaveLength(2)
  })

  it('désactive le bouton × si une seule ligne', () => {
    render(<AdminAllocationModal instrument={INSTRUMENT_EMPTY} onSave={vi.fn()} onCancel={vi.fn()} />)
    const deleteBtn = screen.getByText('×')
    expect(deleteBtn).toBeDisabled()
  })

  // ── Sauvegarde ────────────────────────────────────────────

  it('appelle updateInstrumentAllocations avec les entrées valides', async () => {
    updateInstrumentAllocations.mockResolvedValue([{ country: 'France', percentage: 100 }])
    const onSave = vi.fn()
    render(<AdminAllocationModal instrument={INSTRUMENT_EMPTY} onSave={onSave} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('Pays'), { target: { value: 'France' } })
    fireEvent.change(screen.getByPlaceholderText('%'), { target: { value: '100' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() => {
      expect(updateInstrumentAllocations).toHaveBeenCalledWith(1, [{ country: 'France', percentage: 100 }])
      expect(onSave).toHaveBeenCalledWith(1, [{ country: 'France', percentage: 100 }])
    })
  })

  it('affiche une erreur si la sauvegarde échoue', async () => {
    updateInstrumentAllocations.mockRejectedValue(new Error('Server error'))
    render(<AdminAllocationModal instrument={INSTRUMENT_WITH_ALLOC} onSave={vi.fn()} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => {
      expect(screen.getByText('Erreur lors de la sauvegarde.')).toBeInTheDocument()
    })
  })

  // ── Annulation ────────────────────────────────────────────

  it('appelle onCancel au clic sur Annuler', () => {
    const onCancel = vi.fn()
    render(<AdminAllocationModal instrument={INSTRUMENT_EMPTY} onSave={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onCancel).toHaveBeenCalled()
  })
})
