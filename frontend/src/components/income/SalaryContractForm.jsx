import { useState } from 'react'
import SalaryContractTypeStep    from './SalaryContractTypeStep'
import SalaryContractFormPrivate from './SalaryContractFormPrivate'
import SalaryContractFormPublic  from './SalaryContractFormPublic'

/**
 * Wrapper 2-step pour la création / édition d'un contrat salarial.
 *
 * Création  : Step 1 → choix du type (PRIVATE / PUBLIC)
 *             Step 2 → formulaire adapté au type choisi
 *
 * Édition   : Step 1 sauté — on affiche directement le formulaire
 *             correspondant au contractType du contrat existant.
 *             Le type ne peut pas être changé sur un contrat existant.
 */
export default function SalaryContractForm({ contract, onSubmit, onCancel }) {
  // En édition, le type est fixé ; en création, null jusqu'au choix step 1
  const [selectedType, setSelectedType] = useState(
    contract?.contractType ?? null
  )

  // ── Édition : déduire le type depuis le contrat existant ─────
  const effectiveType = contract
    ? (contract.contractType ?? 'PRIVATE')
    : selectedType

  // ── Step 1 : choix du type (création seulement) ──────────────
  if (!contract && !selectedType) {
    return (
      <SalaryContractTypeStep
        onSelect={setSelectedType}
        onCancel={onCancel}
      />
    )
  }

  // ── Step 2 : formulaire selon le type ────────────────────────
  if (effectiveType === 'PUBLIC') {
    return (
      <SalaryContractFormPublic
        contract={contract}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    )
  }

  return (
    <SalaryContractFormPrivate
      contract={contract}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  )
}
