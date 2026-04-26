import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SnapshotPanel from '../../../components/patrimoine/SnapshotPanel'
import { getSnapshots, createSnapshot, createSnapshotForAll, recalculateSnapshot } from '../../../api/patrimoine'

vi.mock('../../../api/patrimoine', () => ({
  getSnapshots:          vi.fn(),
  createSnapshot:        vi.fn(),
  createSnapshotForAll:  vi.fn(),
  recalculateSnapshot:   vi.fn(),
  getPositions:          vi.fn(),
  getPatrimoineScore:    vi.fn(),
  getInstruments:        vi.fn(),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SNAPSHOTS = [
  {
    id: 1,
    snapshotDate: '2026-01-01',
    totalInvestedEur: 80000,
    totalCurrentValueEur: 95000,
    totalCapitalGainEur: 15000,
  },
  {
    id: 2,
    snapshotDate: '2025-07-01',
    totalInvestedEur: 75000,
    totalCurrentValueEur: 88000,
    totalCapitalGainEur: 13000,
  },
]

describe('SnapshotPanel', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Chargement ────────────────────────────────────────────

  it('affiche "Chargement…" pendant le fetch initial', () => {
    getSnapshots.mockReturnValue(new Promise(() => {}))
    render(<SnapshotPanel onClose={vi.fn()} />)
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })

  it('affiche "Aucun relevé existant" quand la liste est vide', async () => {
    getSnapshots.mockResolvedValue([])
    render(<SnapshotPanel onClose={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('Aucun relevé existant.')).toBeInTheDocument()
    })
  })

  it('affiche les relevés après chargement', async () => {
    getSnapshots.mockResolvedValue(SNAPSHOTS)
    render(<SnapshotPanel onClose={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText(/1 janvier 2026/)).toBeInTheDocument()
      expect(screen.getByText(/1 juillet 2025/)).toBeInTheDocument()
    })
  })

  it('affiche l\'erreur si le chargement échoue', async () => {
    getSnapshots.mockRejectedValue(new Error('Network error'))
    render(<SnapshotPanel onClose={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('Impossible de charger les relevés.')).toBeInTheDocument()
    })
  })

  // ── Titre et structure ────────────────────────────────────

  it('affiche le titre "Relevés de patrimoine"', async () => {
    getSnapshots.mockResolvedValue([])
    render(<SnapshotPanel onClose={vi.fn()} />)
    expect(screen.getByText('Relevés de patrimoine')).toBeInTheDocument()
  })

  it('affiche les boutons "Mon relevé" et "Tous les utilisateurs"', async () => {
    getSnapshots.mockResolvedValue([])
    render(<SnapshotPanel onClose={vi.fn()} />)
    expect(screen.getByText('Mon relevé')).toBeInTheDocument()
    expect(screen.getByText('Tous les utilisateurs')).toBeInTheDocument()
  })

  // ── Création ──────────────────────────────────────────────

  it('crée un relevé au clic sur "Mon relevé"', async () => {
    createSnapshot.mockResolvedValue({})
    getSnapshots
      .mockResolvedValueOnce([])
      .mockResolvedValue(SNAPSHOTS)
    render(<SnapshotPanel onClose={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('Mon relevé')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Mon relevé'))
    await waitFor(() => {
      expect(createSnapshot).toHaveBeenCalledWith(expect.objectContaining({ snapshotDate: expect.any(String) }))
    })
  })

  it('affiche un message de succès après création', async () => {
    createSnapshot.mockResolvedValue({})
    getSnapshots.mockResolvedValue([])
    render(<SnapshotPanel onClose={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('Mon relevé')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Mon relevé'))
    await waitFor(() => {
      expect(screen.getByText(/généré avec succès/)).toBeInTheDocument()
    })
  })

  it('affiche une erreur si la création échoue', async () => {
    createSnapshot.mockRejectedValue(new Error('Server error'))
    getSnapshots.mockResolvedValue([])
    render(<SnapshotPanel onClose={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('Mon relevé')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Mon relevé'))
    await waitFor(() => {
      expect(screen.getByText(/Erreur lors de la génération/)).toBeInTheDocument()
    })
  })

  // ── Recalcul ──────────────────────────────────────────────

  it('affiche le bouton "Recalculer" pour chaque relevé', async () => {
    getSnapshots.mockResolvedValue(SNAPSHOTS)
    render(<SnapshotPanel onClose={vi.fn()} />)
    await waitFor(() => expect(screen.getAllByText('Recalculer')).toHaveLength(2))
  })

  it('appelle recalculateSnapshot au clic sur "Recalculer"', async () => {
    recalculateSnapshot.mockResolvedValue({})
    getSnapshots.mockResolvedValue(SNAPSHOTS)
    render(<SnapshotPanel onClose={vi.fn()} />)
    await waitFor(() => expect(screen.getAllByText('Recalculer')[0]).toBeInTheDocument())
    fireEvent.click(screen.getAllByText('Recalculer')[0])
    await waitFor(() => {
      expect(recalculateSnapshot).toHaveBeenCalledWith(SNAPSHOTS[0].id)
    })
  })

  // ── Fermeture ─────────────────────────────────────────────

  it('appelle onClose au clic sur "Fermer"', async () => {
    getSnapshots.mockResolvedValue([])
    const onClose = vi.fn()
    render(<SnapshotPanel onClose={onClose} />)
    await waitFor(() => expect(screen.queryByText('Chargement…')).not.toBeInTheDocument())
    fireEvent.click(screen.getByText('Fermer'))
    expect(onClose).toHaveBeenCalled()
  })
})
