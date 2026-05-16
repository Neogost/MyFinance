import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import DashboardPage from '../../../components/dashboard/DashboardPage'
import { migrateConfig, DEFAULT_WIDGET_CONFIG } from '../../../components/dashboard/widgets-registry'
import { getPositions } from '../../../api/patrimoine'
import { getMyGroupMembers, getMemberPositions } from '../../../api/familyGroup'

// ── Mocks API ──────────────────────────────────────────────────────────────────

vi.mock('../../../api/patrimoine', () => ({
  getPositions:         vi.fn(),
  getPatrimoineScore:   vi.fn(),
  getInstruments:       vi.fn(),
}))
vi.mock('../../../api/familyGroup', () => ({
  getMyGroupMembers:   vi.fn(),
  getMemberPositions:  vi.fn(),
}))

// ── Mocks sous-composants (chacun a ses propres appels API) ───────────────────

vi.mock('../../../components/dashboard/FireProjectionWidget',        () => ({ default: () => <div data-testid="fire-widget" /> }))
vi.mock('../../../components/dashboard/SalaryEvolutionChart',        () => ({ default: () => <div data-testid="salary-evolution" /> }))
vi.mock('../../../components/dashboard/SalaryAnnualBarChart',        () => ({ default: () => <div data-testid="salary-annual" /> }))
vi.mock('../../../components/dashboard/CapitalGainsByCategoryChart', () => ({ default: () => <div data-testid="capital-gains" /> }))
vi.mock('../../../components/dashboard/PatrimoineByCategoryChart',   () => ({ default: () => <div data-testid="patrimoine-category" /> }))
vi.mock('../../../components/dashboard/PatrimoineByEnvelopeChart',   () => ({ default: () => <div data-testid="patrimoine-envelope" /> }))
vi.mock('../../../components/dashboard/PatrimoineEvolutionChart',    () => ({ default: () => <div data-testid="patrimoine-evolution" /> }))
vi.mock('../../../components/dashboard/ExpensesByCategoryChart',     () => ({ default: () => <div data-testid="expenses-category" /> }))
vi.mock('../../../components/dashboard/PassifsByCategoryChart',      () => ({ default: () => <div data-testid="passifs-category" /> }))
vi.mock('../../../components/dashboard/PatrimoineByMemberChart',     () => ({ default: () => <div data-testid="patrimoine-member" /> }))
vi.mock('../../../components/dashboard/PatrimoineByCurrencyChart',   () => ({ default: () => <div data-testid="patrimoine-currency" /> }))
vi.mock('../../../components/dashboard/PatrimoineStrategyRadarChart',() => ({ default: () => <div data-testid="strategy-radar" /> }))
vi.mock('../../../components/dashboard/PatrimoineScoreWidget',       () => ({ default: () => <div data-testid="score-widget" /> }))
vi.mock('../../../components/dashboard/SafetyNetWidget',             () => ({ default: () => <div data-testid="safety-widget" /> }))
vi.mock('../../../components/dashboard/DetteWidget',                 () => ({ default: () => <div data-testid="dette-widget" /> }))
vi.mock('../../../components/dashboard/GeographicExposureWidget',    () => ({ default: () => <div data-testid="geo-widget" /> }))
vi.mock('../../../components/dashboard/SectorExposureWidget',        () => ({ default: () => <div data-testid="sector-widget" /> }))
vi.mock('../../../components/dashboard/PatrimoineNetWidget',         () => ({ default: () => <div data-testid="patrimoine-net-widget" /> }))

