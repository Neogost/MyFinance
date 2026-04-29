// ── Utilitaires généraux ──────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear()

// Retourne la valeur du PASS pour une année donnée depuis l'historique du référentiel
export function getPass(year, params) {
  const { history, growthRate } = params.pass
  const found = history.find(e => e.year === year)
  if (found) return found.value
  // Extrapolation depuis la valeur la plus ancienne connue
  const oldest = [...history].sort((a, b) => a.year - b.year)[0]
  const delta = year - oldest.year
  return oldest.value * Math.pow(1 + growthRate / 100, delta)
}

// Trimestres requis selon la génération
export function getTrimestreRequis(yearOfBirth, params) {
  const bs = params.baseScheme
  const map = bs.trimestresByGeneration || {}
  const key = String(yearOfBirth)
  return map[key] ?? bs.trimestresByGenerationDefault
}

// Âge légal minimum selon la génération
export function getAgeMinimal(yearOfBirth, params) {
  const bs = params.baseScheme
  const map = bs.ageMinimalByGeneration || {}
  const key = String(yearOfBirth)
  return map[key] ?? bs.ageMinimalDefault
}

// ── Projection de la carrière ─────────────────────────────────────────────────

export function projectCareer({
  currentSalaryGross,
  salaryGrowthRate,
  retirementAge,
  birthDate,
  careerStartYear,
}) {
  if (!birthDate) return null
  const yearOfBirth      = new Date(birthDate).getFullYear()
  const yearOfRetirement = yearOfBirth + retirementAge
  const ageNow           = CURRENT_YEAR - yearOfBirth

  // Salaires projetés jusqu'à la retraite
  const salaries = {}
  salaries[CURRENT_YEAR] = currentSalaryGross || 0

  for (let y = CURRENT_YEAR + 1; y <= yearOfRetirement; y++) {
    salaries[y] = (salaries[y - 1] || 0) * (1 + salaryGrowthRate / 100)
  }

  // Rétro-projection linéaire depuis le début de carrière
  const startYear = careerStartYear || (yearOfBirth + 22)
  for (let y = CURRENT_YEAR - 1; y >= startYear; y--) {
    salaries[y] = (salaries[y + 1] || 0) / (1 + salaryGrowthRate / 100)
  }

  const lastGrossAnnual    = salaries[yearOfRetirement - 1] || currentSalaryGross || 0
  const lastNetAnnual      = lastGrossAnnual * 0.77   // approximation brut→net privé
  const lastNetMonthly     = lastNetAnnual / 12
  const yearsRemaining     = Math.max(0, yearOfRetirement - CURRENT_YEAR)

  return {
    yearOfBirth,
    yearOfRetirement,
    ageNow,
    yearsRemaining,
    startYear,
    salaries,
    lastGrossAnnual,
    lastNetAnnual,
    lastNetMonthly,
  }
}

// ── Régime Général CNAV (privé) ───────────────────────────────────────────────

export function computeRegimeGeneral(career, {
  retirementAge,
  trimestresAcquis,
  trimestresAdditionnels = 0,
  params,
}) {
  if (!career) return { annual: 0, trimestresFinaux: 0, sam: 0, tauxLiquidation: 0 }

  const { yearOfBirth, yearOfRetirement, yearsRemaining, salaries, ageNow } = career
  const bs              = params.baseScheme
  const trimestresRequis = getTrimestreRequis(yearOfBirth, params)
  const ageMinimal      = getAgeMinimal(yearOfBirth, params)

  const projectedTrimestres = Math.max(0, yearsRemaining * 4)
  const trimestresFinaux    = Math.min(
    trimestresAcquis + trimestresAdditionnels + projectedTrimestres,
    trimestresRequis
  )

  // SAM : 25 meilleures années plafonnées au PASS
  const allYears = Object.keys(salaries).map(Number).filter(y => y < yearOfRetirement)
  const capped   = allYears
    .map(y => Math.min(salaries[y], getPass(y, params)))
    .sort((a, b) => b - a)
    .slice(0, 25)
  const sam = capped.length > 0 ? capped.reduce((s, v) => s + v, 0) / capped.length : 0

  // Taux de liquidation
  let tauxLiquidation = bs.privateRate * Math.min(1, trimestresFinaux / trimestresRequis)

  // Décote si départ avant l'âge légal
  if (retirementAge < ageMinimal) {
    const trimestresManquants = trimestresRequis - trimestresFinaux
    const decote = Math.min(bs.decoteByMissingTrimestre * trimestresManquants, bs.maxDecote)
    tauxLiquidation = tauxLiquidation * (1 - decote)
  }
  // Surcote si trimestresFinaux > trimestresRequis
  if (trimestresFinaux >= trimestresRequis && retirementAge > ageMinimal) {
    const trimestresSupp = Math.max(0, (retirementAge - ageMinimal) * 4)
    const surcote = Math.min(bs.decoteByMissingTrimestre * trimestresSupp, bs.maxSurcote)
    tauxLiquidation = tauxLiquidation * (1 + surcote)
  }

  const annual = sam * tauxLiquidation
  return { annual, trimestresFinaux, sam, tauxLiquidation }
}

