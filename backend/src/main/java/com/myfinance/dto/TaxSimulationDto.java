package com.myfinance.dto;

/**
 * Résultat d'une simulation d'impôt sur le revenu (IRPP).
 * Calculé à la volée, jamais persisté en base.
 */
public record TaxSimulationDto(
        int year,
        String salaryIncomeSource,        // "PROJECTION_CONTRAT" ou "BULLETINS_REELS"
        float salaryIncome,               // Revenus salariaux retenus (€)
        float otherIncomeInBareme,        // Revenus complémentaires inclus dans le barème IRPP (€)
        float otherIncomeSeparatelyTaxed, // Revenus complémentaires taxés à taux fixe (€)
        float separateTaxAmount,          // Impôt calculé sur ces revenus à taux fixe (€)
        float grossTaxableIncome,         // Total revenus bruts imposables retenus (€)
        float professionalDeduction,      // Abattement professionnel appliqué (€)
        String deductionType,             // "FORFAITAIRE_10_POURCENT" ou "FRAIS_REELS"
        float netTaxableIncome,           // Revenu net imposable au barème (€)
        float fiscalParts,                // Quotient familial utilisé
        boolean jointTaxation,            // true = couple en imposition commune (impacte la décote)
        float baremeEstimatedTax,         // Impôt brut calculé via le barème progressif, AVANT décote (€)
        float decoteAmount,               // Décote appliquée (€), 0 si non éligible
        float taxAfterDecote,             // baremeEstimatedTax − decoteAmount (€)
        float totalEstimatedTax,          // Impôt total estimé : taxAfterDecote + separateTaxAmount (€)
        float effectiveTaxRate            // Taux effectif d'imposition (%)
) {}