const USER = { id: 1, firstName: 'Jean', lastName: 'Dupont', role: 'USER', familyGroupId: null, safetyNetMode: 'FIXED_AMOUNT' }

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getPositions.mockResolvedValue([])
    getMyGroupMembers.mockResolvedValue([])
  })

  // ── Affichage général ─────────────────────────────────────

  it('affiche le titre "Tableau de bord"', () => {
    render(<DashboardPage user={USER} familyMode={false} onNavigate={vi.fn()} />)
    expect(screen.getByText('Tableau de bord')).toBeInTheDocument()
  })

  it('affiche le prénom de l\'utilisateur dans le message de bienvenue', () => {
    render(<DashboardPage user={USER} familyMode={false} onNavigate={vi.fn()} />)
    expect(screen.getByText(/Bonjour/)).toBeInTheDocument()
    expect(screen.getByText('Jean')).toBeInTheDocument()
  })

  it('affiche les titres de sections principales', () => {
    render(<DashboardPage user={USER} familyMode={false} onNavigate={vi.fn()} />)
    expect(screen.getByText('Revenus & Dépenses')).toBeInTheDocument()
    expect(screen.getByText('Patrimoine')).toBeInTheDocument()
  })

  it('affiche les sous-composants du tableau de bord', () => {
    render(<DashboardPage user={USER} familyMode={false} onNavigate={vi.fn()} />)
    expect(screen.getByTestId('fire-widget')).toBeInTheDocument()
    expect(screen.getByTestId('score-widget')).toBeInTheDocument()
    expect(screen.getByTestId('dette-widget')).toBeInTheDocument()
  })

  // ── Mode Foyer ────────────────────────────────────────────

  it('affiche la bannière Mode Foyer quand familyMode=true', () => {
    render(<DashboardPage user={USER} familyMode={true} onNavigate={vi.fn()} />)
    expect(screen.getByText(/Mode Foyer activé/)).toBeInTheDocument()
  })

  it('n\'affiche pas la bannière Mode Foyer quand familyMode=false', () => {
    render(<DashboardPage user={USER} familyMode={false} onNavigate={vi.fn()} />)
    expect(screen.queryByText(/Mode Foyer activé/)).not.toBeInTheDocument()
  })

  it('charge les positions des membres du groupe en mode foyer', async () => {
    const member = { id: 2, firstName: 'Marie', lastName: 'Dupont' }
    getMyGroupMembers.mockResolvedValue([member])
    getMemberPositions.mockResolvedValue([])
    getPositions.mockResolvedValue([])

    render(<DashboardPage user={USER} familyMode={true} onNavigate={vi.fn()} />)

    await waitFor(() => {
      expect(getMyGroupMembers).toHaveBeenCalled()
      expect(getMemberPositions).toHaveBeenCalledWith(2)
    })
  })

  it('ne charge pas les données famille si familyMode=false', () => {
    render(<DashboardPage user={USER} familyMode={false} onNavigate={vi.fn()} />)
    expect(getMyGroupMembers).not.toHaveBeenCalled()
  })

  // ── Migration localStorage v0 → v1 ───────────────────────

  it('migrateConfig retourne la config par défaut si raw est null', () => {
    const result = migrateConfig(null)
    expect(result.version).toBe(1)
    expect(result.sectionOrder).toEqual(['revenues', 'patrimoine', 'objectifs'])
    expect(result.visibility.cashFlow).toBe(true)
  })

  it('migrateConfig convertit le format v0 (flat) en v1', () => {
    const v0 = { cashFlow: false, salaryAnnual: true, fireProjection: false }
    const result = migrateConfig(v0)
    expect(result.version).toBe(1)
    expect(result.visibility.cashFlow).toBe(false)
    expect(result.visibility.salaryAnnual).toBe(true)
    expect(result.visibility.fireProjection).toBe(false)
    expect(result.sectionOrder).toEqual(['revenues', 'patrimoine', 'objectifs'])
  })

  it('migrateConfig conserve la v1 intacte et fusionne les defaults manquants', () => {
    const v1 = { version: 1, sectionOrder: ['patrimoine', 'revenues', 'objectifs'], visibility: { cashFlow: false } }
    const result = migrateConfig(v1)
    expect(result.sectionOrder).toEqual(['patrimoine', 'revenues', 'objectifs'])
    expect(result.visibility.cashFlow).toBe(false)
    expect(result.visibility.salaryAnnual).toBe(true) // default fusionné
  })

  // ── Réordonnement des sections ───────────────────────────

  it('rend les sections dans l\'ordre défini par sectionOrder', () => {
    const wcReverse = {
      version: 1,
      sectionOrder: ['objectifs', 'patrimoine', 'revenues'],
      visibility: DEFAULT_WIDGET_CONFIG.visibility,
    }
    const mockStorage = { getItem: vi.fn().mockReturnValue(JSON.stringify(wcReverse)), setItem: vi.fn() }
    Object.defineProperty(window, 'localStorage', { value: mockStorage, writable: true, configurable: true })
    render(<DashboardPage user={USER} familyMode={false} onNavigate={vi.fn()} />)
    const headings = screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent)
    const idxObjectifs = headings.findIndex(t => t.includes('Objectifs'))
    const idxRevenues  = headings.findIndex(t => t.includes('Revenus'))
    expect(idxObjectifs).toBeGreaterThanOrEqual(0)
    expect(idxRevenues).toBeGreaterThanOrEqual(0)
    expect(idxObjectifs).toBeLessThan(idxRevenues)
  })
})
