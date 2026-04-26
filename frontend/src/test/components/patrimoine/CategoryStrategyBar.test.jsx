import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import CategoryStrategyBar from '../../../components/patrimoine/CategoryStrategyBar'

// Pas d'appel API — composant de rendu pur

vi.mock('../../../components/patrimoine/utils', () => ({
  fmt: (n) => n?.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) ?? '—',
  Amount: ({ value }) => <span>{value}</span>,
  Tooltip: ({ children }) => <span>{children}</span>,
}))

describe('CategoryStrategyBar', () => {

  // ── Retour null ───────────────────────────────────────────

  it('ne rend rien si target est null', () => {
    const { container } = render(<CategoryStrategyBar currentValue={5000} target={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('ne rend rien si target est 0', () => {
    const { container } = render(<CategoryStrategyBar currentValue={5000} target={0} />)
    expect(container.firstChild).toBeNull()
  })

  it('ne rend rien si target est undefined', () => {
    const { container } = render(<CategoryStrategyBar currentValue={5000} target={undefined} />)
    expect(container.firstChild).toBeNull()
  })

  // ── En cours (< 100 %) ────────────────────────────────────

  it('affiche le pourcentage atteint quand objectif non atteint', () => {
    render(<CategoryStrategyBar currentValue={25000} target={50000} />)
    expect(screen.getByText(/50 %/)).toBeInTheDocument()
  })

  it('affiche "objectif" dans le label en cours', () => {
    render(<CategoryStrategyBar currentValue={25000} target={50000} />)
    expect(screen.getByText(/objectif/)).toBeInTheDocument()
  })

  // ── Objectif atteint (exactement 100 %) ──────────────────

  it('affiche "Objectif atteint" quand currentValue === target', () => {
    render(<CategoryStrategyBar currentValue={50000} target={50000} />)
    expect(screen.getByText(/Objectif atteint/)).toBeInTheDocument()
  })

  // ── Dépassé (> 100 %) ─────────────────────────────────────

  it('affiche "Dépassé de" quand currentValue > target', () => {
    render(<CategoryStrategyBar currentValue={60000} target={50000} />)
    expect(screen.getByText(/Dépassé de/)).toBeInTheDocument()
  })

  // ── Barre de progression ──────────────────────────────────

  it('rend la barre de progression', () => {
    const { container } = render(<CategoryStrategyBar currentValue={25000} target={50000} />)
    const bar = container.querySelector('[style*="width"]')
    expect(bar).not.toBeNull()
    expect(bar.style.width).toBe('50%')
  })

  it('plafonne la barre à 100 % si dépassé', () => {
    const { container } = render(<CategoryStrategyBar currentValue={75000} target={50000} />)
    const bar = container.querySelector('[style*="width"]')
    expect(bar.style.width).toBe('100%')
  })
})
