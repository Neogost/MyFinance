import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PatrimoineGroupedView from '../../../components/patrimoine/PatrimoineGroupedView'

vi.mock('../../../components/patrimoine/constants', () => ({
  CATEGORY_META: {
    BOURSE:        { label: 'Bourse',          color: 'bg-blue-100 text-blue-700',    chartColor: '#2563eb', icon: '📈' },
    CRYPTO:        { label: 'Crypto',          color: 'bg-yellow-100 text-yellow-600',chartColor: '#eab308', icon: '🪙' },
    IMMO_PAPIER:   { label: 'Immo. Papier',    color: 'bg-gray-100 text-gray-500',    chartColor: '#9ca3af', icon: '🏗️' },
    IMMO_PHYSIQUE: { label: 'Immo. Physique',  color: 'bg-gray-100 text-gray-600',    chartColor: '#6b7280', icon: '🏠' },
    LIVRET:        { label: 'Livret',          color: 'bg-green-100 text-green-700',  chartColor: '#16a34a', icon: '🏦' },
    LIQUIDITE:     { label: 'Liquidités',      color: 'bg-green-100 text-green-600',  chartColor: '#4ade80', icon: '💵' },
  },
  FISCAL_ENVELOPE_LABELS: {
    NONE: { label: 'Hors enveloppe', color: 'bg-gray-100 text-gray-500' },
    PEA:  { label: 'PEA',            color: 'bg-emerald-100 text-emerald-700' },
    CTO:  { label: 'CTO',            color: 'bg-gray-100 text-gray-600' },
  },
  OWNERSHIP_TYPES: [
    { value: 'PLEINE_PROPRIETE', label: 'Pleine propriété' },
  ],
}))

