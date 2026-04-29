# Simulateur Retraite

## 1. Objectif

Permettre à l'utilisateur d'**estimer sa pension de retraite future** en intégrant l'ensemble des régimes obligatoires français :

- **Régime de base** :
  - Privé : Régime Général (CNAV) — calcul sur les **25 meilleures années**
  - Public : Service des Retraites de l'État / CNRACL — calcul sur les **6 derniers mois** (indice majoré × 75 %)
- **Régime complémentaire** :
  - Privé : **Agirc-Arrco** — système à points
  - Public : **RAFP** — points sur primes (modèle simplifié dans le simulateur V1)

Le simulateur répond à trois questions :

1. **« Combien aurai-je de pension nette à la retraite ? »** — pension brute des deux régimes, prélèvements sociaux retraités, pension nette mensuelle
2. **« Quel est mon taux de remplacement ? »** — pension nette / dernier salaire net
3. **« Combien dois-je épargner via PER pour combler le manque ? »** — capital nécessaire et versement mensuel à effectuer pour atteindre un objectif (ex. 80 % du salaire actif)

L'outil **réutilise le contrat salarial actif** de l'utilisateur connecté pour pré-remplir la carrière (type de contrat `PRIVATE`/`PUBLIC`, salaire ou indice majoré, durée présumée de carrière).

> Outil principalement frontend — les barèmes retraite sont **externalisés en YAML backend** (`retirement-parameters.yml`) et exposés via un endpoint de référentiel `GET /api/retirement/parameters` (lecture seule). Aucune entité JPA persistante. Possibilité d'évolution future vers la sauvegarde de simulations (entité `RetirementSimulation` similaire à `LoanSimulation`).

---

## 2. Rappels du système de retraite français

### 2.1 Privé — Régime Général (CNAV)

