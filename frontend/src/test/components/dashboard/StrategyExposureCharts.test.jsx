import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import PatrimoineStrategyRadarChart from '../../../components/dashboard/PatrimoineStrategyRadarChart'
import GeographicExposureWidget from '../../../components/dashboard/GeographicExposureWidget'
import SectorExposureWidget from '../../../components/dashboard/SectorExposureWidget'
import { getPositions, getPatrimoineTargets, getInstruments } from '../../../api/patrimoine'

vi.mock('../../../api/patrimoine', () => ({
  getPositions:         vi.fn(),
  getPatrimoineTargets: vi.fn(),
  getInstruments:       vi.fn(),
}))

const BOURSE_POSITION = {
  id: 1,
  status: 'ACTIVE',
  category: 'BOURSE',
  instrument: { id: 10 },
  computed: { currentValueEur: 10000 },
}

// ── PatrimoineStrategyRadarChart ───────────────────────────────────────────────

describe('PatrimoineStrategyRadarChart', () => {
  beforeEach(() => vi.clearAllMocks())

  it('affiche "Chargement…" pendant le fetch', () => {
    getPositions.mockReturnValue(new Promise(() => {}))
    getPatrimoineTargets.mockReturnValue(new Promise(() => {}))
    render(<PatrimoineStrategyRadarChart />)
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })

  it("affiche une erreur si l'API échoue", async () => {
    getPositions.mockRejectedValue(new Error('network'))
    getPatrimoineTargets.mockRejectedValue(new Error('network'))
    render(<PatrimoineStrategyRadarChart />)
    await waitFor(() => {
      expect(screen.getByText(/Impossible de charger/)).toBeInTheDocument()
    })
  })

  it('affiche "Aucun objectif défini" quand les cibles sont vides', async () => {
    getPositions.mockResolvedValue([])
    getPatrimoineTargets.mockResolvedValue({ targets: {}, breakdowns: {} })
    render(<PatrimoineStrategyRadarChart />)
    await waitFor(() => {
      expect(screen.getByText(/Aucun objectif défini/)).toBeInTheDocument()
    })
  })

  it('n\'affiche pas l\'état vide quand des objectifs sont définis', async () => {
    getPositions.mockResolvedValue([BOURSE_POSITION])
    getPatrimoineTargets.mockResolvedValue({ targets: { BOURSE: 15000 }, breakdowns: {} })
    render(<PatrimoineStrategyRadarChart />)
    await waitFor(() => {
      expect(screen.queryByText(/Aucun objectif défini/)).not.toBeInTheDocument()
      expect(screen.queryByText('Chargement…')).not.toBeInTheDocument()
    })
  })
})

// ── GeographicExposureWidget ───────────────────────────────────────────────────

describe('GeographicExposureWidget', () => {
  beforeEach(() => vi.clearAllMocks())

  it('affiche "Chargement…" pendant le fetch', () => {
    getPositions.mockReturnValue(new Promise(() => {}))
    getInstruments.mockReturnValue(new Promise(() => {}))
    render(<GeographicExposureWidget />)
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })

  it("affiche une erreur si l'API échoue", async () => {
    getPositions.mockRejectedValue(new Error('network'))
    getInstruments.mockRejectedValue(new Error('network'))
    render(<GeographicExposureWidget />)
    await waitFor(() => {
      expect(screen.getByText(/Impossible de charger/)).toBeInTheDocument()
    })
  })

  it('affiche "Aucune position BOURSE" sans positions BOURSE allouées', async () => {
    getPositions.mockResolvedValue([])
    getInstruments.mockResolvedValue([])
    render(<GeographicExposureWidget />)
    await waitFor(() => {
      expect(screen.getByText(/Aucune position BOURSE avec allocation géographique/)).toBeInTheDocument()
    })
  })

  it('affiche la légende géographique avec des allocations renseignées', async () => {
    getInstruments.mockResolvedValue([{
      id: 10,
      countryAllocation: [{ country: 'US', percentage: 60 }, { country: 'France', percentage: 40 }],
    }])
    render(<GeographicExposureWidget positions={[BOURSE_POSITION]} size="lg" />)
    await waitFor(() => {
      expect(screen.getByText('US')).toBeInTheDocument()
      expect(screen.getByText('France')).toBeInTheDocument()
    })
  })
})

// ── SectorExposureWidget ───────────────────────────────────────────────────────

describe('SectorExposureWidget', () => {
  beforeEach(() => vi.clearAllMocks())

  it('affiche "Chargement…" pendant le fetch', () => {
    getPositions.mockReturnValue(new Promise(() => {}))
    getInstruments.mockReturnValue(new Promise(() => {}))
    render(<SectorExposureWidget />)
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })

  it("affiche une erreur si l'API échoue", async () => {
    getPositions.mockRejectedValue(new Error('network'))
    getInstruments.mockRejectedValue(new Error('network'))
    render(<SectorExposureWidget />)
    await waitFor(() => {
      expect(screen.getByText(/Impossible de charger/)).toBeInTheDocument()
    })
  })

  it('affiche "Aucune position BOURSE" sans allocations sectorielles', async () => {
    getPositions.mockResolvedValue([])
    getInstruments.mockResolvedValue([])
    render(<SectorExposureWidget />)
    await waitFor(() => {
      expect(screen.getByText(/Aucune position BOURSE avec répartition sectorielle/)).toBeInTheDocument()
    })
  })

  it('n\'affiche pas l\'état vide quand des allocations sectorielles existent', async () => {
    getInstruments.mockResolvedValue([{
      id: 10,
      sectorAllocation: [{ sector: 'Technology', percentage: 70 }, { sector: 'Healthcare', percentage: 30 }],
    }])
    render(<SectorExposureWidget positions={[BOURSE_POSITION]} />)
    await waitFor(() => {
      expect(screen.queryByText(/Aucune position BOURSE avec répartition sectorielle/)).not.toBeInTheDocument()
      expect(screen.queryByText('Chargement…')).not.toBeInTheDocument()
    })
  })
})
