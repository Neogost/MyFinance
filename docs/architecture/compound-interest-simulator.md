# Simulateur d'Intérêts Composés

## 1. Objectif

Permettre à l'utilisateur de **projeter la croissance d'un capital** sur une durée déterminée, en tenant compte des intérêts composés, de versements périodiques, de l'inflation, de frais de gestion, de la fiscalité PFU et d'un taux de retrait à la retraite. L'outil offre également un **mode inversé** pour calculer les paramètres nécessaires à l'atteinte d'un objectif de patrimoine.

> Outil purement frontend — aucun endpoint backend requis. Tous les calculs sont effectués dans le composant React.

---

## 2. Modes de simulation

### 2.1 Mode standard — projection directe

L'utilisateur renseigne les paramètres initiaux et obtient une projection year-by-year du patrimoine.

**Paramètres d'entrée :**

| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `initialAmount` | `number` | Oui | Capital initial (€) |
| `annualRate` | `number` | Oui | Taux d'intérêt annuel brut (%) |
| `duration` | `number` | Oui | Durée de la simulation (années, 1–50) — ou calculé depuis `targetYear` |
| `targetYear` | `number` | Non | Année cible (alternative à `duration`) |
| `contributionAmount` | `number` | Non | Montant des versements périodiques (€, 200 par défaut) |
| `contributionFrequency` | `'monthly' \| 'annual'` | Non | Fréquence des versements (`monthly` par défaut) |
| `contributionGrowthRate` | `number` | Non | Hausse annuelle des versements en % (0 par défaut) — ex : +3 %/an pour suivre l'évolution du salaire |
| `inflationRate` | `number` | Non | Taux d'inflation annuel à déduire du rendement (%, 2 par défaut) |
| `managementFees` | `number` | Non | Frais de gestion annuels en % déduits du taux nominal (0 par défaut) — ex : ETF 0,2 % |
| `applyPFU` | `boolean` | Non | Applique la flat tax PFU 30 % en réduisant le taux effectif à 70 % (false par défaut) |
| `withdrawalRate` | `number` | Non | Taux de retrait annuel en % du capital final, appliqué après la simulation pour estimer un revenu passif et modéliser la phase de décaissement (0 par défaut) |
| `lumpSums` | `Array<{id, year, amount}>` | Non | Apports ponctuels (héritage, vente d'un bien, prime…) ajoutés à une année donnée ([] par défaut) |

**Paramètre dérivé :**

```
realRate = annualRate - inflationRate - managementFees
effectiveRate = applyPFU ? realRate × 0.70 : realRate
```

Le taux effectif est utilisé pour tous les calculs de projection.

**Mode horizon :**

L'utilisateur peut choisir entre :
- **Durée** : slider 1–50 ans (state `durationMode = 'years'`)
- **Année cible** : input numérique année (state `durationMode = 'targetYear'`) — `effectiveDuration = targetYear - CURRENT_YEAR`

---

### 2.2 Formules de calcul (mode standard)

**Projection year-by-year** — `buildChartData()` (boucle sur chaque année `t` de 1 à `duration`) :

Pour chaque année `t`, le capital est calculé ainsi si les versements sont **mensuels** :

```
rm = effectiveRate / 100 / 12

// Intérêts sur le capital existant
yearIntFromCapital = capital × effectiveRate / 100

// Valeur future des 12 versements mensuels (annuité de fin de période)
if rm === 0:
  fvContributions = contributionAmount × 12
else:
  fvContributions = contributionAmount × ((1 + rm)^12 - 1) / rm

// Intérêts générés par les versements
yearIntFromContrib = fvContributions - contributionAmount × 12

capital(t) = capital(t-1) × (1 + effectiveRate/100) + fvContributions
```

Pour des versements **annuels** (versement en début d'année) :

```
yearIntFromCapital = capital × effectiveRate / 100
yearIntFromContrib = contributionAmount × effectiveRate / 100
capital(t) = (capital(t-1) + contributionAmount) × (1 + effectiveRate/100)
```

**Hausse annuelle des versements (`contributionGrowthRate`) :**

```
currentContrib(0) = contributionAmount
currentContrib(t) = currentContrib(t-1) × (1 + contributionGrowthRate / 100)
```

**Apports ponctuels (`lumpSums`) :** ajoutés après le calcul des intérêts de l'année concernée — le capital et `totalInvested` sont incrémentés du montant de l'apport. L'apport capitalisera à partir de l'année suivante.

**Cumul des versements investis** à l'année `t` :

```
totalInvested(t) = totalInvested(t-1) + currentContrib × contributionsPerYear + lumpSum(t)
```

avec `contributionsPerYear` = 12 (mensuel) ou 1 (annuel).

**Intérêts cumulés** à l'année `t` :

```
totalInterest(t) = capital(t) - totalInvested(t)
```

**Retrait annuel estimé** (calculé à la fin, à titre indicatif) :

```
annualWithdrawal = capital(duration) × withdrawalRate / 100
monthlyWithdrawal = annualWithdrawal / 12
```

---

### 2.3 Point de croisement (crossover)

Le **point de croisement** est l'année `t` où `totalInterest(t) >= totalInvested(t)` — c'est-à-dire le moment où les intérêts dépassent le capital investi (l'argent "travaille plus que l'utilisateur"). Il est affiché via une `ReferenceLine` verte sur le graphique et mis en évidence dans le tableau et la synthèse.

```
crossoverIndex = index de la première entrée où interets >= investi
```

---

### 2.4 Phase de décaissement (`buildDecumulationData`)

Lorsque `withdrawalRate > 0`, une simulation de la **phase de décaissement** est calculée après la fin de la phase d'accumulation. Elle modélise l'évolution du capital à la retraite sous des retraits annuels fixes.

```
annualWithdrawal = finalCapital × withdrawalRate / 100

for each year t (0 to 60):
  capital(t) displayed
  if capital <= 0: stop
  capital(t+1) = capital(t) × (1 + effectiveRate/100) - annualWithdrawal
```

**Indicateurs calculés :**

| Indicateur | Description |
|-----------|-------------|
| `isSustainable` | `true` si `effectiveRate >= withdrawalRate` — le capital est théoriquement perpétuel |
| `depletionIndex` | Index dans `decumulationData` où `capital <= 0` (durée de vie du capital) |

---

### 2.5 Mode inversé — objectif de patrimoine

L'utilisateur fixe un **patrimoine cible** et choisit quels paramètres sont fixes/variables. La résolution se fait par **dichotomie numérique** (`bisect()` — 70 itérations, précision < 0,01 €).

**Quatre variantes disponibles :**

#### Variante A — Combien dois-je verser ? (`contribution`)

Paramètres fixes : `targetAmount`, `initialAmount`, `annualRate`, `duration`, `contributionFrequency`
Paramètre calculé : `contributionAmount` requis (dichotomie entre 0 et 200 000 €)

#### Variante B — En combien de temps ? (`duration`)

Paramètres fixes : `targetAmount`, `initialAmount`, `annualRate`, `contributionAmount`
Paramètre calculé : `duration` (dichotomie entre 1 et 100 ans, arrondi au plafond)

#### Variante C — Quel taux me faut-il ? (`rate`)

Paramètres fixes : `targetAmount`, `initialAmount`, `duration`, `contributionAmount`
Paramètre calculé : `annualRate` brut (dichotomie entre 0 % et 50 %)

#### Variante D — Un revenu mensuel cible (`monthlyIncome`)

L'utilisateur renseigne un **revenu mensuel souhaité** (`desiredMonthly`) et un **taux de retrait** (`withdrawalRate`). Le capital cible est déduit :

```
targetCapital = desiredMonthly × 12 / (withdrawalRate / 100)
```

Puis le **versement requis** est calculé par dichotomie (comme variante A) pour atteindre ce `targetCapital`.

En mode `monthlyIncome`, le champ "Versements" est masqué du panneau principal — l'utilisateur le saisit directement dans le bloc "Objectif".

---

### 2.6 Scénarios comparatifs

Lorsque `showScenarios = true`, deux projections supplémentaires sont calculées avec des taux alternatifs :
- **Pessimiste** : taux `pessimisticRate` (défaut 4 %)
- **Optimiste** : taux `optimisticRate` (défaut 10 %)

Ces projections utilisent les mêmes versements, durée et paramètres — seul le taux d'intérêt change. Elles sont affichées sous forme de lignes pointillées sur le graphique et de colonnes supplémentaires dans le tableau.

---

## 3. Interface utilisateur

### 3.1 Layout général

```
┌─────────────────────────────────────────────────────────────────┐
│  Simulateur d'Intérêts Composés          [Projection directe]   │
│                                          [Mode inversé]          │
├────────────────────────┬────────────────────────────────────────┤
│  PANNEAU GAUCHE (w-72) │  PANNEAU DROIT (flex-1)                │
│                        │                                        │
│  Paramètres de base    │  [Bannière résultat — mode inversé]    │
│  Versements            │                                        │
│  Objectif (inversé)    │  Graphique ComposedChart               │
│  Apports ponctuels ▾   │  [Zone empilée :                       │
│  Scénarios ▾           │    - Indigo : Capital investi          │
│  Options avancées ▾    │    - Orange : Intérêts cumulés]        │
│                        │  [Lignes pointillées : scénarios]      │
│                        │  [ReferenceLine verte : croisement]    │
│                        │                                        │
│                        ├────────────────────────────────────────┤
│                        │  Synthèse (3 colonnes)                 │
│                        │  Capital investi / Intérêts / Total    │
│                        │  [Point de croisement]                 │
│                        │  [Retraits estimés si withdrawalRate]  │
│                        │                                        │
│                        ├────────────────────────────────────────┤
│                        │  Phase de décaissement (si retrait)    │
│                        │  Graphique Area + badge durable/épuisé │
│                        │                                        │
│                        ├────────────────────────────────────────┤
│                        │  Tableau année par année ▾             │
│                        │  [avec tooltip intérêts au hover]      │
└────────────────────────┴────────────────────────────────────────┘

Notes méthodologiques (footnotes dynamiques)
```

### 3.2 Panneau de paramètres (gauche)

**Section "Paramètres de base" :**
- `Capital initial (€)` — input numérique (≥ 0, step 500)
- `Taux d'intérêt annuel (%)` — input décimal, désactivé en mode inversé variante `rate`
- `Horizon` — toggle **Durée** (slider 1–50 ans) / **Année cible** (input numérique), masqué en mode inversé variante `duration`

**Section "Versements" :** (masquée en mode inversé variantes `contribution` et `monthlyIncome`)
- `Montant (€)` — input numérique + `FrequencyToggle` Mensuel/Annuel
- `Hausse annuelle des versements (%)` — 0–20 %, step 0,5

**Section "Objectif" :** (accent indigo, mode inversé uniquement)
- Sélecteur radio : `contribution` | `duration` | `rate` | `monthlyIncome`
- Variante `monthlyIncome` : `Revenu mensuel souhaité (€)` + `Taux de retrait (%/an)` + champ Versements intégré
- Autres variantes : `Patrimoine cible (€)`

**Section "Apports ponctuels" :** (repliée par défaut)
- Liste des apports avec sélecteur d'année et montant
- Bouton "+ Ajouter un apport"

**Section "Scénarios" :** (repliée par défaut)
- Checkbox `Afficher pessimiste / optimiste`
- `Taux pessimiste (%)` et `Taux optimiste (%)`

**Section "Options avancées" :** (repliée par défaut)
- `Inflation annuelle (%)` — 0–20 %, step 0,1 — déduite du taux nominal
- `Frais de gestion annuels (%)` — 0–5 %, step 0,05
- `PFU 30 % — flat tax CTO` — checkbox — affiche le rendement net estimé si coché
- `Taux de retrait (%/an)` — 0–20 %, step 0,1 (masqué en mode inversé variante `monthlyIncome`)
- Récapitulatif taux : nominal → effectif (avec déductions affichées)
- Warning si `realRate < 0`

### 3.3 Graphique principal

**Composant Recharts :** `ComposedChart` avec `Area` empilées et `Line` pour les scénarios.

| Série | Type | Couleur | Valeur |
|-------|------|---------|--------|
| Capital investi | `Area` (stackId="1") | `#6366f1` (indigo-500), opacité 0,45 | `totalInvested(t)` |
| Intérêts cumulés | `Area` (stackId="1") | `#f97316` (orange-500), opacité 0,45 | `totalInterest(t)` |
| Scénario pessimiste | `Line` pointillée | `#f87171` (red-400) | `pessTotal(t)` |
| Scénario optimiste | `Line` pointillée | `#34d399` (emerald-400) | `optiTotal(t)` |
| Point de croisement | `ReferenceLine` | `#22c55e` (green-500) | année du crossover |

- Axe X : années calendaires (CURRENT_YEAR → CURRENT_YEAR + duration)
- Axe Y : montant en €, formaté `k €` / `M €`
- `Tooltip` personnalisé : capital investi, intérêts, total, scénarios (si actifs)
- `Legend` — labels traduits (Capital investi, Intérêts cumulés, Pessimiste, Optimiste)
- Responsive : `<ResponsiveContainer width="100%" height={340}>`

### 3.4 Tooltip détaillé des intérêts (tableau)

Dans le tableau année par année, survoler la cellule **Intérêts cumulés** affiche un tooltip fixe (`position: fixed`, z-50) détaillant le calcul de l'année :

- Capital de départ de l'année × taux effectif → intérêts sur le capital
- Versements annualisés × taux effectif (simplifié) → intérêts sur les versements
- Total des intérêts générés cette année
- Intérêts cumulés depuis le départ
- Mention de l'apport ponctuel si présent

Le tooltip se retourne automatiquement si l'espace sous la cellule est insuffisant (`flipUp`).

### 3.5 Notes méthodologiques (footnotes)

Une section dynamique en bas de page génère des notes numérotées selon les options actives :

1. Méthode de capitalisation des versements (mensuel ou annuel)
2. Impact des frais de gestion sur `resolvedDuration` ans (si `managementFees > 0`)
3. Déduction de l'inflation et expression en euros constants (si `inflationRate > 0`)
4. Simplification de la flat tax PFU (si `applyPFU`)
5. Effet de palier des versements (si `contributionGrowth > 0`)
6. Méthode de résolution par dichotomie (si mode inversé)
7. Paramètres des scénarios comparatifs (si `showScenarios`)
8. Hypothèses de la phase de décaissement (si `withdrawalRate > 0`)

---

## 4. Structure du composant

### 4.1 Fichier

```
frontend/src/components/tools/CompoundInterestSimulatorPage.jsx
```

Composant unique sans appel API.

### 4.2 Sous-composants internes

| Composant | Description |
|-----------|-------------|
| `NumInput` | Input numérique labelisé avec hint optionnel et état disabled |
| `Section` | Conteneur de section avec titre, variante accent (indigo), et collapse optionnel |
| `FrequencyToggle` | Toggle bouton Mensuel / Annuel |
| `CustomTooltip` | Tooltip Recharts personnalisé (capital, intérêts, total, scénarios) |

### 4.3 Fonctions de calcul

| Fonction | Description |
|----------|-------------|
| `buildChartData(params)` | Construit le tableau year-by-year (accumulation) |
| `getFinalCapital(params)` | Raccourci — retourne uniquement le total final (utilisé par `bisect`) |
| `bisect(fn, low, high, target)` | Dichotomie numérique — 70 itérations, précision < 0,01 € |
| `buildDecumulationData(params)` | Construit le tableau de décaissement année par année (max 60 ans) |

### 4.4 État local (useState)

```js
// Paramètres de base
const [initialAmount, setInitialAmount]           = useState(10000)
const [annualRate, setAnnualRate]                 = useState(7)
const [durationMode, setDurationMode]             = useState('years') // 'years' | 'targetYear'
const [duration, setDuration]                     = useState(20)
const [targetYear, setTargetYear]                 = useState(CURRENT_YEAR + 20)

// Versements
const [contribution, setContribution]             = useState(200)
const [frequency, setFrequency]                   = useState('monthly')
const [contributionGrowth, setContributionGrowth] = useState(0)

// Scénarios
const [showScenarios, setShowScenarios]           = useState(false)
const [pessimisticRate, setPessimisticRate]       = useState(4)
const [optimisticRate, setOptimisticRate]         = useState(10)

// Options avancées
const [inflationRate, setInflationRate]           = useState(2)
const [managementFees, setManagementFees]         = useState(0)
const [applyPFU, setApplyPFU]                     = useState(false)
const [withdrawalRate, setWithdrawalRate]         = useState(4)

// Mode
const [mode, setMode]                             = useState('standard') // 'standard' | 'inverse'
const [inverseVariant, setInverseVariant]         = useState('contribution') // 'contribution' | 'duration' | 'rate' | 'monthlyIncome'
const [targetAmount, setTargetAmount]             = useState(500000)
const [desiredMonthly, setDesiredMonthly]         = useState(2000)

// Apports ponctuels
const [lumpSums, setLumpSums]                     = useState([]) // [{ id, year, amount }]

// UI
const [showTable, setShowTable]                   = useState(false)
const [interetTooltip, setInteretTooltip]         = useState(null)
```

### 4.5 Calculs mémoïsés (useMemo)

```js
const { chartData, finalCapital, totalInvested, totalInterest,
        annualWithdrawal, monthlyWithdrawal, inverseResult, resolvedDuration,
        decumulationData, isSustainable, depletionIndex, crossoverIndex } =
  useMemo(() => { ... }, [
    initialAmount, annualRate, realRate, effectiveDuration,
    contribution, frequency, contributionGrowth,
    inflationRate, managementFees, applyPFU, withdrawalRate,
    mode, inverseVariant, targetAmount, desiredMonthly,
    showScenarios, pessimisticRate, optimisticRate, lumpSums
  ])
```

---

## 5. Navigation et routing

### 5.1 App.jsx

```jsx
{currentPage === 'compound-interest' && <CompoundInterestSimulatorPage />}
```

### 5.2 Navigation.jsx

Entrée dans le dropdown **Outils** :

```jsx
{ page: 'compound-interest', label: 'Intérêts composés' }
```

---

## 6. Contraintes de validation

| Champ | Contrainte |
|-------|-----------|
| `initialAmount` | ≥ 0 |
| `annualRate` | 0,1 – 30 % |
| `duration` | 1 – 50 ans |
| `targetYear` | CURRENT_YEAR + 1 → CURRENT_YEAR + 80 |
| `contributionAmount` | ≥ 0 |
| `contributionGrowthRate` | 0 – 20 % |
| `inflationRate` | 0 – 20 % |
| `managementFees` | 0 – 5 % |
| `withdrawalRate` | 0 – 20 % |
| `realRate` | Si < 0 → warning "Rendement réel négatif" (calcul effectué quand même) |
| `pessimisticRate` / `optimisticRate` | 0 – 30 % |
| `lumpSum.amount` | ≥ 0, step 1000 |

---

## 7. Évolutions futures envisageables

- **Export PDF** : bouton "Télécharger le rapport" (impression CSS ou `react-to-print`)
- **Intégration patrimoine** : pré-remplir `initialAmount` depuis la valeur du portefeuille actuel
- **Fiscalité PEA** : simulation correcte de la fiscalité PEA (exonération après 5 ans, pas de prélèvement annuel)
- **Paliers multiples** : plusieurs tranches de versements avec dates de début/fin distinctes
- **Partage de simulation** : export des paramètres en URL (query string)

---

## 8. Pas de backend requis

Ce simulateur est **entièrement calculé côté client**. Il n'y a :
- Aucune entité JPA à créer
- Aucun endpoint `/api/` à ajouter
- Aucune donnée persistée

Les calculs sont déterministes et ne dépendent d'aucune donnée utilisateur stockée en base.
