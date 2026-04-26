import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import PatrimoineEvolutionChart from '../../../components/dashboard/PatrimoineEvolutionChart'
import { getSnapshots, getSnapshot, getPositions } from '../../../api/patrimoine'

vi.mock('../../../api/patrimoine', () => ({
  getSnapshots: vi.fn(),
  getSnapshot:  vi.fn(),
  getPositions: vi.fn(),
}))

describe('PatrimoineEvolutionChart', () => {
  beforeEach(() => vi.clearAllMocks())

  it('affiche "Chargement…" pendant le fetch initial', () => {
    getSnapshots.mockReturnValue(new Promise(() => {}))
    getPositions.mockReturnValue(new Promise(() => {}))
    render(<PatrimoineEvolutionChart />)
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })

  it("affiche une erreur si l'API échoue", async () => {
    getSnapshots.mockRejectedValue(new Error('network'))
    getPositions.mockRejectedValue(new Error('network'))
    render(<PatrimoineEvolutionChart />)
    await waitFor(() => {
      expect(screen.getByText(/Impossible de charger/)).toBeInTheDocument()
    })
  })

  it('affiche les boutons de mode même sans snapshot (point live)', async () => {
    getSnapshots.mockResolvedValue([])
    getPositions.mockResolvedValue([])
    render(<PatrimoineEvolutionChart />)
    await waitFor(() => {
      expect(screen.getByText('Valeur (€)')).toBeInTheDocument()
      expect(screen.getByText('Répartition (%)')).toBeInTheDocument()
    })
  })

  it('affiche les boutons de mode avec des snapshots', async () => {
    const snapshot = {
      id: 1,
      snapshotDate: '2024-01-01',
      positionSnapshots: [
        { position: { category: 'BOURSE' }, currentValueEur: 10000 },
      ],
    }
    getSnapshots.mockResolvedValue([{ id: 1, snapshotDate: '2024-01-01' }])
    getSnapshot.mockResolvedValue(snapshot)
    getPositions.mockResolvedValue([])
    render(<PatrimoineEvolutionChart />)
    await waitFor(() => {
      expect(screen.getByText('Valeur (€)')).toBeInTheDocument()
      expect(screen.getByText('Répartition (%)')).toBeInTheDocument()
    })
  })
})
