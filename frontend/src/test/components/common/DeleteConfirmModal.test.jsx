import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DeleteConfirmModal from '../../../components/common/DeleteConfirmModal'

describe('DeleteConfirmModal', () => {
  const base = {
    title: 'Supprimer cet élément ?',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  }

  // ── Rendu ───────────────────────────────────────────────────────────────────

  it('affiche le titre', () => {
    render(<DeleteConfirmModal {...base} />)
    expect(screen.getByText('Supprimer cet élément ?')).toBeInTheDocument()
  })

  it('affiche la description quand fournie', () => {
    render(<DeleteConfirmModal {...base} description="Cette action est irréversible." />)
    expect(screen.getByText('Cette action est irréversible.')).toBeInTheDocument()
  })

  it("n'affiche pas de description quand absente", () => {
    render(<DeleteConfirmModal {...base} />)
    expect(screen.queryByText('Cette action est irréversible.')).not.toBeInTheDocument()
  })

  it('affiche les avertissements en cascade', () => {
    render(
      <DeleteConfirmModal
        {...base}
        warnings={['Les ordres seront supprimés', 'Les snapshots seront mis à jour']}
      />
    )
    expect(screen.getByText('Les ordres seront supprimés')).toBeInTheDocument()
    expect(screen.getByText('Les snapshots seront mis à jour')).toBeInTheDocument()
  })

  it("n'affiche pas le bloc warnings quand la liste est vide", () => {
    render(<DeleteConfirmModal {...base} warnings={[]} />)
    expect(screen.queryByText(/Données supprimées en cascade/i)).not.toBeInTheDocument()
  })

  it("n'affiche pas le bloc warnings quand warnings n'est pas fourni", () => {
    render(<DeleteConfirmModal {...base} />)
    expect(screen.queryByText(/Données supprimées en cascade/i)).not.toBeInTheDocument()
  })

  // ── Interactions ─────────────────────────────────────────────────────────────

  it('appelle onCancel au clic sur "Annuler"', () => {
    const onCancel = vi.fn()
    render(<DeleteConfirmModal {...base} onCancel={onCancel} />)
    fireEvent.click(screen.getByText('Annuler'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('appelle onConfirm au clic sur "Supprimer définitivement"', () => {
    const onConfirm = vi.fn()
    render(<DeleteConfirmModal {...base} onConfirm={onConfirm} />)
    fireEvent.click(screen.getByText('Supprimer définitivement'))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('appelle onCancel au clic sur le backdrop', () => {
    const onCancel = vi.fn()
    const { container } = render(<DeleteConfirmModal {...base} onCancel={onCancel} />)
    const backdrop = container.querySelector('.bg-black\\/40')
    fireEvent.click(backdrop)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  // ── État loading ──────────────────────────────────────────────────────────────

  it('affiche "Suppression…" quand loading=true', () => {
    render(<DeleteConfirmModal {...base} loading={true} />)
    expect(screen.getByText('Suppression…')).toBeInTheDocument()
  })

  it('désactive le bouton Annuler quand loading=true', () => {
    render(<DeleteConfirmModal {...base} loading={true} />)
    expect(screen.getByText('Annuler')).toBeDisabled()
  })

  it('désactive le bouton Supprimer quand loading=true', () => {
    render(<DeleteConfirmModal {...base} loading={true} />)
    expect(screen.getByText('Suppression…')).toBeDisabled()
  })

  it('affiche "Supprimer définitivement" et boutons actifs quand loading=false', () => {
    render(<DeleteConfirmModal {...base} loading={false} />)
    expect(screen.getByText('Supprimer définitivement')).toBeInTheDocument()
    expect(screen.getByText('Annuler')).not.toBeDisabled()
  })
})
