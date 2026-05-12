import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Navigation from '../../components/Navigation'
import logo from '../../assets/logo.png'

// L'import du logo est résolu comme chaîne en test
vi.mock('../../assets/logo.png', () => ({ default: 'logo.png' }))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const USER = {
  id: 1, firstName: 'Jean', lastName: 'Dupont',
  login: 'jean.dupont', role: 'USER', familyGroupId: null,
}
const ADMIN = { ...USER, role: 'ADMIN' }

const DEFAULT_PROPS = {
  user: USER,
  currentPage: 'dashboard',
  onNavigate: vi.fn(),
  onLogout: vi.fn(),
  hideValues: false,
  onToggleHideValues: vi.fn(),
  darkMode: false,
  onToggleDarkMode: vi.fn(),
  familyMode: false,
  onToggleFamilyMode: vi.fn(),
  pendingRegistrations: 0,
  appVersion: null,
}

describe('Navigation', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Affichage général ─────────────────────────────────────

  it('affiche le logo', () => {
    render(<Navigation {...DEFAULT_PROPS} />)
    expect(screen.getByAltText('MyFinance')).toBeInTheDocument()
  })

  it('affiche les boutons de navigation desktop', () => {
    render(<Navigation {...DEFAULT_PROPS} />)
    expect(screen.getByText('Tableau de bord')).toBeInTheDocument()
    // "Patrimoine" apparaît aussi dans la bottom nav mobile — vérifier la présence au moins une fois
    expect(screen.getAllByText('Patrimoine').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Dépenses').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Dettes').length).toBeGreaterThan(0)
  })

  it('affiche le prénom et nom de l\'utilisateur (desktop)', () => {
    render(<Navigation {...DEFAULT_PROPS} />)
    expect(screen.getByText('Jean Dupont')).toBeInTheDocument()
  })

  it('affiche le rôle de l\'utilisateur', () => {
    render(<Navigation {...DEFAULT_PROPS} />)
    expect(screen.getByText('USER')).toBeInTheDocument()
  })

  it('affiche le bouton Déconnexion', () => {
    render(<Navigation {...DEFAULT_PROPS} />)
    expect(screen.getByText('Déconnexion')).toBeInTheDocument()
  })

  it('affiche la version de l\'application dans le menu mobile si fournie', () => {
    render(<Navigation {...DEFAULT_PROPS} appVersion="1.5.0" />)
    // La version n'est affichée que dans le bottom sheet mobile (quand ouvert)
    fireEvent.click(screen.getByText('Plus'))
    expect(screen.getByText('v1.5.0')).toBeInTheDocument()
  })

  // ── Menu Administration (ADMIN uniquement) ────────────────

  it('affiche le menu Administration pour un ADMIN', () => {
    render(<Navigation {...DEFAULT_PROPS} user={ADMIN} />)
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('n\'affiche pas le menu Administration pour un USER', () => {
    render(<Navigation {...DEFAULT_PROPS} />)
    expect(screen.queryByText('Admin')).not.toBeInTheDocument()
  })

  it('affiche le badge rouge si des inscriptions sont en attente (ADMIN)', () => {
    render(<Navigation {...DEFAULT_PROPS} user={ADMIN} pendingRegistrations={3} />)
    // Le badge est un point rouge en mobile nav
    const dots = document.querySelectorAll('.bg-red-500')
    expect(dots.length).toBeGreaterThan(0)
  })

  // ── Dropdowns desktop ─────────────────────────────────────

  it('ouvre le dropdown Revenus au clic', () => {
    render(<Navigation {...DEFAULT_PROPS} />)
    fireEvent.click(screen.getByRole('button', { name: /Revenus/ }))
    expect(screen.getByText('Salariat')).toBeInTheDocument()
    expect(screen.getByText('Complémentaires')).toBeInTheDocument()
  })

  it('ouvre le dropdown Outils au clic', () => {
    render(<Navigation {...DEFAULT_PROPS} />)
    fireEvent.click(screen.getByRole('button', { name: /Outils/ }))
    expect(screen.getByText('Simulateur des impôts')).toBeInTheDocument()
    expect(screen.getByText('Bilan financier')).toBeInTheDocument()
  })

  it('ferme le dropdown Revenus au clic sur l\'overlay', () => {
    render(<Navigation {...DEFAULT_PROPS} />)
    fireEvent.click(screen.getByRole('button', { name: /Revenus/ }))
    expect(screen.getByText('Salariat')).toBeInTheDocument()
    // Cliquer sur l'overlay (fixed inset-0)
    fireEvent.click(document.querySelector('.fixed.inset-0'))
    expect(screen.queryByText('Salariat')).not.toBeInTheDocument()
  })

  // ── Navigation ────────────────────────────────────────────

  it('appelle onNavigate avec la bonne page au clic sur "Tableau de bord"', () => {
    const onNavigate = vi.fn()
    render(<Navigation {...DEFAULT_PROPS} onNavigate={onNavigate} />)
    fireEvent.click(screen.getByText('Tableau de bord'))
    expect(onNavigate).toHaveBeenCalledWith('dashboard')
  })

  it('appelle onLogout au clic sur Déconnexion', () => {
    const onLogout = vi.fn()
    render(<Navigation {...DEFAULT_PROPS} onLogout={onLogout} />)
    fireEvent.click(screen.getByText('Déconnexion'))
    expect(onLogout).toHaveBeenCalled()
  })

  // ── Bouton masquage des valeurs ───────────────────────────

  it('appelle onToggleHideValues au clic sur le bouton œil (desktop)', () => {
    const onToggleHideValues = vi.fn()
    render(<Navigation {...DEFAULT_PROPS} onToggleHideValues={onToggleHideValues} />)
    // Desktop button (first occurrence)
    fireEvent.click(screen.getAllByTitle(/Masquer les valeurs/i)[0])
    expect(onToggleHideValues).toHaveBeenCalled()
  })

  // ── Mode Foyer ────────────────────────────────────────────

  it('affiche le bouton Foyer si l\'utilisateur a un groupe familial', () => {
    render(<Navigation {...DEFAULT_PROPS} user={{ ...USER, familyGroupId: 42 }} />)
    expect(screen.getAllByTitle(/Mode Foyer/).length).toBeGreaterThan(0)
  })

  it('n\'affiche pas le bouton Foyer si l\'utilisateur n\'a pas de groupe', () => {
    render(<Navigation {...DEFAULT_PROPS} />)
    expect(screen.queryByTitle(/Mode Foyer/)).not.toBeInTheDocument()
  })
})