// ── Agirc-Arrco (complémentaire privé) ───────────────────────────────────────

export function computeAgircArrco(career, {
  retirementAge,
  trimestresAcquis,
  agircArrcoPointsActuels,
  appliquerCoefficientSolidarite,
  params,
}) {
  if (!career) return { annual: 0, totalPoints: 0 }

  const { yearOfBirth, yearOfRetirement, salaries } = career
  const aa             = params.agircArrco
  const bs             = params.baseScheme
  const trimestresRequis = getTrimestreRequis(yearOfBirth, params)
  const ageMinimal     = getAgeMinimal(yearOfBirth, params)

  // Accumulation des points sur les années projetées (depuis aujourd'hui)
  let pointsProjetés = 0
  for (let y = CURRENT_YEAR; y < yearOfRetirement; y++) {
    const salaire = salaries[y] || 0
    const pass    = getPass(y, params)
    const t1      = Math.min(salaire, pass) * (aa.employeeRateT1 / 100)
    const t2      = Math.max(0, salaire - pass) * (aa.employeeRateT2 / 100)
    pointsProjetés += (t1 + t2) / aa.pointPurchasePrice
  }

  const totalPoints = agircArrcoPointsActuels + pointsProjetés
  let annual = totalPoints * aa.pointValue

  // Coefficient de solidarité si départ à l'âge taux plein sans surcote
  if (appliquerCoefficientSolidarite && retirementAge <= ageMinimal) {
    // Modélisation simplifiée : réduction appliquée forfaitairement
    annual = annual * (1 - aa.coefficientSolidaritePenalty)
  }

  return { annual, totalPoints, pointsProjetés }
}

// ── CNRACL / Régime public ────────────────────────────────────────────────────

export function computeRegimePublic(career, {
  retirementAge,
  trimestresAcquis,
  trimestresAdditionnels = 0,
  indiceMajoreFinCarriere,
  valeurPointIndice,
  params,
}) {
  if (!career) return { annual: 0, trimestresFinaux: 0, traitementBrut: 0 }

  const { yearOfBirth, yearsRemaining } = career
  const bs             = params.baseScheme
  const trimestresRequis = getTrimestreRequis(yearOfBirth, params)
  const ageMinimal     = getAgeMinimal(yearOfBirth, params)

  const projectedTrimestres = Math.max(0, yearsRemaining * 4)
  const trimestresFinaux    = Math.min(
    trimestresAcquis + trimestresAdditionnels + projectedTrimestres,
    trimestresRequis
  )

  const traitementBrut = indiceMajoreFinCarriere * valeurPointIndice

  let tauxLiquidation = bs.publicRate * Math.min(1, trimestresFinaux / trimestresRequis)

  if (retirementAge < ageMinimal) {
    const trimestresManquants = trimestresRequis - trimestresFinaux
    const decote = Math.min(bs.decoteByMissingTrimestre * trimestresManquants, bs.maxDecote)
    tauxLiquidation = tauxLiquidation * (1 - decote)
  }
  if (trimestresFinaux >= trimestresRequis && retirementAge > ageMinimal) {
    const trimestresSupp = Math.max(0, (retirementAge - ageMinimal) * 4)
    const surcote = Math.min(bs.decoteByMissingTrimestre * trimestresSupp, bs.maxSurcote)
    tauxLiquidation = tauxLiquidation * (1 + surcote)
  }

  const annual = traitementBrut * tauxLiquidation
  return { annual, trimestresFinaux, traitementBrut, tauxLiquidation }
}

// ── RAFP forfaitaire V1 ───────────────────────────────────────────────────────

