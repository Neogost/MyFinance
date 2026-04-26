import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import PatrimoineScoreWidget from '../../../components/dashboard/PatrimoineScoreWidget'
import { getPatrimoineScore } from '../../../api/patrimoine'

vi.mock('../../../api/patrimoine', () => ({
  getPatrimoineScore: vi.fn(),
  getPositions: vi.fn(),
  getInstruments: vi.fn(),
}))

const SCORE_DATA = {
  totalScore: 63,
  maxScore: 105,
  profile: 'EQUILIBRE',
  weakestAxisId: 'epargne',
  weakestAxisAdvice: 'Votre taux d\'épargne peut être amélioré. Visez 15 % minimum.',
  axes: [
    { id: 'diversification', label: 'Diversification', score: 13, maxScore: 20, detail: '3 catégories', missingData: false },
    { id: 'matelas',         label: 'Matelas de sécurité', score: 12, maxScore: 15, detail: '3 mois couverts', missingData: false },
    { id: 'endettement',     label: 'Endettement',  score: 18, maxScore: 20, detail: 'Ratio 28 %', missingData: false },
    { id: 'epargne',         label: 'Épargne',       score: 8,  maxScore: 20, detail: 'Taux 8 %', missingData: false },
    { id: 'age_risque',      label: 'Âge & Risque',  score: 10, maxScore: 15, detail: 'Cohérent', missingData: false },
    { id: 'progression',     label: 'Progression',   score: 2,  maxScore: 10, detail: '2 snapshots', missingData: false },
  ],
}

describe('PatrimoineScoreWidget', () => {
  beforeEach(() => vi.clearAllMocks())

  it('affiche "Chargement…" pendant le fetch', () => {
    getPatrimoineScore.mockReturnValue(new Promise(() => {}))
    render(<PatrimoineScoreWidget />)
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })

  it('affiche "Score indisponible" si l\'API échoue', async () => {
    getPatrimoineScore.mockRejectedValue(new Error('error'))
    render(<PatrimoineScoreWidget />)
    await waitFor(() => {
      expect(screen.getByText('Score indisponible.')).toBeInTheDocument()
    })
  })

  it('affiche "Score indisponible" si l\'API retourne null', async () => {
    getPatrimoineScore.mockResolvedValue(null)
    render(<PatrimoineScoreWidget />)
    await waitFor(() => {
      expect(screen.getByText('Score indisponible.')).toBeInTheDocument()
    })
  })

  it('affiche le score total', async () => {
    getPatrimoineScore.mockResolvedValue(SCORE_DATA)
    render(<PatrimoineScoreWidget />)
    await waitFor(() => {
      expect(screen.getByText('63')).toBeInTheDocument()
      expect(screen.getByText(/105 pts/)).toBeInTheDocument()
    })
  })

  it('affiche le profil "Équilibré"', async () => {
    getPatrimoineScore.mockResolvedValue(SCORE_DATA)
    render(<PatrimoineScoreWidget />)
    await waitFor(() => {
      expect(screen.getByText(/Équilibré/)).toBeInTheDocument()
    })
  })

  it('affiche tous les axes', async () => {
    getPatrimoineScore.mockResolvedValue(SCORE_DATA)
    render(<PatrimoineScoreWidget />)
    await waitFor(() => {
      expect(screen.getByText('Diversification')).toBeInTheDocument()
      expect(screen.getByText('Matelas de sécurité')).toBeInTheDocument()
      expect(screen.getByText('Endettement')).toBeInTheDocument()
      expect(screen.getByText('Épargne')).toBeInTheDocument()
      expect(screen.getByText('Âge & Risque')).toBeInTheDocument()
      expect(screen.getByText('Progression')).toBeInTheDocument()
    })
  })

  it('affiche le conseil sur l\'axe le plus faible', async () => {
    getPatrimoineScore.mockResolvedValue(SCORE_DATA)
    render(<PatrimoineScoreWidget />)
    await waitFor(() => {
      expect(screen.getByText(/Votre taux d'épargne peut être amélioré/)).toBeInTheDocument()
    })
  })

  it('affiche "Score Patrimonial" comme titre', async () => {
    getPatrimoineScore.mockResolvedValue(SCORE_DATA)
    render(<PatrimoineScoreWidget />)
    await waitFor(() => {
      expect(screen.getByText('Score Patrimonial')).toBeInTheDocument()
    })
  })
})
