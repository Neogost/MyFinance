import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminSectorAllocationModal from '../../../components/admin/AdminSectorAllocationModal'
import { updateInstrumentSectorAllocations } from '../../../api/patrimoine'

vi.mock('../../../api/patrimoine', () => ({
  updateInstrumentSectorAllocations: vi.fn(),
  getPositions:                      vi.fn(),
  getPatrimoineScore:                vi.fn(),
  getInstruments:                    vi.fn(),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const INSTRUMENT_EMPTY = {
  id: 1, name: 'Amundi ETF S&P 500',
  sectorAllocation: [],
}

const INSTRUMENT_WITH_SECTORS = {
  id: 2, name: 'iShares Core MSCI World',
  sectorAllocation: [
    { sector: 'Technologie',    percentage: 24 },
    { sector: 'Finance',        percentage: 14 },
    { sector: 'Santé',          percentage: 12 },
    { sector: 'Consommation',   percentage: 50 },
  ],
}

describe('AdminSectorAllocationModal', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Affichage ─────────────────────────────────────────────

  it('affiche le titre "Répartition sectorielle"', () => {
    render(<AdminSectorAllocationModal instrument={INSTRUMENT_EMPTY} onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Répartition sectorielle')).toBeInTheDocument()
  })

  it('affiche le nom de l\'instrument', () => {
    render(<AdminSectorAllocationModal instrument={INSTRUMENT_EMPTY} onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Amundi ETF S&P 500')).toBeInTheDocument()
  })

  it('affiche une ligne vide par défaut si pas d\'allocation existante', () => {
    render(<AdminSectorAllocationModal instrument={INSTRUMENT_EMPTY} onSave={vi.fn()} onCancel={vi.fn()} />)
    const inputs = screen.getAllByPlaceholderText('Secteur')
    expect(inputs).toHaveLength(1)
    expect(inputs[0].value).toBe('')
  })

  it('pré-remplit les secteurs existants', () => {
    render(<AdminSectorAllocationModal instrument={INSTRUMENT_WITH_SECTORS} onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByDisplayValue('Technologie')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Finance')).toBeInTheDocument()
    expect(screen.getByDisplayValue('24')).toBeInTheDocument()
  })

  // ── Total ─────────────────────────────────────────────────

  it('affiche le total à 100 % en vert si correct', () => {
    render(<AdminSectorAllocationModal instrument={INSTRUMENT_WITH_SECTORS} onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Total : 100.00 %')).toBeInTheDocument()
  })

  it('affiche un avertissement si le total diffère de 100 %', () => {
    render(<AdminSectorAllocationModal instrument={INSTRUMENT_EMPTY} onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText(/devrait être 100 %/)).toBeInTheDocument()
  })

  // ── Ajout / suppression de lignes ─────────────────────────

  it('ajoute une ligne au clic sur "+ Ajouter un secteur"', () => {
    render(<AdminSectorAllocationModal instrument={INSTRUMENT_EMPTY} onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getAllByPlaceholderText('Secteur')).toHaveLength(1)
    fireEvent.click(screen.getByText('+ Ajouter un secteur'))
    expect(screen.getAllByPlaceholderText('Secteur')).toHaveLength(2)
  })

  it('supprime une ligne au clic sur × (si plus d\'une ligne)', () => {
    render(<AdminSectorAllocationModal instrument={INSTRUMENT_WITH_SECTORS} onSave={vi.fn()} onCancel={vi.fn()} />)
    const deleteButtons = screen.getAllByText('×')
    expect(deleteButtons).toHaveLength(4)
    fireEvent.click(deleteButtons[0])
    expect(screen.getAllByPlaceholderText('Secteur')).toHaveLength(3)
  })

  it('désactive le bouton × si une seule ligne', () => {
    render(<AdminSectorAllocationModal instrument={INSTRUMENT_EMPTY} onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('×')).toBeDisabled()
  })

  // ── Sauvegarde ────────────────────────────────────────────

  it('appelle updateInstrumentSectorAllocations avec les entrées valides', async () => {
    updateInstrumentSectorAllocations.mockResolvedValue([{ sector: 'Tech', percentage: 100 }])
    const onSave = vi.fn()
    render(<AdminSectorAllocationModal instrument={INSTRUMENT_EMPTY} onSave={onSave} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('Secteur'), { target: { value: 'Tech' } })
    fireEvent.change(screen.getByPlaceholderText('%'), { target: { value: '100' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() => {
      expect(updateInstrumentSectorAllocations).toHaveBeenCalledWith(1, [{ sector: 'Tech', percentage: 100 }])
      expect(onSave).toHaveBeenCalledWith(1, [{ sector: 'Tech', percentage: 100 }])
    })
  })

  it('affiche une erreur si la sauvegarde échoue', async () => {
    updateInstrumentSectorAllocations.mockRejectedValue(new Error('Server error'))
    render(<AdminSectorAllocationModal instrument={INSTRUMENT_WITH_SECTORS} onSave={vi.fn()} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => {
      expect(screen.getByText('Erreur lors de la sauvegarde.')).toBeInTheDocument()
    })
  })

  // ── Annulation ────────────────────────────────────────────

  it('appelle onCancel au clic sur Annuler', () => {
    const onCancel = vi.fn()
    render(<AdminSectorAllocationModal instrument={INSTRUMENT_EMPTY} onSave={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onCancel).toHaveBeenCalled()
  })
})