vi.mock('../../../components/patrimoine/utils', () => ({
  fmt:    (n) => n?.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) ?? '—',
  Amount: ({ value }) => <span>{value}</span>,
  Tooltip: ({ children }) => <span>{children}</span>,
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const NOOP = vi.fn()

function makePosition(overrides) {
  return {
    id: 1, label: 'ETF World', category: 'BOURSE', status: 'ACTIVE',
    partner: null, fiscalEnvelope: 'PEA', ownershipType: 'PLEINE_PROPRIETE',
    assetSubType: 'ETF', currency: 'EUR',
    computed: { currentValueEur: 10000, investedAmountEur: 8000, capitalGainEur: 2000, monthlyIncomeProjectionEur: null },
    instrument: { isin: 'LU0001234567', name: 'ETF World', lastPrice: 32.5, currency: 'EUR' },
    ...overrides,
  }
}

const POSITION_BOURSE  = makePosition({ id: 1, label: 'ETF World',    partner: 'AXA' })
const POSITION_LIVRET  = makePosition({ id: 2, label: 'Livret A',     category: 'LIVRET', partner: null, fiscalEnvelope: 'NONE', assetSubType: null, instrument: null, computed: { currentValueEur: 5000, investedAmountEur: 5000, capitalGainEur: 0, monthlyIncomeProjectionEur: null } })
const POSITION_CLOSED  = makePosition({ id: 3, label: 'Ancien PEA',   status: 'CLOSED', partner: null })

describe('PatrimoineGroupedView', () => {

  // ── État vide ─────────────────────────────────────────────

  it('affiche "Aucune position" quand la liste est vide', () => {
    render(<PatrimoineGroupedView positions={[]} onEdit={NOOP} onDelete={NOOP} onClose={NOOP} onUpdateBalance={NOOP} onUpdateEstimatedValue={NOOP} onViewOrders={NOOP} />)
    expect(screen.getByText('Aucune position')).toBeInTheDocument()
  })

  // ── Affichage des positions ───────────────────────────────

  it('affiche le libellé des positions', () => {
    render(<PatrimoineGroupedView positions={[POSITION_BOURSE]} onEdit={NOOP} onDelete={NOOP} onClose={NOOP} onUpdateBalance={NOOP} onUpdateEstimatedValue={NOOP} onViewOrders={NOOP} />)
    expect(screen.getByText('ETF World')).toBeInTheDocument()
  })

  it('affiche le nom du partenaire comme en-tête de groupe', () => {
    render(<PatrimoineGroupedView positions={[POSITION_BOURSE]} onEdit={NOOP} onDelete={NOOP} onClose={NOOP} onUpdateBalance={NOOP} onUpdateEstimatedValue={NOOP} onViewOrders={NOOP} />)
    expect(screen.getByText('AXA')).toBeInTheDocument()
  })

  it('regroupe les positions sans partenaire sous "Sans partenaire"', () => {
    render(<PatrimoineGroupedView positions={[POSITION_LIVRET]} onEdit={NOOP} onDelete={NOOP} onClose={NOOP} onUpdateBalance={NOOP} onUpdateEstimatedValue={NOOP} onViewOrders={NOOP} />)
    expect(screen.getByText('Sans partenaire')).toBeInTheDocument()
  })

  it('affiche deux groupes séparés pour deux partenaires différents', () => {
    const pos2 = makePosition({ id: 4, label: 'ETF Nasdaq', partner: 'Boursorama' })
    render(<PatrimoineGroupedView positions={[POSITION_BOURSE, pos2]} onEdit={NOOP} onDelete={NOOP} onClose={NOOP} onUpdateBalance={NOOP} onUpdateEstimatedValue={NOOP} onViewOrders={NOOP} />)
    expect(screen.getByText('AXA')).toBeInTheDocument()
    expect(screen.getByText('Boursorama')).toBeInTheDocument()
  })

  // ── Collapse / expand ─────────────────────────────────────

  it('masque les positions d\'un groupe au clic sur l\'en-tête', () => {
    render(<PatrimoineGroupedView positions={[POSITION_BOURSE]} onEdit={NOOP} onDelete={NOOP} onClose={NOOP} onUpdateBalance={NOOP} onUpdateEstimatedValue={NOOP} onViewOrders={NOOP} />)
    expect(screen.getByText('ETF World')).toBeInTheDocument()
    fireEvent.click(screen.getByText('AXA'))
    expect(screen.queryByText('ETF World')).not.toBeInTheDocument()
  })

  it('ré-affiche les positions au second clic', () => {
    render(<PatrimoineGroupedView positions={[POSITION_BOURSE]} onEdit={NOOP} onDelete={NOOP} onClose={NOOP} onUpdateBalance={NOOP} onUpdateEstimatedValue={NOOP} onViewOrders={NOOP} />)
    fireEvent.click(screen.getByText('AXA'))
    fireEvent.click(screen.getByText('AXA'))
    expect(screen.getByText('ETF World')).toBeInTheDocument()
  })

  // ── Boutons d'action ──────────────────────────────────────

  it('affiche le bouton Modifier et le bouton de suppression (×) par défaut', () => {
    render(<PatrimoineGroupedView positions={[POSITION_BOURSE]} onEdit={NOOP} onDelete={NOOP} onClose={NOOP} onUpdateBalance={NOOP} onUpdateEstimatedValue={NOOP} onViewOrders={NOOP} />)
    expect(screen.getByText('Modifier')).toBeInTheDocument()
    // Le bouton de suppression affiche × (pas le texte "Supprimer")
    expect(screen.getByText('×')).toBeInTheDocument()
  })

  it('masque les boutons d\'action en mode readOnly', () => {
    render(<PatrimoineGroupedView positions={[POSITION_BOURSE]} onEdit={NOOP} onDelete={NOOP} onClose={NOOP} onUpdateBalance={NOOP} onUpdateEstimatedValue={NOOP} onViewOrders={NOOP} readOnly />)
    expect(screen.queryByText('Modifier')).not.toBeInTheDocument()
    expect(screen.queryByText('Supprimer')).not.toBeInTheDocument()
  })

  // ── Position fermée ───────────────────────────────────────

  it('affiche le badge "Fermé" pour une position CLOSED', () => {
    render(<PatrimoineGroupedView positions={[POSITION_CLOSED]} onEdit={NOOP} onDelete={NOOP} onClose={NOOP} onUpdateBalance={NOOP} onUpdateEstimatedValue={NOOP} onViewOrders={NOOP} />)
    expect(screen.getByText('Fermé')).toBeInTheDocument()
  })
})
