# Simulateur de Crédit Lombard

## 1. Objectif

Permettre à l'utilisateur de **simuler un crédit Lombard** — un prêt garanti par son portefeuille de titres financiers existant, sans avoir à vendre les actifs. L'outil répond à deux usages :

1. **Capacité maximale d'emprunt** — calcule combien l'utilisateur peut emprunter en mettant son portefeuille en collatéral, selon trois scénarios de taux d'avance (LTV) : Prudent, Réaliste, Optimiste, ainsi qu'un mode personnalisé.
2. **Simulation d'un emprunt précis** — saisie d'un montant cible et d'un projet, avec calcul du coût d'emprunt, de la marge de sécurité disponible, et du seuil de margin call.

Le simulateur **utilise automatiquement les positions actives** de l'utilisateur connecté (via `GET /api/positions?status=ACTIVE`), avec possibilité d'ajuster le portefeuille fictivement pour tester différents scénarios.

> Outil entièrement frontend — aucun endpoint backend nouveau, hormis un endpoint optionnel pour persister les simulations (`/api/lombard-simulations`, structurellement identique à `/api/loan-simulations`).

---

## 2. Le crédit Lombard — rappel financier

Un crédit Lombard est un prêt amortissable ou *in fine* garanti par le **nantissement** de titres financiers. Caractéristiques :