export function computeRAFP(baseAnnual, rafpRate) {
  return { annual: baseAnnual * rafpRate / 100 }
}

// ── Prélèvements sociaux ──────────────────────────────────────────────────────

export function applySocialCharges(grossAnnual, withComplementary, params) {
  const rate = withComplementary
    ? params.baseScheme.socialChargesRateWithComplementary
    : params.baseScheme.socialChargesRateBase
  return grossAnnual * (1 - rate / 100)
}

// ── Simulation pour un âge de départ donné ───────────────────────────────────

export function simulateAtAge(age, {
  career,
  contractType,
  trimestresAcquis,
  trimestresAdditionnels,
  agircArrcoPointsActuels,
  appliquerCoefficientSolidarite,
  indiceMajoreFinCarriere,
  valeurPointIndice,
  rafpRate,
  params,
}) {
  if (!career || !params) return null

  const { yearOfBirth } = career
  const bs              = params.baseScheme
  const ageMinimal      = getAgeMinimal(yearOfBirth, params)
  const trimestresRequis = getTrimestreRequis(yearOfBirth, params)

  const simCareer = projectCareer({
    currentSalaryGross: career.salaries[CURRENT_YEAR],
    salaryGrowthRate: 0,
    retirementAge: age,
    birthDate: `${yearOfBirth}-01-01`,
    careerStartYear: career.startYear,
  })

  let baseScheme, complementary

  if (contractType === 'PUBLIC') {
    baseScheme   = computeRegimePublic(simCareer, { retirementAge: age, trimestresAcquis, trimestresAdditionnels, indiceMajoreFinCarriere, valeurPointIndice, params })
    complementary = computeRAFP(baseScheme.annual, rafpRate)
  } else {
    baseScheme   = computeRegimeGeneral(simCareer, { retirementAge: age, trimestresAcquis, trimestresAdditionnels, params })
    complementary = computeAgircArrco(simCareer, { retirementAge: age, trimestresAcquis, agircArrcoPointsActuels, appliquerCoefficientSolidarite, params })
  }

  const totalGrossAnnual = baseScheme.annual + complementary.annual
  const totalNetAnnual   = applySocialCharges(totalGrossAnnual, complementary.annual > 0, params)
  const monthlyNet       = totalNetAnnual / 12
  const replacementRate  = career.lastNetAnnual > 0 ? totalNetAnnual / career.lastNetAnnual * 100 : 0
  const trimestresFinaux = baseScheme.trimestresFinaux || 0
  const trimestresManquants = Math.max(0, trimestresRequis - trimestresFinaux)

  // Verdict
  let verdict = '✓'
  if (age < ageMinimal) verdict = '❌'
  else if (trimestresManquants > 0) verdict = '⚠'
  else if (age >= bs.ageTauxPleinAuto) verdict = '⭐'

  return { age, monthlyNet, totalNetAnnual, totalGrossAnnual, replacementRate, trimestresFinaux, verdict }
}

// ── Capital PER nécessaire (calcul inverse) ───────────────────────────────────

function bisect(fn, lo, hi, target, iterations = 70) {
  for (let i = 0; i < iterations; i++) {
    const mid = (lo + hi) / 2
    if (fn(mid) < target) lo = mid; else hi = mid
  }
  return (lo + hi) / 2
}

export function computeRequiredPERCapital(deltaAnnualNet, { retirementTMI, perWithdrawalRate }) {
  if (deltaAnnualNet <= 0) return 0
  // Brut nécessaire pour obtenir deltaAnnualNet net (après TMI retraite)
  const deltaBrut = deltaAnnualNet / Math.max(0.01, 1 - retirementTMI / 100)
  return deltaBrut / (perWithdrawalRate / 100)
}

export function computeRequiredPERContribution(targetCapital, {
  yearsRemaining,
  perAnnualReturn,
  perCurrentCapital,
}) {
  if (targetCapital <= 0 || yearsRemaining <= 0) return 0
  const n  = yearsRemaining * 12
  const rm = perAnnualReturn / 100 / 12
  // Valeur future du capital déjà accumulé
  const fvExisting = perCurrentCapital * Math.pow(1 + rm, n)
  const remaining  = Math.max(0, targetCapital - fvExisting)
  if (remaining <= 0) return 0
  if (rm === 0) return remaining / n
  return bisect(
    monthly => monthly * (Math.pow(1 + rm, n) - 1) / rm,
    0, 50000, remaining
  )
}
