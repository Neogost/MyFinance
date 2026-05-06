// Barèmes fiscaux enveloppes — à réviser annuellement si la loi de finances change

export const FISCAL_PARAMS = {
  PFU_RATE:               0.314,  // Flat tax = 14,2 % IR + 17,2 % PS
  IR_RATE_PFU:            0.142,
  SOCIAL_CHARGES_RATE:    0.172,  // Prélèvements sociaux (CSG+CRDS+CASA+prélèvement de solidarité)

  // Assurance-vie après 8 ans (versements ≤ 150 000 €)
  AV_REDUCED_IR_RATE:     0.075,  // 7,5 % IR
  AV_REDUCED_TOTAL_RATE:  0.247,  // 7,5 % + 17,2 % = 24,7 %
  AV_ABATEMENT_SINGLE:    4600,   // Abattement annuel célibataire
  AV_ABATEMENT_COUPLE:    9200,   // Abattement annuel couple
  AV_FAVORABLE_THRESHOLD: 150000, // Versements plafond taux réduit (au-delà → PFU)

  // PEA
  PEA_CAP:                150000, // Plafond de versement PEA classique

  // PER — plafond annuel de déduction (10 % du PASS × 8 = 8 × 46 368 × 10 % en 2024)
  PER_DEFAULT_ANNUAL_CAP: 32909,

  // Frais d'enveloppe typiques (éditables par l'utilisateur)
  DEFAULT_FEES: {
    cto: 0,    // Pas de frais sur courtier en ligne
    pea: 0,    // Pas de frais sur courtier en ligne
    av:  0.6,  // Frais UC typiques assurance-vie
    per: 0.6,  // Frais UC typiques PER
  },

  // Tranches IRPP 2024 (revenu imposable par part)
  IRPP_BRACKETS: [
    { upTo: 11294,  rate: 0 },
    { upTo: 28797,  rate: 0.11 },
    { upTo: 82341,  rate: 0.30 },
    { upTo: 177106, rate: 0.41 },
    { upTo: Infinity, rate: 0.45 },
  ],
}

// Retourne la TMI (taux marginal d'imposition) depuis le revenu net imposable par part
export function inferTMI(revenuImposableParPart) {
  for (const bracket of FISCAL_PARAMS.IRPP_BRACKETS) {
    if (revenuImposableParPart <= bracket.upTo) return bracket.rate * 100
  }
  return 45
}
