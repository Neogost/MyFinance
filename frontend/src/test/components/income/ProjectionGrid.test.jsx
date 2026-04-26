import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProjectionGrid from '../../../components/income/ProjectionGrid'

// Pas d'appel API — composant de rendu pur

const CONTRACT_FULL = {
  annualGrossSalary:    60000,
  annualNetImposable:   47000,
  annualNetAfterTax:    43000,
  annualSuperGross:     87000,
  monthlyGrossSalary:   5000,
  monthlyNetImposable:  3916.67,
  monthlyNetAfterTax:   3583.33,
  monthlySuperGross:    7250,
  dailyGrossSalary:     263.16,
  dailyNetImposable:    206.14,
  dailyNetAfterTax:     188.60,
  dailySuperGross:      381.58,
  hourlyGrossSalary:    37.59,
  hourlyNetImposable:   29.45,
  hourlyNetAfterTax:    26.94,
  hourlySuperGross:     54.51,
  paidMonthsPerYear:    12,
  weeklyHours:          35,
  mealVoucherAmount:    null,
  employerMonthlyMealVoucherCost: 0,
  employeeMonthlyMealVoucherCost: 0,
  mealVoucherEmployeeRate: 50,
}

const CONTRACT_NO_TAX = {
  ...CONTRACT_FULL,
  annualNetAfterTax:   null,
  monthlyNetAfterTax:  null,
  dailyNetAfterTax:    null,
  hourlyNetAfterTax:   null,
}

describe('ProjectionGrid', () => {

  // ── Structure générale ────────────────────────────────────

  it('affiche le titre "Projections calculées"', () => {
    render(<ProjectionGrid contract={CONTRACT_FULL} />)
    expect(screen.getByText('Projections calculées')).toBeInTheDocument()
  })

  it('affiche les 4 cellules de période', () => {
    render(<ProjectionGrid contract={CONTRACT_FULL} />)
    expect(screen.getByText('Annuel')).toBeInTheDocument()
    expect(screen.getByText('Mensuel')).toBeInTheDocument()
    expect(screen.getByText('Journalier')).toBeInTheDocument()
    expect(screen.getByText('Horaire')).toBeInTheDocument()
  })

  it('affiche les labels "Brut", "Net imposable", "Net d\'impôt" pour chaque cellule', () => {
    render(<ProjectionGrid contract={CONTRACT_FULL} />)
    // 4 cellules × 3 labels = 12 occurrences de "Brut"
    expect(screen.getAllByText('Brut').length).toBe(4)
    expect(screen.getAllByText('Net imposable').length).toBe(4)
    expect(screen.getAllByText("Net d'impôt").length).toBe(4)
  })

  // ── Profil fiscal incomplet ───────────────────────────────

  it('affiche "Non calculé" si le profil fiscal est incomplet', () => {
    render(<ProjectionGrid contract={CONTRACT_NO_TAX} />)
    const items = screen.getAllByText('Non calculé')
    expect(items.length).toBe(4) // une par cellule
  })

  it('affiche la bannière d\'avertissement fiscal si annualNetAfterTax est null', () => {
    render(<ProjectionGrid contract={CONTRACT_NO_TAX} />)
    expect(screen.getByText(/quotient familial/)).toBeInTheDocument()
  })

  it('n\'affiche pas la bannière d\'avertissement si le profil fiscal est complet', () => {
    render(<ProjectionGrid contract={CONTRACT_FULL} />)
    expect(screen.queryByText(/quotient familial/)).not.toBeInTheDocument()
  })

  // ── Primes ────────────────────────────────────────────────

  it('affiche le bloc Astreintes si onCalls est non vide', () => {
    const onCalls = [{ id: 1, estimatedWeeksPerYear: 10, weeklyFlatRate: 500, annualOnCallIncome: 5000 }]
    render(<ProjectionGrid contract={CONTRACT_FULL} onCalls={onCalls} />)
    // "Astreintes" apparaît aussi dans les tooltips — cibler le texte unique du bloc
    expect(screen.getByText(/revenu brut annuel estimé/)).toBeInTheDocument()
  })

  it('n\'affiche pas le bloc Astreintes si onCalls est vide', () => {
    render(<ProjectionGrid contract={CONTRACT_FULL} onCalls={[]} />)
    expect(screen.queryByText(/Astreintes/)).not.toBeInTheDocument()
  })

  // ── Avantages en nature ───────────────────────────────────

  it('affiche le bloc Avantages en nature si benefits est non vide', () => {
    const benefits = [{ id: 1, label: 'Voiture de fonction', monthlyAmount: 200 }]
    render(<ProjectionGrid contract={CONTRACT_FULL} benefits={benefits} />)
    // Cibler le texte unique du bloc (le label bénéfice apparaît aussi dans les tooltips)
    expect(screen.getByText(/inclus dans le net d'impôt/)).toBeInTheDocument()
  })

  it('n\'affiche pas le bloc Avantages si benefits est vide', () => {
    render(<ProjectionGrid contract={CONTRACT_FULL} benefits={[]} />)
    expect(screen.queryByText(/Avantages en nature/)).not.toBeInTheDocument()
  })

  // ── Tickets restaurant ────────────────────────────────────

  it('affiche le bloc Tickets restaurant si mealVoucherAmount > 0', () => {
    const contractWithTR = { ...CONTRACT_FULL, mealVoucherAmount: 11.50, employerMonthlyMealVoucherCost: 109.25, mealVoucherEmployeeRate: 50 }
    render(<ProjectionGrid contract={contractWithTR} />)
    expect(screen.getByText(/Tickets restaurant/)).toBeInTheDocument()
  })

  it('n\'affiche pas le bloc TR si mealVoucherAmount est null', () => {
    render(<ProjectionGrid contract={CONTRACT_FULL} />)
    expect(screen.queryByText(/Tickets restaurant/)).not.toBeInTheDocument()
  })
})
