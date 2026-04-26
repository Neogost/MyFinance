import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

// Pattern commun défini localement dans PossessionPage, DettePage, RecurringExpensePage.
function KpiCard({ label, value, unit = '€', color, sub }) {
  function fmt(n) {
    return n?.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) ?? '—'
  }
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 flex flex-col gap-1">
      <p className="text-xs text-gray-400 tracking-wide">{label}</p>
      <p className={`text-2xl font-bold amount ${color ?? 'text-gray-900'}`}>
        {value != null ? `${fmt(value)} ${unit}` : '—'}
      </p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

describe('KpiCard — pattern commun (3 pages)', () => {
  // ── Rendu de base ──────────────────────────────────────────────────────────

  it('affiche le label', () => {
    render(<KpiCard label="Total dépenses" value={1500} />)
    expect(screen.getByText('Total dépenses')).toBeInTheDocument()
  })

  it('affiche la valeur formatée avec l\'unité "€" par défaut', () => {
    render(<KpiCard label="Montant" value={1234.56} />)
    const valueEl = screen.getByText(/1.*234,56.*€/)
    expect(valueEl).toBeInTheDocument()
  })

  it('affiche "—" quand value est null', () => {
    render(<KpiCard label="Montant" value={null} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('affiche "—" quand value est undefined', () => {
    render(<KpiCard label="Montant" value={undefined} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('affiche 0 formaté (pas "—") — 0 est une valeur valide', () => {
    render(<KpiCard label="Montant" value={0} />)
    expect(screen.getByText(/0,00/)).toBeInTheDocument()
    expect(screen.queryByText('—')).not.toBeInTheDocument()
  })

  // ── Unité ─────────────────────────────────────────────────────────────────

  it('affiche l\'unité personnalisée quand fournie', () => {
    render(<KpiCard label="Taux" value={42} unit="%" />)
    expect(screen.getByText(/%/)).toBeInTheDocument()
  })

  it('affiche "€" par défaut si unit n\'est pas fourni', () => {
    render(<KpiCard label="Montant" value={500} />)
    expect(screen.getByText(/€/)).toBeInTheDocument()
  })

  // ── Couleur ────────────────────────────────────────────────────────────────

  it('applique la classe de couleur fournie sur la valeur', () => {
    const { container } = render(<KpiCard label="Montant" value={1000} color="text-red-600" />)
    expect(container.querySelector('.text-red-600')).toBeInTheDocument()
  })

  it('applique "text-gray-900" par défaut si aucune couleur fournie', () => {
    const { container } = render(<KpiCard label="Montant" value={1000} />)
    expect(container.querySelector('.text-gray-900')).toBeInTheDocument()
  })

  // ── Sous-texte ────────────────────────────────────────────────────────────

  it('affiche le sous-texte quand fourni', () => {
    render(<KpiCard label="Montant" value={1000} sub="dont 3 actives" />)
    expect(screen.getByText('dont 3 actives')).toBeInTheDocument()
  })

  it("n'affiche pas de sous-texte quand sub est absent", () => {
    render(<KpiCard label="Montant" value={1000} />)
    expect(screen.queryByText('dont 3 actives')).not.toBeInTheDocument()
  })

  it("n'affiche pas de sous-texte quand sub est une chaîne vide", () => {
    const { container } = render(<KpiCard label="Montant" value={1000} sub="" />)
    const subEls = container.querySelectorAll('.text-xs.text-gray-400')
    // Seul le label est présent (pas de second élément pour sub vide)
    expect(subEls.length).toBe(1)
  })

  // ── Structure DOM ──────────────────────────────────────────────────────────

  it('a la classe "amount" sur l\'élément de valeur', () => {
    const { container } = render(<KpiCard label="Montant" value={500} />)
    expect(container.querySelector('.amount')).toBeInTheDocument()
  })
})