| Élément | Description |
|---------|-------------|
| **Collatéral** | Portefeuille titres (actions, ETF, obligations, fonds, parfois crypto) |
| **LTV (Loan-to-Value)** | Pourcentage de la valeur du portefeuille pouvant être emprunté |
| **Taux d'intérêt** | Variable, indexé EURIBOR/€STR + spread (typiquement 1–3 %) |
| **Mode de remboursement** | *In fine* (remboursement du capital à l'échéance) ou amortissable |
| **Margin call** | Si la valeur du portefeuille baisse, la banque demande un complément de collatéral ou un remboursement partiel |
| **Avantages** | Pas de vente d'actifs, pas de fiscalité de plus-value, conservation des dividendes/coupons, exposition au marché préservée |
| **Risques** | Effet de levier, margin call en cas de chute des marchés, taux variable |

### 2.1 Scénarios de LTV par catégorie

Les LTV varient selon l'établissement et la classe d'actif. L'outil propose 3 scénarios par défaut + un mode personnalisé :

| Catégorie MyFinance | Prudent | Réaliste | Optimiste |
|--------------------|---------|----------|-----------|
| `LIVRET` | 90 % | 95 % | 100 % |
| `LIQUIDITE` | 90 % | 95 % | 100 % |
| `BOURSE` (ETF/actions) | 50 % | 65 % | 75 % |
| `IMMO_PAPIER` (SCPI/OPCI) | 40 % | 55 % | 65 % |
| `CRYPTO` | 0 % | 30 % | 50 % |
| `IMMO_PHYSIQUE` | 0 % | 0 % | 0 % |

> Les valeurs Prudent correspondent aux pratiques bancaires conservatrices (LCL, BNP, banques de détail). Les valeurs Réaliste correspondent à la moyenne du marché privé (Banque Privée, Private Banking). Les valeurs Optimiste correspondent aux pratiques de courtage haut de gamme (IB, Saxo, banques suisses). Les valeurs sont externalisées et **éditables par l'utilisateur** dans le mode personnalisé.

---

## 3. Paramètres d'entrée

### 3.1 Portefeuille (pré-rempli depuis l'API)

| Paramètre | Source | Description |
|-----------|--------|-------------|
| `positions` | `GET /api/positions?status=ACTIVE` | Positions actives de l'utilisateur — agrégées par catégorie |
| `valueByCategory` | Calculé | `Map<AssetCategory, totalValueEur>` agrégeant `currentValueEur` |

L'utilisateur peut **ajuster fictivement** chaque catégorie (champ surchargeable) pour simuler un scénario "et si je vendais X / achetais Y avant de demander le crédit".

### 3.2 Scénario LTV

| Paramètre | Type | Description |
|-----------|------|-------------|
| `ltvScenario` | `'prudent' \| 'realiste' \| 'optimiste' \| 'custom'` | Sélection du jeu de LTV — défaut `'realiste'` |
| `customLtv` | `Map<AssetCategory, number>` | Taux d'avance personnalisés par catégorie (0–100 %) |

### 3.3 Paramètres d'emprunt

| Paramètre | Type | Description |
|-----------|------|-------------|
| `mode` | `'capacity' \| 'amount'` | Mode capacité maximale ou simulation d'un montant précis |
| `loanAmount` | `number` | Montant emprunté (€) — utilisé en mode `'amount'` |
| `annualRate` | `number` | Taux annuel nominal (%) — typiquement 2–6 % |
| `loanDuration` | `number` | Durée du prêt (années, 1–15) |
| `repaymentMode` | `'in_fine' \| 'amortizable'` | *In fine* (capital remboursé à l'échéance) ou amortissable (mensualités constantes) |
| `purpose` | `string` | Description libre du projet (immobilier, investissement, autre) |

### 3.4 Paramètres de risque (margin call)

| Paramètre | Type | Description |
|-----------|------|-------------|
| `marginCallThreshold` | `number` | Seuil de couverture déclenchant un appel de marge (défaut : LTV utilisé + 10 pts) |
| `simulatedMarketDrop` | `number` | Baisse simulée du portefeuille (%, 0–80) — défaut 30 % |

### 3.5 Comparaison vente vs Lombard — optionnel

| Paramètre | Type | Description |
|-----------|------|-------------|
| `compareWithSale` | `boolean` | Activer la comparaison |
| `assetsToSell` | `Map<AssetCategory, number>` | Montant à vendre par catégorie pour atteindre `loanAmount` (alternative au crédit) |
| `capitalGainTaxRate` | `number` | Taux d'imposition des plus-values (défaut 30 % — flat tax) |
| `expectedReturn` | `number` | Rendement annuel attendu du portefeuille (%) — pour comparer le manque à gagner |

### 3.6 Sauvegarde de simulation — optionnel

| Paramètre | Stockage | Description |
|-----------|----------|-------------|
| `savedSimulations` | Base de données — endpoint `/api/lombard-simulations` | Tableau de simulations nommées, persistées par utilisateur (même structure que les loan-simulations) |

---

## 4. Formules de calcul

### 4.1 Capacité maximale d'emprunt

```
pour chaque catégorie c :
  capaciteCategorie(c) = valueByCategory(c) × ltv(c) / 100

capaciteMax = Σ capaciteCategorie(c)
```

### 4.2 Mensualité (mode amortissable)

```
r = annualRate / 100 / 12
n = loanDuration × 12

mensualite = loanAmount × r / (1 − (1 + r)^(−n))   // si r > 0
           = loanAmount / n                        // si r = 0
```

### 4.3 Coût total (mode in fine)

```
interets_mensuels = loanAmount × annualRate / 100 / 12
total_interets    = interets_mensuels × loanDuration × 12
cout_total        = total_interets + loanAmount  // remboursement du capital à l'échéance
```

### 4.4 Coût total (mode amortissable)

```
total_paye    = mensualite × loanDuration × 12
total_interets = total_paye − loanAmount
cout_total    = total_paye
```

### 4.5 Tableau d'amortissement (mode amortissable)

```
pour t = 1 à n :
  interets(t)      = capitalRestant × r
  amortissement(t) = mensualite − interets(t)
  capitalRestant   = capitalRestant − amortissement(t)
```

### 4.6 Margin call — seuil de chute du portefeuille

```
// Valeur de portefeuille en dessous de laquelle la banque appelle la marge
seuilCouverture = loanAmount × (100 + marginCallThreshold) / 100

// Pourcentage de chute toléré
chuteTolere = (1 − seuilCouverture / valeurPortefeuilleActuelle) × 100
```

Si `chuteTolere < 0`, le portefeuille est déjà sous le seuil — situation impossible (l'emprunt ne serait pas accordé).

### 4.7 Simulation de stress test (réutilisation des scénarios de crise)

Le stress test **réutilise directement les scénarios** définis dans `frontend/src/components/tools/crisisScenarios.js` (utilisé par le simulateur de crise existant). Les drawdowns par catégorie sont déjà calibrés sur des crises historiques.

| Scénario | BOURSE | IMMO_PAPIER | IMMO_PHYSIQUE | CRYPTO | LIVRET | LIQUIDITE |
|----------|--------|-------------|---------------|--------|--------|-----------|
| 2008 — Subprimes      | −55 % | −15 % | −10 % |   0 % | 0 % | 0 % |
| 2000 — Bulle dot-com  | −50 % |  −5 % |  +5 % |   0 % | 0 % | 0 % |
| 2020 — COVID-19       | −35 % | −10 % |  −3 % | −50 % | 0 % | 0 % |
| 2022 — Crypto Winter  | −20 % |  −8 % |  −5 % | −75 % | 0 % | 0 % |
| Personnalisé          | éditable par catégorie (par défaut −30 / −15 / −10 / −50 / 0 / 0) |

Pour chaque scénario sélectionné :

```
pour chaque catégorie c :
  valeurApresChoc(c) = valueByCategory(c) × (1 + drawdowns[c])

valeurPortefeuilleApresChoc = Σ valeurApresChoc(c)

// Capacité d'emprunt après choc (avec les LTV inchangés)
capaciteApresChoc = Σ valeurApresChoc(c) × ltv(c) / 100

// Couverture du crédit après choc
ltvEffectifApresChoc = loanAmount / valeurPortefeuilleApresChoc × 100

// Diagnostic
si valeurPortefeuilleApresChoc < seuilCouverture :
  → MARGIN CALL DÉCLENCHÉ
  montantAComplete  = seuilCouverture − valeurPortefeuilleApresChoc
  ouRemboursementPartiel = loanAmount − valeurPortefeuilleApresChoc × ltv_moyen / 100
sinon si ltvEffectifApresChoc > marginCallThreshold − 5 :
  → ZONE DE VIGILANCE (alerte préventive)
sinon :
  → SITUATION SAINE
```

Le tableau de stress test compare :

| Scénario | Valeur portefeuille | Capacité après choc | LTV effectif | Statut |
|----------|---------------------|---------------------|--------------|--------|
| Aujourd'hui | 100 000 € | 65 000 € | 60 % | ✓ Sain |
| Subprimes | 58 500 € | 32 175 € | 102 % | ⚠ Margin call |
| Dot-com | 65 250 € | 36 750 € | 92 % | ⚠ Margin call |
| COVID-19 | 73 000 € | 43 250 € | 82 % | ⚠ Vigilance |
| Crypto Winter | 80 000 € | 48 000 € | 75 % | ✓ Sain |

### 4.8 Comparaison vente vs Lombard

Pour vendre `loanAmount` net d'impôt, il faut vendre :

```
// Si la vente porte sur des positions avec plus-values latentes
plusValueRatio   = capitalGainEur / currentValueEur   // par position vendue
montantBrutVente = loanAmount / (1 − plusValueRatio × capitalGainTaxRate / 100)
impotPlusValue   = montantBrutVente × plusValueRatio × capitalGainTaxRate / 100

// Manque à gagner sur le rendement du portefeuille (sur la durée du crédit)
manqueAGagner = montantBrutVente × (1 + expectedReturn / 100)^loanDuration − montantBrutVente

// Comparaison
coutLombard = total_interets
coutVente   = impotPlusValue + manqueAGagner

economie = coutVente − coutLombard
```

L'arbitrage favorise le Lombard si `economie > 0`.

### 4.9 Effet de levier théorique

```
levier = loanAmount / (valeurPortefeuilleActuelle − loanAmount)
```

Affiché à titre indicatif — un levier > 1 indique que l'emprunt dépasse les fonds propres réels.

---

## 5. Interface utilisateur

### 5.1 Layout général

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Simulateur de Crédit Lombard                                           │
├────────────────────────┬────────────────────────────────────────────────┤
│  PANNEAU GAUCHE (w-80) │  PANNEAU DROIT (flex-1)                        │
│                        │                                                │
│  Mode (capacité/montant)│  Bannière capacité maximale                   │
│  Scénario LTV          │  (3 cartes : Prudent / Réaliste / Optimiste)   │
│   ─ Prudent / Réaliste │                                                │
│   ─ Optimiste / Custom │  KPIs synthèse (4 cartes)                      │
│                        │  Capacité dispo | Mensualité                   │
│  Portefeuille          │  Coût total     | Marge sécurité               │
│   ─ Édition LTV (custom)│                                                │
│   ─ Ajustements ▾      │  Détail par catégorie (tableau)                │
│                        │                                                │
│  Emprunt               │  Tableau d'amortissement ▾                     │
│   ─ Montant            │                                                │
│   ─ Taux annuel        │  Stress test margin call (jauge + scénarios)   │
│   ─ Durée              │                                                │
│   ─ Mode (in fine/amort)│  Comparaison vente vs Lombard ▾               │
│                        │                                                │
│  Margin call           │  Graphiques :                                  │
│   ─ Seuil              │   ─ Répartition LTV par catégorie (donut)      │
│                        │   ─ Évolution capital restant (in fine = ligne)│
│  Comparaison vente ▾   │                                                │
└────────────────────────┴────────────────────────────────────────────────┘
```

### 5.2 Bannière capacité maximale

3 cartes côte à côte, fond pastel par scénario :

```
┌──────────────┬──────────────┬──────────────┐
│  PRUDENT     │  RÉALISTE    │  OPTIMISTE   │
│  45 000 €    │  68 000 €    │  82 000 €    │
│  LTV moy 47%│  LTV moy 62%│  LTV moy 71% │
└──────────────┴──────────────┴──────────────┘
```

Au clic sur une carte, le scénario actif change et les calculs se mettent à jour. Un toggle "Personnaliser" ouvre l'édition manuelle des LTV.

### 5.3 Section "Mode"

- Toggle **Capacité maximale** / **Montant précis**
- En mode capacité : tous les calculs portent sur la capacité maximale du scénario actif
- En mode montant : input du `loanAmount` cible avec validation (≤ capacité du scénario actif, sinon avertissement)

### 5.4 Section "Portefeuille"

- Liste des catégories avec leur valeur actuelle (depuis l'API)
- Pour chaque catégorie : valeur actuelle (€) + LTV applicable (%) + capacité (€)
- Bouton "Ajuster le portefeuille" pour **surcharger** une valeur (utile pour tester "et si je vendais ma crypto avant ?")
- En mode `custom`, chaque LTV devient éditable via un slider 0–100 %

### 5.5 Section "Emprunt"

- Montant emprunté (€) — visible uniquement en mode `'amount'`
- Slider taux annuel : 0,5 – 10 %
- Slider durée : 1 – 15 ans
- Toggle mode de remboursement : **In fine** (capital à l'échéance) / **Amortissable** (mensualités constantes)
- Champ libre "Projet" (description du but de l'emprunt)

### 5.6 Section "Margin call"

- Slider seuil de couverture (%) — défaut : LTV moyen + 10 pts
- Affichage : "Une chute de plus de X % du portefeuille déclencherait un appel de marge"
- Code couleur : vert (chute > 30%), amber (15–30 %), rouge (< 15 %)

### 5.6.bis Section "Stress test crises historiques"

Bloc dédié réutilisant les scénarios du simulateur de crise existant :

- Sélecteur de scénario : boutons identiques à ceux du `CrisisSimulatorPage` (2008, dot-com, COVID, Crypto Winter, Personnalisé)
- Mode personnalisé : 6 sliders (un par catégorie) — réutilise le même composant si possible
- Tableau récapitulatif "Aujourd'hui vs après crise" :
  - Valeur portefeuille avant/après
  - Capacité d'emprunt avant/après
  - LTV effectif après choc
  - Statut visuel (✓ Sain / ⚠ Vigilance / ✗ Margin call)
- Encart d'alerte rouge si margin call déclenché : montant à compléter ou remboursement partiel requis
- Tableau de tous les scénarios en synthèse (ligne par ligne)
- Bouton "Voir le simulateur de crise complet →" (lien vers `crisis-simulator`)

### 5.7 Section "Comparaison vente vs Lombard" (dépliable)

- Toggle "Activer la comparaison"
- Saisie : taux de PFU (défaut 30 %), rendement attendu (%), répartition de la vente par catégorie
- Tableau de comparaison :

| Indicateur | Vente d'actifs | Crédit Lombard |
|-----------|---------------|----------------|
| Montant brut nécessaire | 95 238 € | 90 000 € |
| Impôt plus-value | 5 238 € | 0 € |
| Coût intérêts (10 ans) | — | 18 000 € |
| Manque à gagner (rendement) | 47 412 € | 0 € |
| **Coût total** | **52 650 €** | **18 000 €** |
| Économie Lombard | — | **+34 650 €** |

### 5.8 KPIs synthèse (mode `'amount'`)

```
Capacité disponible    Mensualité (in fine ou amortissable)
68 000 €               750 € / mois

Coût total intérêts    Marge avant margin call
9 000 €                Chute de 28 % tolérée
```

### 5.9 Tableau d'amortissement

- Mode **in fine** : tableau simple (intérêts mensuels constants + remboursement capital en mois N)
- Mode **amortissable** : tableau classique (mensualité, intérêts, amortissement, capital restant)
- Vue annuelle agrégée + vue mensuelle dépliable

### 5.10 Graphiques

#### Répartition de la capacité par catégorie (PieChart donut)

Segments : capacité provenant de `BOURSE`, `IMMO_PAPIER`, `LIVRET`, `LIQUIDITE`, `CRYPTO`. Couleurs cohérentes avec `CATEGORY_META`.

#### Évolution du capital restant dû (LineChart)

- En mode amortissable : courbe décroissante du capital restant
- En mode in fine : palier horizontal puis chute en mois N

#### Jauge stress test (BarChart horizontal)

```
Valeur portefeuille actuelle    │█████████████████████│ 100 000 €
Seuil margin call (LTV+10pts)   │████████│              42 000 €
Valeur après chute simulée      │██████████│            70 000 €
```

---

## 6. Structure du composant

### 6.1 Fonctions pures (`lombardSimulatorUtils.js`)

| Fonction | Description |
|---------|-------------|
| `computeMaxCapacity(valueByCategory, ltvMap)` | Capacité maximale par catégorie + total |
| `computeMonthlyPayment(amount, annualRate, months, mode)` | Mensualité in fine ou amortizable |
| `buildAmortizationTable(amount, annualRate, months, mode)` | Tableau d'amortissement (rows + summary) |
| `computeMarginCallThreshold(loanAmount, threshold)` | Seuil de couverture en € |
| `computeMaxDrop(loanAmount, currentValue, threshold)` | % de chute tolérée |
| `computeSaleAlternative(loanAmount, positions, taxRate, expectedReturn, duration)` | Comparaison vente vs Lombard |
| `applyStressScenario(valueByCategory, scenarioDrops)` | Valeur portefeuille après choc — réutilise les `drawdowns` de `crisisScenarios.js` |
| `evaluateMarginCallRisk(loanAmount, postCrashValue, ltvMap, threshold)` | Retourne `{ status: 'safe' \| 'warning' \| 'margin_call', amountToComplete }` |

### 6.2 Constantes externalisées

```js
// lombardSimulatorConstants.js
export const LTV_SCENARIOS = {
  prudent:  { LIVRET: 90, LIQUIDITE: 90, BOURSE: 50, IMMO_PAPIER: 40, CRYPTO: 0,  IMMO_PHYSIQUE: 0 },
  realiste: { LIVRET: 95, LIQUIDITE: 95, BOURSE: 65, IMMO_PAPIER: 55, CRYPTO: 30, IMMO_PHYSIQUE: 0 },
  optimiste:{ LIVRET: 100, LIQUIDITE: 100, BOURSE: 75, IMMO_PAPIER: 65, CRYPTO: 50, IMMO_PHYSIQUE: 0 },
}

export const SCENARIO_META = {
  prudent:  { label: 'Prudent',  bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
  realiste: { label: 'Réaliste', bg: 'bg-indigo-50',  border: 'border-indigo-200',  text: 'text-indigo-700' },
  optimiste:{ label: 'Optimiste',bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700' },
}
```

### 6.3 État React

```js
// Portefeuille
const [positions, setPositions]                 = useState([])
const [positionsLoading, setPositionsLoading]   = useState(true)
const [overrideValues, setOverrideValues]       = useState({})  // { BOURSE: 50000, ... }

// Scénario LTV
const [ltvScenario, setLtvScenario]             = useState('realiste')
const [customLtv, setCustomLtv]                 = useState({ ...LTV_SCENARIOS.realiste })

// Mode
const [mode, setMode]                           = useState('capacity')  // 'capacity' | 'amount'
const [loanAmount, setLoanAmount]               = useState(50000)

// Emprunt
const [annualRate, setAnnualRate]               = useState(3.5)
const [loanDuration, setLoanDuration]           = useState(10)
const [repaymentMode, setRepaymentMode]         = useState('in_fine')   // 'in_fine' | 'amortizable'
const [purpose, setPurpose]                     = useState('')

// Margin call
const [marginCallThreshold, setMarginCallThreshold] = useState(75)

// Stress test (réutilise SCENARIOS de crisisScenarios.js)
const [stressScenarioId, setStressScenarioId] = useState('subprime-2008')
const [customStressDrops, setCustomStressDrops] = useState({
  BOURSE: -30, IMMO_PAPIER: -15, IMMO_PHYSIQUE: -10, CRYPTO: -50, LIVRET: 0, LIQUIDITE: 0,
})

// Comparaison vente
const [compareWithSale, setCompareWithSale]     = useState(false)
const [capitalGainTaxRate, setCapitalGainTaxRate]= useState(30)
const [expectedReturn, setExpectedReturn]        = useState(5)

// Sauvegarde
const [savedSimulations, setSavedSimulations]   = useState([])
const [showSaveModal, setShowSaveModal]         = useState(false)
const [saveName, setSaveName]                   = useState('')
const [saving, setSaving]                       = useState(false)

// UI
const [showAdjustments, setShowAdjustments]     = useState(false)
const [showMonthly, setShowMonthly]             = useState(false)
```

### 6.4 useMemo principal

```js
const calc = useMemo(() => {
  // valueByCategory (avec overrides)
  // ltvMap (selon scenario)
  // capacityByCategory + capacityMax (3 scénarios + custom)
  // amortizationTable (selon mode)
  // marginCallSeuil + maxDrop
  // saleComparison (si activée)
  // stressScenarios (chute des marchés)
}, [
  positions, overrideValues,
  ltvScenario, customLtv,
  mode, loanAmount,
  annualRate, loanDuration, repaymentMode,
  marginCallThreshold,
  compareWithSale, capitalGainTaxRate, expectedReturn,
])
```

---

## 7. Navigation et routing

### 7.1 App.jsx

```jsx
import LombardSimulatorPage from './components/tools/LombardSimulatorPage'
// ...
{currentPage === 'lombard-simulator' && <LombardSimulatorPage />}
```

### 7.2 Navigation.jsx

Entrée dans le dropdown **Outils** :

```jsx
{ page: 'lombard-simulator', label: 'Simulateur de crédit Lombard' }
```

`isToolsPage` inclut `'lombard-simulator'`.

---

## 8. Contraintes de validation

| Champ | Contrainte |
|-------|-----------|
| `loanAmount` | > 0 et ≤ capacité du scénario actif (sinon avertissement bloquant) |
| `loanDuration` | 1 – 15 ans |
| `annualRate` | 0,5 – 10 % |
| `customLtv[c]` | 0 – 100 % |
| `marginCallThreshold` | LTV moyen ≤ threshold ≤ 100 |
| `capitalGainTaxRate` | 0 – 50 % |
| `expectedReturn` | 0 – 15 % |

---

## 9. Appels API

L'outil reste fonctionnel via saisie manuelle si les appels API échouent.

| Endpoint | Rôle requis | Usage |
|----------|-------------|-------|
| `GET /api/positions?status=ACTIVE` | Authentifié | Pré-remplissage du portefeuille au chargement |
| `GET /api/lombard-simulations` | Authentifié | Liste des simulations sauvegardées |
| `POST /api/lombard-simulations` | Authentifié | Sauvegarde d'une simulation |
| `DELETE /api/lombard-simulations/{id}` | Authentifié | Suppression (ownership vérifié) |

> Si la persistance des simulations est jugée non prioritaire en V1, l'outil peut démarrer **sans** les endpoints `lombard-simulations` (entièrement en mémoire React).

---

## 10. Cas d'usage typiques

### 10.1 "Combien je peux emprunter contre mon portefeuille ?"

L'utilisateur ouvre l'outil. Sans aucune saisie, il voit les 3 capacités calculées (Prudent / Réaliste / Optimiste) basées sur ses positions actives. Il choisit un scénario et ajuste éventuellement les LTV en mode personnalisé.

### 10.2 "Lombard ou vente d'actifs pour mon apport immobilier ?"

L'utilisateur connaît son besoin (`loanAmount`). Il bascule en mode **Montant précis**, saisit le montant et active la comparaison vente vs Lombard. Il visualise instantanément l'économie potentielle (ou la perte) en gardant son portefeuille investi vs en vendant.

### 10.3 "Quel est mon risque de margin call ?"

Le bloc stress test affiche le seuil de chute toléré et **rejoue les 4 crises historiques** déjà calibrées dans le simulateur de crise (2008, dot-com, COVID, Crypto Winter) plus un mode personnalisé. Pour chaque scénario, l'utilisateur voit instantanément si son emprunt résisterait, et dans le cas contraire le montant à compléter en cash ou le remboursement partiel exigé par la banque.

---

## 11. Évolutions possibles

| Évolution | Description |
|-----------|-------------|
| Lombard partiel par compte-titres | Sélection de positions spécifiques mises en gage (au lieu de l'ensemble) |
| Persistance des LTV personnalisés | Sauvegarde des LTV custom dans le profil utilisateur (avec courtier nommé) |
| Intégration au simulateur de crise | Ajout d'un mode "et si j'avais un Lombard ouvert ?" dans le simulateur de crise |
| Intégration au tableau de bord | Widget "Capacité Lombard" affichant la capacité réaliste sur le dashboard patrimoine |
| Couplage avec le simulateur d'emprunt immobilier | Possibilité d'utiliser un Lombard comme apport pour un crédit immobilier classique |
