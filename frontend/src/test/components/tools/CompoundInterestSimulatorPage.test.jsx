import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CompoundInterestSimulatorPage from '../../../components/tools/CompoundInterestSimulatorPage'

// Pas d'appel API — composant entièrement local

describe('CompoundInterestSimulatorPage', () => {

  // ── Affichage général ─────────────────────────────────────

  it('affiche le titre du simulateur', () => {
    render(<CompoundInterestSimulatorPage />)
    expect(screen.getByText("Simulateur d'Intérêts Composés")).toBeInTheDocument()
  })

  it('affiche le toggle "Projection directe" / "Mode inversé"', () => {
    render(<CompoundInterestSimulatorPage />)
    expect(screen.getByText('Projection directe')).toBeInTheDocument()
    // Deux spans pour le label mobile/desktop — on vérifie juste la présence
    expect(screen.getAllByText(/Mode inversé/).length).toBeGreaterThan(0)
  })

  it('démarre en mode "Projection directe" par défaut', () => {
    render(<CompoundInterestSimulatorPage />)
    // getByText retourne le <span> — remonter au <button> parent
    const btn = screen.getByText('Projection directe').closest('button')
    expect(btn).toHaveClass('bg-indigo-600')
  })

  // ── Sections de paramètres ────────────────────────────────

  it('affiche la section "Paramètres de base"', () => {
    render(<CompoundInterestSimulatorPage />)
    expect(screen.getByText('Paramètres de base')).toBeInTheDocument()
  })

  it('affiche la section "Versements"', () => {
    render(<CompoundInterestSimulatorPage />)
    expect(screen.getByText('Versements')).toBeInTheDocument()
  })

  it('affiche les champs Capital initial et Taux d\'intérêt', () => {
    render(<CompoundInterestSimulatorPage />)
    expect(screen.getByText("Capital initial (€)")).toBeInTheDocument()
    expect(screen.getByText(/Taux d'intérêt annuel/)).toBeInTheDocument()
  })

  // ── Résultats ─────────────────────────────────────────────

  it('affiche les KPIs Capital investi, Intérêts générés, Patrimoine total', () => {
    render(<CompoundInterestSimulatorPage />)
    expect(screen.getByText('Capital investi')).toBeInTheDocument()
    expect(screen.getByText('Intérêts générés')).toBeInTheDocument()
    expect(screen.getByText('Patrimoine total')).toBeInTheDocument()
  })

  it('affiche un patrimoine total > 0 avec les paramètres par défaut', () => {
    render(<CompoundInterestSimulatorPage />)
    // Patrimoine total avec 10 000 € initial, 7 %, 20 ans, 200 €/mois ≈ 220 000 €
    // On vérifie simplement qu'un montant formaté en euros est présent
    const kpiValues = screen.getAllByText(/\d+.*€/)
    expect(kpiValues.length).toBeGreaterThan(0)
  })

  // ── Changement de mode ────────────────────────────────────

  it('passe en mode inversé au clic', () => {
    render(<CompoundInterestSimulatorPage />)
    // Cliquer sur le span desktop (labelMobile est le second)
    fireEvent.click(screen.getAllByText(/Mode inversé/)[0].closest('button'))
    const btn = screen.getAllByText(/Mode inversé/)[0].closest('button')
    expect(btn).toHaveClass('bg-indigo-600')
  })

  it('affiche le champ "Patrimoine cible" en mode inversé', () => {
    render(<CompoundInterestSimulatorPage />)
    fireEvent.click(screen.getAllByText(/Mode inversé/)[0].closest('button'))
    expect(screen.getByText('Patrimoine cible (€)')).toBeInTheDocument()
  })

  // ── Options avancées ──────────────────────────────────────

  it('affiche la section Options avancées', () => {
    render(<CompoundInterestSimulatorPage />)
    expect(screen.getByText('Options avancées')).toBeInTheDocument()
  })

  it('affiche le bouton "Détail année par année"', () => {
    render(<CompoundInterestSimulatorPage />)
    expect(screen.getByText('Détail année par année')).toBeInTheDocument()
  })
})