| Élément | Règle |
|---------|-------|
| Base de calcul | Salaire Annuel Moyen (SAM) sur les **25 meilleures années** (revalorisées) |
| Taux plein | **50 %** du SAM (sous condition de durée d'assurance) |
| Plafond du SAM | Plafond Annuel de la Sécurité Sociale (PASS) — **46 368 €** en 2024 |
| Trimestres requis | 172 trimestres (43 ans) pour les générations 1965+ — réforme 2023 |
| Décote | −1,25 % par trimestre manquant (max 25 %) |
| Surcote | +1,25 % par trimestre supplémentaire après l'âge légal |
| Âge minimum | 64 ans (réforme 2023, génération 1968+) |
| Âge taux plein automatique | 67 ans |

**Formule simplifiée** :

```
SAM             = moyenne(25 meilleurs salaires bruts annuels, plafonnés au PASS, revalorisés)
tauxLiquidation = 50 % × min(1, trimestresValides / 172)   // décote linéaire
pensionBaseAnnuelle = SAM × tauxLiquidation
```

### 2.2 Privé — Agirc-Arrco (complémentaire)

Système à points. Chaque salarié cumule des **points** au fil de sa carrière, convertis en pension à la liquidation.

| Élément | Règle |
|---------|-------|
| Cotisation | 7,87 % salarial sur tranche 1 (0–PASS), 21,59 % sur tranche 2 (PASS–8×PASS) |
| Prix d'achat du point | **18,7669 €** en 2024 (revalorisé chaque année) |
| Valeur du point | **1,4159 €** en 2024 (revalorisée chaque année) |
| Coefficient de solidarité | −10 % pendant 3 ans si départ à l'âge taux plein sans avoir cotisé 1 an de plus |
| Bonification | +10 % à +30 % pour 8 à 12 trimestres supplémentaires |

**Formule simplifiée** :

```
pointsAnnuels(année y) = (cotisationT1(y) + cotisationT2(y)) / prixDuPoint(y)
totalPoints            = Σ pointsAnnuels sur toute la carrière
pensionAgircArrcoAnnuelle = totalPoints × valeurDuPoint
```

### 2.3 Public — Fonction publique d'État / CNRACL

| Élément | Règle |
|---------|-------|
| Base de calcul | **Indice majoré des 6 derniers mois** × valeur du point d'indice |
| Taux plein | **75 %** du traitement indiciaire des 6 derniers mois |
| Trimestres requis | 172 trimestres (réforme 2023) |
| Âge minimum | 64 ans (catégorie sédentaire) — 59 ans (catégorie active) |
| Décote | −1,25 % par trimestre manquant |
| Surcote | +1,25 % par trimestre supplémentaire |
| Primes | **Non incluses** dans le calcul de la pension de base (mais cotisent à la RAFP) |

**Formule simplifiée** :

```
traitementBrut6Mois        = indiceMajore × valeurDuPoint(date_départ)
tauxLiquidation            = 75 % × min(1, trimestresValides / 172)
pensionBaseAnnuelle        = traitementBrut6Mois × tauxLiquidation
```

### 2.4 Public — RAFP (Retraite Additionnelle de la Fonction Publique)

Régime à points sur les primes (créé en 2005, ne capitalise pas avant cette date).

| Élément | Règle |
|---------|-------|
| Base de cotisation | Primes plafonnées à 20 % du traitement indiciaire |
| Cotisation | 5 % salarial + 5 % employeur |
| Valeur du point | **0,04886 €** en 2024 |
| Prix d'achat | **1,3414 €** en 2024 |

> Modèle V1 simplifié : la RAFP n'est **pas calculée précisément**. Elle est représentée par un pourcentage forfaitaire (`rafpRate`, défaut 5 %) appliqué au traitement de base. Une modélisation complète est listée en évolution future.

### 2.5 Prélèvements sociaux sur les pensions

Quel que soit le régime, la pension brute subit les prélèvements suivants à la sortie :

| Prélèvement | Taux |
|-------------|------|
| CSG | 8,3 % (taux plein) |
| CRDS | 0,5 % |
| CASA | 0,3 % |
| Cotisation maladie (complémentaire uniquement) | 1 % |
| **Total prélèvements** | **≈ 9,1 % à 10,1 %** selon le régime |

```
pensionNetteAnnuelle = pensionBruteAnnuelle × (1 − tauxPrelevements / 100)
```

---

## 3. Paramètres d'entrée

### 3.1 Profil utilisateur (pré-rempli depuis l'API)

| Paramètre | Source | Description |
|-----------|--------|-------------|
| `birthDate` | `GET /api/auth/me` (champ déjà exposé) | Date de naissance — détermine l'âge légal et la durée de cotisation requise |
| `contractType` | `GET /api/salary-contracts` (contrat actif) | `PRIVATE` ou `PUBLIC` — aiguille vers Régime Général ou CNRACL |
| `currentSalaryGross` | Contrat actif (révision active) | Salaire brut annuel actuel — base de la projection |
| `currentIndiceMajore` | Contrat actif PUBLIC | Indice majoré actuel pour la projection fonction publique |
| `careerStartDate` | Saisie manuelle (pré-rempli depuis l'année du 1er bulletin si dispo) | Date d'entrée dans la vie active |

### 3.2 Carrière prévisionnelle

| Paramètre | Type | Description |
|-----------|------|-------------|
| `salaryGrowthRate` | `number` | Hausse annuelle moyenne du salaire (%, défaut 2) — utilisée pour projeter la carrière jusqu'à la retraite |
| `retirementAge` | `number` | Âge de départ à la retraite souhaité (60–70, défaut 64) |
| `careerInterruptions` | `Array<{type, durationMonths, year}>` | Interruptions de carrière (chômage, parentalité, mi-temps) — *V2, listées en évolution future* |
| `historicalSalaries` | `Map<year, number>` | Historique annuel des salaires bruts — pré-rempli depuis les bulletins existants si disponibles, sinon calculé linéairement par projection inverse |

### 3.3 Trimestres validés

| Paramètre | Type | Description |
|-----------|------|-------------|
| `trimestresAcquis` | `number` | Nombre de trimestres déjà validés (saisie manuelle, défaut calculé : `(today - careerStartDate).years × 4`) |
| `trimestresRequis` | `number` | Nombre de trimestres pour le taux plein (défaut 172, calculé selon génération) |
| `trimestresAdditionnels` | `number` | Trimestres bonifiés (enfants, militaire, etc.) — défaut 0 |

### 3.4 Hypothèses Agirc-Arrco (privé)

| Paramètre | Type | Description |
|-----------|------|-------------|
| `agircArrcoPointsActuels` | `number` | Points Agirc-Arrco déjà accumulés — saisi depuis le relevé info-retraite (défaut 0 = calculé par projection) |
| `prixDuPoint` | `number` | Prix d'achat du point (défaut 18,7669 €, externalisé YAML) |
| `valeurDuPoint` | `number` | Valeur du point (défaut 1,4159 €, externalisé YAML) |
| `appliquerCoefficientSolidarite` | `boolean` | Appliquer le malus de 10 % pendant 3 ans (défaut `true` si départ à l'âge taux plein) |

### 3.5 Hypothèses CNRACL / Public

| Paramètre | Type | Description |
|-----------|------|-------------|
| `indiceMajoreFinCarriere` | `number` | Indice majoré projeté à la fin de carrière (défaut = `currentIndiceMajore × (1 + salaryGrowthRate/100)^yearsRemaining`) |
| `valeurPointIndice` | `number` | Valeur annuelle du point d'indice à la date de départ (défaut depuis `tax-parameters.yml` existant) |
| `rafpRate` | `number` | Taux forfaitaire RAFP (%, défaut 5) — modèle simplifié V1 |

### 3.6 Comparaison avec un objectif

| Paramètre | Type | Description |
|-----------|------|-------------|
| `targetReplacementRate` | `number` | Taux de remplacement cible (%, défaut 75) — `pension / dernier salaire net` |
| `targetMonthlyIncome` | `number` | Revenu mensuel net cible (€) — alternatif à `targetReplacementRate` |
| `targetMode` | `'replacementRate' \| 'fixedAmount'` | Mode de l'objectif |

### 3.7 Capital PER nécessaire (calcul inverse)

| Paramètre | Type | Description |
|-----------|------|-------------|
| `perAnnualReturn` | `number` | Rendement annuel attendu du PER (%, défaut 5) |
| `perWithdrawalRate` | `number` | Taux de retrait annuel à la retraite (%, défaut 4 — règle des 4 %) |
| `perCurrentCapital` | `number` | Capital PER déjà accumulé (€, défaut 0) |
| `currentTMI` | `number` | TMI actuelle (%) — pré-rempli depuis `/api/tax-simulator` |
| `retirementTMI` | `number` | TMI à la retraite (%, défaut = `currentTMI − 11`) — souvent inférieure |

---

## 4. Formules de calcul

### 4.1 Variables communes

```
yearOfBirth      = year(birthDate)
yearOfRetirement = yearOfBirth + retirementAge
yearsRemaining   = yearOfRetirement − currentYear
trimestresRequis = trimestresRequiredForGeneration(yearOfBirth)  // ex : 172 pour 1965+
ageActuel        = (today − birthDate).years
```

### 4.2 Projection de la carrière (privé)

Construction du tableau année par année :

```
historicalSalaries: { [year]: salaryGross }
projectedSalaries:  { [year]: salaryGross }   // jusqu'à yearOfRetirement

for each year y from currentYear+1 to yearOfRetirement:
  projectedSalaries[y] = projectedSalaries[y-1] × (1 + salaryGrowthRate/100)
```

### 4.3 Pension Régime Général (CNAV)

```
// 25 meilleures années plafonnées au PASS revalorisé
salairesPlafonnes  = mergeAllSalaries.map(s => min(s, PASS_year(s.year)))
top25              = salairesPlafonnes.sortedDesc().slice(0, 25)
SAM                = average(top25)

trimestresFinaux   = min(trimestresAcquis + trimestresAdditionnels + projectedTrimestres, trimestresRequis)
projectedTrimestres = max(0, (yearOfRetirement − currentYear) × 4)

tauxLiquidation    = 0.50 × min(1, trimestresFinaux / trimestresRequis)
// Si départ avant l'âge légal sans taux plein : décote
if ageDeDepart < ageMinimumLegal:
  decote = 0.0125 × (trimestresManquants)   // max 25 %
  tauxLiquidation = tauxLiquidation × (1 − min(decote, 0.25))

pensionBaseAnnuelleBrute = SAM × tauxLiquidation
```

### 4.4 Pension Agirc-Arrco (complémentaire privé)

```
pointsAnnuels(y) = (salaryGross(y) × cotisationGlobale(y)) / prixDuPoint(y)

avec cotisationGlobale(y):
  tranche1 = min(salaryGross(y), PASS(y))     × 7.87 %
  tranche2 = max(0, salaryGross(y) − PASS(y)) × 21.59 %
  cotisationGlobale = (tranche1 + tranche2) / salaryGross(y)
  // Note : on prend la part salariale + employeur pour calculer les points

totalPoints = agircArrcoPointsActuels + Σ pointsAnnuels(y) pour y in années_projetées

pensionAgircArrcoAnnuelleBrute = totalPoints × valeurDuPoint

// Coefficient de solidarité (départ à l'âge taux plein sans surcote)
if appliquerCoefficientSolidarite:
  pensionAgircArrcoAnnuelleBrute_3premieresAnnées = pension × 0.90
```

### 4.5 Pension CNRACL / Service des Retraites de l'État

```
traitementBrut6Mois  = indiceMajoreFinCarriere × valeurPointIndice
tauxLiquidation      = 0.75 × min(1, trimestresFinaux / trimestresRequis)
pensionBaseAnnuelleBrute = traitementBrut6Mois × tauxLiquidation
```

### 4.6 Pension RAFP (simplifiée V1)

```
pensionRAFPAnnuelleBrute = traitementBrut6Mois × rafpRate / 100
```

### 4.7 Pension totale

```
pensionTotaleAnnuelleBrute = pensionBase + pensionComplémentaire
                              (+ pensionRAFP si PUBLIC)

tauxPrelevements           = tauxPrelevementsBase + (régime complémentaire ? 1 % : 0)
pensionTotaleAnnuelleNette = pensionTotaleAnnuelleBrute × (1 − tauxPrelevements / 100)
pensionMensuelleNette      = pensionTotaleAnnuelleNette / 12
```

### 4.8 Taux de remplacement

```
dernierSalaireBrutAnnuel = projectedSalaries[yearOfRetirement − 1]
dernierSalaireNetAnnuel  = dernierSalaireBrutAnnuel × ratioBrutNet

tauxRemplacement = pensionTotaleAnnuelleNette / dernierSalaireNetAnnuel × 100
```

`ratioBrutNet` est calculé via `TaxSimulatorService` ou approximé à 0,77 (privé non-cadre) / 0,75 (cadre) / 0,80 (fonction publique titulaire).

### 4.9 Capital PER nécessaire (calcul inverse)

```
// Étape 1 : objectif net mensuel
if targetMode === 'replacementRate':
  targetMonthlyNet = dernierSalaireNetAnnuel / 12 × targetReplacementRate / 100
else:
  targetMonthlyNet = targetMonthlyIncome

// Étape 2 : delta à combler par le PER
deltaMensuelNet = max(0, targetMonthlyNet − pensionMensuelleNette)
deltaAnnuelNet  = deltaMensuelNet × 12

// Étape 3 : revenu PER brut nécessaire (taxation à la sortie)
// On considère la TMI retraite + 17,2 % PS sur les gains (simplification)
deltaAnnuelBrutNecessaire = deltaAnnuelNet / (1 − retirementTMI/100)

// Étape 4 : capital PER nécessaire selon règle des 4 %
capitalPERNecessaire = deltaAnnuelBrutNecessaire / (perWithdrawalRate / 100)

// Étape 5 : versement mensuel à effectuer pour atteindre ce capital
// Formule annuité — bisect 70 itérations sur monthlyContribution
n        = yearsRemaining × 12
rm       = perAnnualReturn / 100 / 12
target   = capitalPERNecessaire − perCurrentCapital × (1 + rm)^n

monthlyContribution = bisect(monthly => {
  fv = monthly × ((1+rm)^n − 1) / rm
  return fv
}, 0, 10000, target)
```

### 4.10 Comparaison âges de départ

L'utilisateur peut comparer plusieurs scénarios d'âge de départ (60, 62, 64, 67) — pour chacun le simulateur recalcule :

- Pension totale brute / nette
- Taux de remplacement
- Capital PER nécessaire si objectif maintenu
- Décote ou surcote appliquée

Affiché dans une carte comparative à 4 colonnes.

---

## 5. Interface utilisateur

### 5.1 Layout général

```
┌─────────────────────────────────────────────────────────────────────┐
│  Simulateur Retraite                                                │
├────────────────────────┬────────────────────────────────────────────┤
│  PANNEAU GAUCHE (w-80) │  PANNEAU DROIT (flex-1)                    │
│                        │                                            │
│  Mon profil            │  Bannière pension projetée                 │
│  ─ Date naissance      │  « Pension nette mensuelle : 2 380 € »     │
│  ─ Type de contrat     │  Taux de remplacement 65 %                 │
│  ─ Salaire / IM actuel │                                            │
│  ─ Année début carrière│  KPIs (4 cartes)                           │
│                        │  Régime base / Complémentaire / Total / Net│
│  Carrière prévisionnel.│                                            │
│  ─ Hausse salaire (%)  │  Comparaison âges de départ (4 colonnes)   │
│  ─ Âge de départ       │  60 ans / 62 ans / 64 ans / 67 ans         │
│  ─ Trimestres acquis   │                                            │
│                        │  Graphique évolution des revenus           │
│  Hypothèses Agirc-Arrco│  ─ Salaire actif (jusqu'à retraite)        │
│  ─ Points actuels      │  ─ Pension projetée (à partir de retraite) │
│                        │                                            │
│  Hypothèses Public ▾   │  Bloc PER : capital nécessaire + versement │
│  Objectif retraite     │  mensuel pour combler le manque            │
│  ─ Mode : taux % / €   │                                            │
│  ─ Cible               │  Tableau pension année par année ▾         │
│                        │                                            │
│  Stratégie PER ▾       │  Notes méthodologiques                     │
└────────────────────────┴────────────────────────────────────────────┘
```

### 5.2 Bannière pension projetée

Carte fond gradient indigo→violet en haut du panneau droit :

```
🏖️  Pension nette mensuelle : 2 380 €
    Taux de remplacement : 65 %
    Manque pour atteindre 75 % : 365 € / mois
    → capital PER cible : 109 500 €
```

### 5.3 KPIs synthèse

Quatre cartes côte à côte :

| Carte | Valeur |
|-------|--------|
| Régime de base | `pensionBase / 12` (mensuel net) |
| Complémentaire | `pensionAgircArrcoOuRAFP / 12` |
| **Total brut** | `pensionTotaleBrute / 12` (gros chiffre) |
| **Total net** | `pensionTotaleNette / 12` (gros chiffre indigo) |

### 5.4 Comparaison âges de départ

Tableau à 4 colonnes (60 / 62 / 64 / 67 ans), 6 lignes :

| Indicateur | 60 ans | 62 ans | 64 ans | 67 ans |
|-----------|--------|--------|--------|--------|
| Trimestres validés | … | … | … | … |
| Décote / surcote | −15 % | −5 % | 0 | +12 % |
| Pension nette mensuelle | 1 750 € | 2 100 € | 2 380 € | 2 850 € |
| Taux de remplacement | 48 % | 58 % | 65 % | 78 % |
| Capital PER nécessaire | 240 K€ | 150 K€ | 109 K€ | 0 € |
| Verdict | ❌ | ⚠ | ✓ | ⭐ |

### 5.5 Graphique évolution des revenus

`Recharts ComposedChart` :
- Axe X : années (de `currentYear` à `currentYear + 40`)
- Axe Y : revenu annuel net (€)
- Aire indigo : salaire actif (jusqu'à `yearOfRetirement`)
- Aire violet : pension nette projetée (à partir de `yearOfRetirement`)
- `ReferenceLine` pointillée à `yearOfRetirement` avec label « Départ retraite »
- `Tooltip` : revenu annuel + mensuel

### 5.6 Bloc PER (calcul inverse)

Carte dédiée fond emerald-50 (mode succès si objectif atteignable) ou orange-50 (si effort important) :

```
🎯 Pour atteindre 75 % de remplacement :
   Manque mensuel net : 365 €
   Capital PER cible  : 109 500 € à la retraite
   Versement mensuel  : 295 € pendant 18 ans
   (rendement 5 %, capital initial PER 0 €, TMI sortie 19 %)
```

Avec un mini-bouton « Affiner dans le simulateur d'intérêts composés » qui ouvre `/compound-interest` pré-rempli.

### 5.7 Tableau pension année par année

Vue dépliable. Colonnes :

| Année | Âge | Salaire brut | Salaire net | Trimestres validés | Points Agirc | Pension nette si départ ici |
|-------|-----|--------------|-------------|--------------------|--------------|-----------------------------|
| 2025 | 35 | … | … | 60 | 800 | impossible (âge < min) |
| 2055 | 65 | — | — | 172 | 7 240 | 2 850 € |

### 5.8 Notes méthodologiques

Footnotes numérotées dynamiquement :

1. Hypothèse de salaire historique (depuis bulletins existants ou rétro-projection linéaire)
2. PASS revalorisé linéairement (1,5 %/an si non disponible)
3. Calcul SAM : 25 meilleures années plafonnées au PASS de l'année correspondante
4. Trimestres requis : 172 pour générations 1965+, ajusté pour 1958–1964
5. Décote linéaire 1,25 %/trimestre manquant (max 25 %)
6. Coefficient de solidarité Agirc-Arrco appliqué pendant 3 ans si départ à l'âge taux plein sans surcote
7. Prélèvements sociaux retraite : CSG 8,3 % + CRDS 0,5 % + CASA 0,3 % + 1 % maladie complémentaire
8. PUBLIC : indice majoré projeté linéairement, RAFP forfaitaire 5 %
9. Capital PER : règle des 4 % avec rendement net après frais déjà appliqué
10. Hypothèse de TMI à la retraite égale à TMI actuelle − 11 points (configurable)

---

## 6. Structure du composant

### 6.1 Fichier

```
frontend/src/components/tools/RetirementSimulatorPage.jsx
```

### 6.2 Sous-composants internes

| Composant | Description |
|-----------|-------------|
| `NumInput` | Input numérique réutilisé |
| `Section` | Section repliable réutilisée |
| `RetirementBanner` | Bannière de tête avec pension projetée + objectif |
| `RetirementKPICard` | Carte KPI (régime base / complémentaire / total brut / total net) |
| `AgeComparisonTable` | Tableau de comparaison des âges de départ |
| `PERStrategyCard` | Carte « Pour combler le manque » avec lien vers simulateur intérêts composés |
| `RetirementChart` | Graphique évolution salaire → pension |

### 6.3 Fonctions de calcul (fichier `frontend/src/utils/retirement.js`)

| Fonction | Description |
|----------|-------------|
| `projectCareer(params)` | Projette la carrière année par année (salaire brut + trimestres acquis) |
| `computeRegimeGeneral(career, params)` | Calcule SAM + pension de base privé |
| `computeAgircArrco(career, params)` | Calcule total points + pension complémentaire privé |
| `computeRegimePublic(career, params)` | Calcule pension de base public (indice majoré × 75 %) |
| `computeRAFP(career, params)` | Calcule RAFP forfaitaire V1 |
| `applySocialCharges(brutAnnuel, hasComplementary)` | Applique CSG + CRDS + CASA + 1 % maladie |
| `compareRetirementAges(career, params, ages)` | Recalcule pour 4 âges de départ |
| `computeRequiredPERCapital(deltaAnnualNet, params)` | Capital PER pour combler le manque |
| `computeRequiredPERContribution(targetCapital, params)` | Versement mensuel via bisect |

### 6.4 Référentiel externalisé (backend)

Fichier `backend/src/main/resources/retirement-parameters.yml` chargé via `@ConfigurationProperties` :

```yaml
retirement:
  pass:                      # Plafond Annuel Sécurité Sociale
    history:
      - { year: 2024, value: 46368 }
      - { year: 2023, value: 43992 }
      - { year: 2022, value: 41136 }
      # … historique complet jusqu'à ~2000
    growthRate: 1.5          # projection future si année non listée
  baseScheme:
    privateRate: 0.50        # taux plein privé
    publicRate: 0.75         # taux plein public
    decoteByMissingTrimestre: 0.0125
    maxDecote: 0.25
    maxSurcote: 0.30
    socialChargesRate:
      base: 9.1              # CSG + CRDS + CASA
      withComplementary: 10.1 # + 1 % maladie
    trimestresByGeneration:
      "1958-1959": 167
      "1960-1961": 168
      "1962-1963": 169
      "1964": 171
      "1965+": 172
    ageMinimal:
      "1955-1957": 62
      "1958-1960": 62.25
      # … barème complet réforme 2023
      "1968+": 64
  agircArrco:
    pointPurchasePrice: 18.7669
    pointValue: 1.4159
    employeeRateT1: 3.94     # Salarial T1 (%) — total = 7,87 % avec employeur
    employeeRateT2: 9.86     # Salarial T2 (%) — total = 21,59 %
    coefficientSolidaritePenalty: 0.10
    coefficientSolidariteDuration: 3   # années
    bonificationThresholds:
      - { trimestresExtra: 8,  rate: 0.10 }
      - { trimestresExtra: 12, rate: 0.20 }
      - { trimestresExtra: 16, rate: 0.30 }
  rafp:
    pointValue: 0.04886
    pointPurchasePrice: 1.3414
    employeeRate: 0.05
    employerRate: 0.05
    primeCapPercentage: 0.20  # cap 20 % du traitement
```

### 6.5 Endpoint backend

| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/retirement/parameters` | Authentifié | Retourne le contenu désérialisé de `retirement-parameters.yml` (lecture seule) |

Implémentation :

```java
@RestController
@RequestMapping("/api/retirement")
public class RetirementController {
    private final RetirementParameters params;
    public RetirementController(RetirementParameters params) { this.params = params; }

    @GetMapping("/parameters")
    public RetirementParameters get() { return params; }
}
```

Pas de service métier — l'objet `RetirementParameters` est exposé tel quel (lecture pure depuis YAML).

### 6.6 État local (useState)

```js
// Profil utilisateur (pré-rempli)
const [birthDate, setBirthDate]               = useState(null)
const [contractType, setContractType]         = useState('PRIVATE')
const [currentSalaryGross, setCurrentSalaryGross] = useState(0)
const [currentIndiceMajore, setCurrentIndiceMajore] = useState(0)
const [careerStartDate, setCareerStartDate]   = useState(null)

// Carrière prévisionnelle
const [salaryGrowthRate, setSalaryGrowthRate] = useState(2)
const [retirementAge, setRetirementAge]       = useState(64)
const [trimestresAcquis, setTrimestresAcquis] = useState(0)

// Hypothèses Agirc-Arrco
const [agircArrcoPointsActuels, setAgircArrcoPointsActuels] = useState(0)

// Hypothèses Public
const [indiceMajoreFinCarriere, setIndiceMajoreFinCarriere] = useState(0)
const [rafpRate, setRafpRate]                 = useState(5)

// Objectif
const [targetMode, setTargetMode]             = useState('replacementRate')
const [targetReplacementRate, setTargetReplacementRate] = useState(75)
const [targetMonthlyIncome, setTargetMonthlyIncome] = useState(2500)

// Stratégie PER
const [perAnnualReturn, setPerAnnualReturn]   = useState(5)
const [perWithdrawalRate, setPerWithdrawalRate] = useState(4)
const [perCurrentCapital, setPerCurrentCapital] = useState(0)
const [retirementTMI, setRetirementTMI]       = useState(19)

// Référentiels chargés
const [retirementParams, setRetirementParams] = useState(null)
const [activeContract, setActiveContract]     = useState(null)
const [currentTMI, setCurrentTMI]             = useState(30)
```

### 6.7 Effects de pré-remplissage

```js
useEffect(() => {
  // Charger le référentiel retraite (1 seule fois)
  retirementApi.getParameters().then(setRetirementParams)

  // Charger la session utilisateur (birthDate)
  authApi.me().then(user => setBirthDate(user.birthDate))

  // Charger le contrat actif (type, salaire/IM, dates)
  salaryApi.listContracts().then(contracts => {
    const active = contracts.find(c => c.isActive)
    if (active) {
      setActiveContract(active)
      setContractType(active.contractType)
      setCurrentSalaryGross(active.annualGrossSalary || 0)
      setCurrentIndiceMajore(active.indiceMajore || 0)
      setCareerStartDate(active.startDate)
    }
  })

  // Charger la TMI
  taxApi.simulateMine().then(res => {
    const tmi = inferTMIFromTaxBracket(res.totalTaxableIncome, res.fiscalParts)
    setCurrentTMI(tmi)
    setRetirementTMI(Math.max(0, tmi - 11))
  })
}, [])
```

### 6.8 useMemo principal

```js
const result = useMemo(() => {
  if (!retirementParams) return null

  const career = projectCareer({
    historicalSalaries: deriveHistoricalFromPaySlips(),
    currentSalary: currentSalaryGross,
    salaryGrowthRate, retirementAge, birthDate,
    careerStartDate, retirementParams
  })

  const baseScheme = (contractType === 'PUBLIC')
    ? computeRegimePublic(career, { indiceMajoreFinCarriere, retirementParams, retirementAge, trimestresAcquis })
    : computeRegimeGeneral(career, { retirementParams, retirementAge, trimestresAcquis })

  const complementary = (contractType === 'PUBLIC')
    ? computeRAFP(career, { rafpRate, retirementParams })
    : computeAgircArrco(career, { agircArrcoPointsActuels, retirementParams })

  const totalGrossAnnual = baseScheme.annual + complementary.annual
  const totalNetAnnual   = applySocialCharges(totalGrossAnnual, complementary.annual > 0)
  const replacementRate  = totalNetAnnual / career.lastNetSalaryAnnual * 100

  const ageComparison = compareRetirementAges(career, { ...allParams }, [60, 62, 64, 67])

  // Bloc PER
  const targetMonthlyNet = targetMode === 'replacementRate'
    ? career.lastNetSalaryMonthly * targetReplacementRate / 100
    : targetMonthlyIncome
  const deltaMonthly = Math.max(0, targetMonthlyNet - totalNetAnnual / 12)
  const perCapital = computeRequiredPERCapital(deltaMonthly * 12, { retirementTMI, perWithdrawalRate })
  const perContribution = computeRequiredPERContribution(perCapital, {
    yearsRemaining: retirementAge - currentAge,
    perAnnualReturn, perCurrentCapital
  })

  return { baseScheme, complementary, totalGrossAnnual, totalNetAnnual,
           replacementRate, ageComparison, perCapital, perContribution, career }
}, [/* mêmes dépendances + retirementParams */])
```

---

## 7. Navigation et routing

### 7.1 App.jsx

```jsx
import RetirementSimulatorPage from './components/tools/RetirementSimulatorPage'
// ...
{currentPage === 'retirement' && <RetirementSimulatorPage />}
```

### 7.2 Navigation.jsx

Entrée dans le dropdown **Outils** :

```jsx
{ page: 'retirement', label: 'Simulateur retraite' }
```

La variable `isToolsPage` inclut `'retirement'`.

---

## 8. Contraintes de validation

| Champ | Contrainte |
|-------|-----------|
| `birthDate` | Obligatoire (sinon page non utilisable, message d'invitation à compléter le profil) |
| `retirementAge` | 60 – 70 |
| `salaryGrowthRate` | 0 – 10 % |
| `trimestresAcquis` | 0 – 200 |
| `agircArrcoPointsActuels` | 0 – 50 000 |
| `indiceMajoreFinCarriere` | 200 – 1500 |
| `rafpRate` | 0 – 15 % |
| `targetReplacementRate` | 30 – 100 % |
| `targetMonthlyIncome` | 500 – 20 000 € |
| `perAnnualReturn` | 0 – 15 % |
| `perWithdrawalRate` | 2 – 8 % |
| `retirementTMI` | ∈ {0, 11, 30, 41, 45} |

Warnings :
- `trimestresAcquis + projectedTrimestres < trimestresRequis` → bandeau orange « Décote attendue »
- `replacementRate < 50 %` → bandeau rouge « Effort d'épargne fortement recommandé »
- `careerStartDate` non renseignée → estimation linéaire avec mention « Estimation basée sur âge et carrière supposée à 22 ans »

---

## 9. Évolutions futures envisageables

- **Interruptions de carrière** : prise en compte du chômage (trimestres validés gratuits selon barème), congé parental, mi-temps
- **Polypensionnés** : utilisateurs ayant cotisé à plusieurs régimes (privé puis public, ou inversement) — calcul prorata
- **Calcul RAFP précis** : remplacer le forfait par un cumul de points effectif (nécessite l'historique des primes)
- **Pension de réversion** : option couple pour estimer la pension du conjoint survivant (54 % privé / 50 % public)
- **Sauvegarde de simulation** : entité `RetirementSimulation` (modèle identique à `LoanSimulation`) — endpoints `GET/POST/DELETE /api/retirement-simulations`
- **Pré-remplissage carrière depuis bulletins** : utiliser tous les `MonthlyPaySlip` agrégés par année comme historique réel des salaires
- **Connexion Info Retraite** : import du Relevé Individuel de Situation (RIS) au format XML/PDF — nécessiterait OCR ou API DGFiP
- **Comparaison régimes** : « Si j'avais été dans le privé/public toute ma carrière » pour les agents passés du public au privé
- **Indemnité de départ à la retraite** : calcul de la prime de départ selon convention collective
- **Cumul emploi-retraite** : estimer le revenu si l'utilisateur reprend une activité après liquidation
- **Décote/surcote interactive** : graphique de sensibilité de la pension selon l'âge de départ (continu)
- **Hypothèses CNAV macroéconomiques** : intégrer les scénarios COR (Conseil d'Orientation des Retraites) — équilibre / déséquilibre

---

## 10. Backend minimal requis

### 10.1 Nouveau fichier de configuration

`backend/src/main/resources/retirement-parameters.yml` — barèmes et paramètres retraite (cf. §6.4).

### 10.2 Nouvelle classe @ConfigurationProperties

```java
@ConfigurationProperties(prefix = "retirement")
@Data
public class RetirementParameters {
    private PassConfig pass;
    private BaseSchemeConfig baseScheme;
    private AgircArrcoConfig agircArrco;
    private RafpConfig rafp;
    // … + classes internes
}
```

### 10.3 Nouveau controller

`RetirementController` exposant `GET /api/retirement/parameters` (authentifié, lecture seule).

### 10.4 Nouveau test

`RetirementControllerTest` (`@WebMvcTest`) — 2 cas :
- Utilisateur authentifié → 200 + corps JSON
- Utilisateur non authentifié → 401

### 10.5 Aucune entité JPA, aucune migration SQLite

L'outil ne persiste rien en base. La sauvegarde de simulations est listée en évolution future (entité `RetirementSimulation` similaire à `LoanSimulation`).

### 10.6 Documentation API

Nouveau fichier `docs/api/retirement.md` documentant l'endpoint `GET /api/retirement/parameters` avec un exemple de réponse JSON complète.
