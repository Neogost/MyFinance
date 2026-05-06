# Comparateur d'enveloppes fiscales (PEA / CTO / AV / PER)

## 1. Objectif

Permettre à l'utilisateur de **comparer le rendement net après impôt** d'un même investissement (versement initial + versements périodiques) selon l'enveloppe fiscale utilisée :

- **CTO** — Compte-titres ordinaire (flat tax PFU 31,4 %)
- **PEA** — Plan d'Épargne en Actions (exonération d'IR après 5 ans, prélèvements sociaux 17,2 %)
- **AV** — Assurance-vie (abattement annuel après 8 ans, frais d'enveloppe)
- **PER** — Plan Épargne Retraite (déduction du revenu imposable à l'entrée, taxation à la sortie)

L'objectif est de répondre à la question concrète : *« Pour 100 € versés chaque mois pendant 20 ans, combien me restera-t-il dans chaque enveloppe une fois sortis et fiscalisés ? »*

Le simulateur **pré-remplit la TMI** de l'utilisateur depuis le simulateur d'impôts existant (`/api/tax-simulator`), avec possibilité de la surcharger.

> Outil purement frontend — aucun endpoint backend requis hormis `/api/tax-simulator` pour pré-remplir la TMI. Les barèmes fiscaux sont externalisés dans `frontend/src/data/fiscal-envelopes.js`.

---

## 2. Rappels fiscaux par enveloppe

### 2.1 CTO — Compte-titres ordinaire

| Élément | Règle |
|---------|-------|
| Avantage à l'entrée | Aucun |
| Plafond de versement | Aucun |
| Univers d'investissement | Tous instruments (actions monde, ETF, obligations, fonds, crypto…) |
| Imposition pendant la phase d'épargne | Dividendes + intérêts taxés annuellement (PFU 31,4 % par défaut) |
| Imposition à la sortie | Plus-values taxées au PFU 31,4 % (14,2 % IR + 17,2 % PS) ou option barème |
| Durée d'attache | Aucune |
| Souplesse | Maximale — retraits libres |

### 2.2 PEA — Plan d'Épargne en Actions

| Élément | Règle |
|---------|-------|
| Avantage à l'entrée | Aucun |
| Plafond de versement | 150 000 € (PEA classique) ou 225 000 € (PEA-PME inclus) |
| Univers d'investissement | Actions UE / ETF éligibles UE uniquement |
| Imposition pendant la phase d'épargne | Aucune si pas de retrait |
| Imposition à la sortie | **Avant 5 ans** : retrait = clôture, PFU 31,4 % sur plus-values<br>**Après 5 ans** : exonération IR, prélèvements sociaux **17,2 %** sur plus-values |
| Durée d'attache | 5 ans (perte avantage si retrait avant) |
| Souplesse | Retraits possibles sans clôture après 5 ans |

### 2.3 AV — Assurance-vie

| Élément | Règle |
|---------|-------|
| Avantage à l'entrée | Aucun |
| Plafond de versement | Aucun (plafond uniquement sur abattement à la sortie) |
| Univers d'investissement | Fonds euros + Unités de Compte (UC : actions, ETF, SCPI, immobilier) |
| Imposition pendant la phase d'épargne | Aucune en l'absence de rachat |
| Imposition à la sortie | **Avant 8 ans** : PFU 31,4 % (14,2 % IR + 17,2 % PS) sur les gains rachetés<br>**Après 8 ans** : abattement annuel **4 600 €** (célibataire) ou **9 200 €** (couple) sur gains, puis **24,7 %** (7,5 % IR + 17,2 % PS) si versements ≤ 150 000 €, sinon PFU 31,4 % au-delà |
| Durée d'attache | 8 ans (recommandé) |
| Souplesse | Rachats partiels possibles à tout moment |
| Frais d'enveloppe | Frais de gestion **0,6 %/an** (typique) sur encours UC + frais d'arbitrage |
| Transmission | Hors succession (152 500 € par bénéficiaire pour primes versées avant 70 ans) — *non couvert dans le simulateur V1* |

### 2.4 PER — Plan Épargne Retraite

| Élément | Règle |
|---------|-------|
| Avantage à l'entrée | **Déduction des versements du revenu imposable** dans la limite du plafond PER (10 % des revenus N-1, plafonné à ~32 000 €/an en 2024) |
| Gain immédiat | `versement × TMI` — économie d'impôt à l'année du versement |
| Plafond de versement | Plafond annuel de déduction (cumulable sur 3 ans) |
| Univers d'investissement | Fonds euros + UC (similaire à l'AV) |
| Imposition pendant la phase d'épargne | Aucune |
| Imposition à la sortie | **Sortie en capital** : capital taxé au barème IR (TMI à la retraite) ; gains taxés au PFU 31,4 %<br>**Sortie en rente** : taxée comme rente viagère à titre gratuit (RVTG) |
| Durée d'attache | Bloqué jusqu'à la retraite (sauf 6 cas de déblocage anticipé : achat RP, accident de la vie, etc.) |
| Souplesse | Faible — capital indisponible avant retraite |
| Frais d'enveloppe | Frais de gestion **0,6 %/an** (typique) sur encours UC |

---

## 3. Paramètres d'entrée

### 3.1 Versements

| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `initialAmount` | `number` | Oui | Versement initial (€) |
| `monthlyContribution` | `number` | Oui | Versement mensuel récurrent (€) |
| `duration` | `number` | Oui | Horizon en années (1–40) |
| `annualReturn` | `number` | Oui | Rendement annuel brut attendu (%, défaut 6) |

### 3.2 Profil fiscal (pré-remplis depuis l'API)

| Paramètre | Source | Description |
|-----------|--------|-------------|
| `currentTMI` | `GET /api/tax-simulator` → calcul depuis `effectiveTaxRate` ou `marginalRate` | Tranche marginale d'imposition actuelle (%) — utilisée pour le gain à l'entrée du PER |
| `retirementTMI` | Saisie manuelle | TMI estimée à la retraite (%, défaut = `currentTMI`) — utilisée pour la sortie en capital du PER |
| `householdSituation` | `'single' \| 'couple'` | Situation pour l'abattement AV (4 600 € seul / 9 200 € couple) |
| `socialChargesRate` | Constante | Prélèvements sociaux (17,2 %) |

### 3.3 Frais d'enveloppe

| Paramètre | Type | Description |
|-----------|------|-------------|
| `ctoFees` | `number` | Frais annuels CTO (%, défaut 0) — typiquement 0 sur courtier en ligne |
| `peaFees` | `number` | Frais annuels PEA (%, défaut 0) |
| `avFees` | `number` | Frais annuels AV (%, défaut 0,6) |
| `perFees` | `number` | Frais annuels PER (%, défaut 0,6) |

### 3.4 Options avancées

| Paramètre | Type | Description |
|-----------|------|-------------|
| `peaCapBreached` | `boolean` (calculé) | `true` si `totalContributions > 150 000` — affiche un warning |
| `perCapBreached` | `boolean` (calculé) | `true` si `monthlyContribution × 12 > perAnnualCap` — affiche un warning |
| `perAnnualCap` | `number` | Plafond annuel de déduction PER (€, défaut 32 909) |
| `reinvestPerTaxSaving` | `boolean` | Si `true`, l'économie d'impôt PER est réinvestie chaque année dans un CTO virtuel (cas optimal d'utilisation du PER) |
| `dividendYield` | `number` | Rendement en dividendes (%, défaut 2) — utilisé uniquement pour le CTO (taxation annuelle des dividendes) |
| `taxOption` | `'pfu' \| 'bareme'` | Option fiscale CTO/PEA<5ans/AV<8ans : flat tax 31,4 % ou barème IR (utilise `currentTMI + 17,2 %`) |

---

## 4. Formules de calcul

Toutes les formules utilisent une capitalisation **mensuelle** sur la durée totale.

### 4.1 Variables communes

```
n           = duration × 12              // nombre de mois
gross       = annualReturn / 100 / 12    // rendement mensuel brut
totalGrossContribs = initialAmount + monthlyContribution × n
```

### 4.2 CTO

Hypothèse simplificatrice : les dividendes sont **taxés annuellement** au PFU (sortis du capital), les plus-values latentes sont **taxées au rachat final**.

```
netReturnMonthly = (gross - dividendYield/12/100) + (dividendYield/12/100) × (1 - effectiveDivTaxRate)
                 - ctoFees / 12 / 100

avec effectiveDivTaxRate = (taxOption === 'pfu') ? 0.314 : (currentTMI/100 + 0.172)

capitalCTO(t) = capitalCTO(t-1) × (1 + netReturnMonthly) + monthlyContribution
```

À la fin :

```
gainsCTO    = capitalCTO(n) - totalGrossContribs
taxOnGainsCTO = (taxOption === 'pfu') ? gainsCTO × 0.314 : gainsCTO × (currentTMI/100 + 0.172)
netCapitalCTO = capitalCTO(n) - taxOnGainsCTO
```

### 4.3 PEA

Univers : actions UE / ETF UE. Pas de taxation annuelle des dividendes (capitalisation totale).

```
netReturnMonthly = gross - peaFees / 12 / 100
capitalPEA(t)    = capitalPEA(t-1) × (1 + netReturnMonthly) + monthlyContribution
```

À la fin :

```
gainsPEA = capitalPEA(n) - totalGrossContribs

if duration < 5:
  taxOnGainsPEA = gainsPEA × 0.314        // PFU
else:
  taxOnGainsPEA = gainsPEA × 0.172       // PS uniquement

netCapitalPEA = capitalPEA(n) - taxOnGainsPEA
```

**Warning** : si `totalGrossContribs > 150 000`, l'excédent est traité comme du CTO (les versements au-delà du plafond ne peuvent pas être faits).

### 4.4 Assurance-vie

```
netReturnMonthly = gross - avFees / 12 / 100
capitalAV(t)     = capitalAV(t-1) × (1 + netReturnMonthly) + monthlyContribution
```

À la fin :

```
gainsAV = capitalAV(n) - totalGrossContribs

if duration < 8:
  taxOnGainsAV = gainsAV × 0.314
else:
  abattement   = (householdSituation === 'couple') ? 9200 : 4600
  taxableGains = max(0, gainsAV - abattement)

  // Taux après 8 ans : 7,5 % IR + 17,2 % PS = 24,7 % (jusqu'à 150 000 € versés, sinon 30 %)
  if totalGrossContribs ≤ 150000:
    taxOnGainsAV = taxableGains × 0.247
  else:
    portionFavorable   = max(0, 150000 - (totalGrossContribs - gainsAV)) // simplification
    portionPFU         = taxableGains - portionFavorable
    taxOnGainsAV       = portionFavorable × 0.247 + portionPFU × 0.314

netCapitalAV = capitalAV(n) - taxOnGainsAV
```

> Note : l'abattement annuel est ici appliqué une seule fois à la sortie (modélisation d'un rachat unique en bloc). Une option `staggeredWithdrawal` permettant un rachat sur N années (multipliant l'abattement) est listée en évolution future.

### 4.5 PER

Phase d'épargne : capitalisation classique avec frais d'enveloppe.

```
netReturnMonthly = gross - perFees / 12 / 100
capitalPER(t)    = capitalPER(t-1) × (1 + netReturnMonthly) + monthlyContribution
```

**Économie d'impôt à l'entrée** (gain immédiat — chaque année) :

```
annualContribution = monthlyContribution × 12
annualTaxSaving    = min(annualContribution, perAnnualCap) × currentTMI / 100
totalTaxSavings    = annualTaxSaving × duration

if reinvestPerTaxSaving:
  // Le tax saving est réinvesti chaque année dans un CTO virtuel
  capitalSavings(t) = capitalSavings(t-1) × (1 + (gross × 12 - dividendYield × effectiveDivTaxRate) - ctoFees) + annualTaxSaving
  // En sortie : taxe PFU 31,4 % sur le gain du CTO virtuel
  netSavings = capitalSavings(duration) - taxOnSavingsCTO
else:
  netSavings = 0   // l'économie d'impôt est dépensée, pas comptabilisée
```

À la sortie (capital) :

```
gainsPER       = capitalPER(n) - totalGrossContribs

// Capital (versements déduits à l'entrée) → taxé au barème IR (TMI retraite)
taxOnCapitalPER = totalGrossContribs × retirementTMI / 100

// Gains → taxés au PFU 31,4 %
taxOnGainsPER   = gainsPER × 0.314

netCapitalPER = capitalPER(n) - taxOnCapitalPER - taxOnGainsPER + netSavings
```

> Hypothèse : sortie 100 % en capital. Une option `outputMode = 'rente'` (rente viagère taxée comme RVTG) est listée en évolution future.

### 4.6 Synthèse comparative

Pour chaque enveloppe E ∈ {CTO, PEA, AV, PER} :

| Indicateur | Formule |
|-----------|---------|
| `capitalGross(E)` | Capital brut au terme |
| `totalFees(E)` | `Σ frais annuels capitalisés` |
| `taxAtEntry(E)` | PER uniquement : `−totalTaxSavings` (économie négative = gain) |
| `taxAtExit(E)` | Impôt à la sortie selon les règles ci-dessus |
| `netCapital(E)` | Capital net après tous frais et impôts |
| `effectiveYield(E)` | `(netCapital / totalGrossContribs)^(1/duration) − 1` (rendement annualisé net) |
| `rank` | Classement décroissant par `netCapital` |

---

## 5. Interface utilisateur

### 5.1 Layout général

```
┌────────────────────────────────────────────────────────────────────┐
│  Comparateur d'enveloppes fiscales                                 │
├────────────────────────┬───────────────────────────────────────────┤
│  PANNEAU GAUCHE (w-80) │  PANNEAU DROIT (flex-1)                   │
│                        │                                           │
│  Versements            │  Bannière vainqueur                       │
│  ─ Initial             │  « PEA — 218 450 € net (rendement 6,8 %) »│
│  ─ Mensuel             │                                           │
│  ─ Durée (slider)      │  4 cartes synthèse (CTO/PEA/AV/PER)       │
│  ─ Rendement (%)       │  ─ Capital brut                           │
│                        │  ─ Frais cumulés                          │
│  Profil fiscal         │  ─ Impôt à l'entrée (PER)                 │
│  ─ TMI actuelle        │  ─ Impôt à la sortie                      │
│  ─ TMI retraite        │  ─ Capital net + rang                     │
│  ─ Situation foyer     │                                           │
│                        │  Graphique évolution capital net          │
│  Frais d'enveloppe ▾   │  4 lignes superposées (Recharts LineChart)│
│  Options avancées ▾    │                                           │
│  ─ Plafonds            │  Bar chart comparatif net à T+5/10/20     │
│  ─ Réinvestissement PER│                                           │
│  ─ Option fiscale      │  Tableau détaillé (4 colonnes × 8 lignes) │
│  ─ Dividendes (CTO)    │                                           │
│                        │  Notes méthodologiques (footnotes)        │
└────────────────────────┴───────────────────────────────────────────┘
```

### 5.2 Bannière vainqueur

Carte fond gradient indigo→violet en haut du panneau droit :

```
🏆  Meilleure enveloppe : PEA
    218 450 € net après 20 ans
    Rendement annualisé net : 6,8 %
    +12 340 € vs 2e (Assurance-vie)
```

### 5.3 Cartes synthèse par enveloppe

Quatre cartes côte à côte (`grid-cols-2 lg:grid-cols-4`) :

```
┌────────────────────┐
│ PEA       Rang 1   │  ← badge rang (vert si 1, gris ensuite)
│ ───────────────────│
│ Brut      280 K €  │
│ Frais       0 €    │
│ Sortie  −12 340 €  │  (rouge)
│ ───────────────────│
│ NET      218 450 € │  ← gros chiffre, indigo
│ +6,8 %/an          │
└────────────────────┘
```

Pour le PER, la carte affiche en plus :
```
Économie entrée  +14 200 €   ← vert
```

### 5.4 Graphique évolution du capital net

`Recharts LineChart` :
- Axe X : années (0 → duration)
- Axe Y : capital net après impôts simulés (€)
- 4 lignes : CTO (gray-500), PEA (indigo-500), AV (emerald-500), PER (orange-500)
- `Tooltip` : valeurs des 4 enveloppes à l'année survolée + delta vs vainqueur
- `Legend` interactive (clic pour masquer une enveloppe)
- Responsive `ResponsiveContainer width="100%" height={340}`

### 5.5 Bar chart comparatif

`Recharts BarChart` horizontal — capital net à 3 horizons :
- 5 ans, 10 ans, 20 ans (ou jalons selon `duration`)
- 4 barres groupées par horizon
- Couleurs identiques au LineChart

### 5.6 Tableau détaillé

| Indicateur | CTO | PEA | AV | PER |
|-----------|-----|-----|-----|-----|
| Versements totaux | … | … | … | … |
| Capital brut au terme | … | … | … | … |
| Frais cumulés | … | … | … | … |
| Économie d'impôt à l'entrée | — | — | — | … |
| Imposition pendant la phase | … (div) | — | — | — |
| Imposition à la sortie | … | … | … | … |
| **Capital net** | … | … | … | … |
| Rendement annualisé net | … | … | … | … |
| Plafond respecté | ✓ | ✓/⚠ | ✓ | ✓/⚠ |
| Souplesse (retraits) | ⭐⭐⭐ | ⭐⭐ (5 ans) | ⭐⭐ (8 ans) | ⭐ (retraite) |

### 5.7 Notes méthodologiques (footnotes)

Section dynamique en bas de page, numérotée selon les options actives :

1. Hypothèse de capitalisation mensuelle des versements
2. Frais d'enveloppe appliqués en pourcentage de l'encours mensuel
3. CTO : taxation annuelle des dividendes simulés, plus-values taxées à la sortie uniquement
4. PEA : exonération IR après 5 ans, prélèvements sociaux 17,2 % uniquement
5. AV : abattement annuel `4 600 €` (seul) ou `9 200 €` (couple) appliqué une fois à la sortie
6. PER : économie d'impôt = TMI × versement annuel (plafonnée), réinvestissement optionnel
7. Hypothèse de sortie 100 % en capital pour le PER (rente non couverte)
8. Hypothèse de TMI constante à la retraite (égale à `retirementTMI`)
9. Avertissement si plafond PEA (150 000 €) ou plafond annuel PER dépassé

---

## 6. Structure du composant

### 6.1 Fichier

```
frontend/src/components/tools/FiscalEnvelopeComparatorPage.jsx
```

Composant unique sans nouvel endpoint backend.

### 6.2 Sous-composants internes

| Composant | Description |
|-----------|-------------|
| `NumInput` | Input numérique labelisé (réutilisé) |
| `Section` | Conteneur de section repliable (réutilisé) |
| `EnvelopeCard` | Carte synthèse par enveloppe avec badge rang |
| `WinnerBanner` | Bannière de tête affichant l'enveloppe vainqueur |
| `CustomTooltip` | Tooltip Recharts comparatif (4 valeurs + deltas) |

### 6.3 Fonctions de calcul (fichier `frontend/src/utils/fiscalEnvelopes.js`)

| Fonction | Description |
|----------|-------------|
| `simulateCTO(params)` | Retourne `{ chartData, capitalGross, totalFees, taxOnGains, netCapital }` |
| `simulatePEA(params)` | Idem, avec exonération IR conditionnelle après 5 ans |
| `simulateAV(params)` | Idem, avec abattement annuel après 8 ans |
| `simulatePER(params)` | Idem + `taxSavingsAtEntry` + option de réinvestissement |
| `compareEnvelopes(params)` | Orchestrateur — appelle les 4 simulateurs et calcule le ranking |
| `applyAVTaxation(gains, totalContribs, duration, household)` | Calcul fiscal AV (abattement + taux 24,7 %) |

### 6.4 Référentiel externalisé

Fichier `frontend/src/data/fiscal-envelopes.js` :

```js
export const FISCAL_ENVELOPE_PARAMS = {
  PFU_RATE: 0.314,
  SOCIAL_CHARGES_RATE: 0.172,
  AV_REDUCED_RATE: 0.247,        // 7,5 % + 17,2 %
  AV_ABATEMENT_SINGLE: 4600,
  AV_ABATEMENT_COUPLE: 9200,
  AV_FAVORABLE_THRESHOLD: 150000,
  PEA_CAP: 150000,
  PER_DEFAULT_ANNUAL_CAP: 32909, // PASS × 8 × 10 % en 2024
  DEFAULT_FEES: { cto: 0, pea: 0, av: 0.6, per: 0.6 },
}
```

> Avantage : si les barèmes évoluent (loi de finances), un seul fichier à modifier.

### 6.5 État local (useState)

```js
// Versements
const [initialAmount, setInitialAmount]           = useState(10000)
const [monthlyContribution, setMonthlyContribution] = useState(300)
const [duration, setDuration]                     = useState(20)
const [annualReturn, setAnnualReturn]             = useState(6)

// Profil fiscal
const [apiTMI, setApiTMI]                         = useState(null)
const [tmiLoading, setTmiLoading]                 = useState(true)
const [currentTMI, setCurrentTMI]                 = useState(30)
const [retirementTMI, setRetirementTMI]           = useState(30)
const [householdSituation, setHouseholdSituation] = useState('single')

// Frais
const [ctoFees, setCtoFees] = useState(0)
const [peaFees, setPeaFees] = useState(0)
const [avFees, setAvFees]   = useState(0.6)
const [perFees, setPerFees] = useState(0.6)

// Options avancées
const [perAnnualCap, setPerAnnualCap]               = useState(32909)
const [reinvestPerTaxSaving, setReinvestPerTaxSaving] = useState(true)
const [dividendYield, setDividendYield]             = useState(2)
const [taxOption, setTaxOption]                     = useState('pfu') // 'pfu' | 'bareme'
```

### 6.6 useMemo principal

```js
const result = useMemo(() => compareEnvelopes({
  initialAmount, monthlyContribution, duration, annualReturn,
  currentTMI, retirementTMI, householdSituation,
  ctoFees, peaFees, avFees, perFees,
  perAnnualCap, reinvestPerTaxSaving, dividendYield, taxOption,
}), [/* mêmes dépendances */])
// → { cto, pea, av, per, ranking, winner, chartData }
```

### 6.7 Effect — pré-remplissage TMI

```js
useEffect(() => {
  taxApi.simulateMine().then(res => {
    const tmi = inferTMIFromTaxBracket(res.totalTaxableIncome, res.fiscalParts)
    setApiTMI(tmi)
    setCurrentTMI(tmi)
    setRetirementTMI(tmi)
  }).finally(() => setTmiLoading(false))
}, [])
```

`inferTMIFromTaxBracket` lit le **revenu imposable par part** (`totalTaxableIncome / fiscalParts`) et retourne la TMI (0 / 11 / 30 / 41 / 45) selon le barème IRPP en vigueur.

---

## 7. Navigation et routing

### 7.1 App.jsx

```jsx
import FiscalEnvelopeComparatorPage from './components/tools/FiscalEnvelopeComparatorPage'
// ...
{currentPage === 'fiscal-envelopes' && <FiscalEnvelopeComparatorPage />}
```

### 7.2 Navigation.jsx

Entrée dans le dropdown **Outils** :

```jsx
{ page: 'fiscal-envelopes', label: "Comparateur d'enveloppes fiscales" }
```

La variable `isToolsPage` inclut `'fiscal-envelopes'`.

---

## 8. Contraintes de validation

| Champ | Contrainte |
|-------|-----------|
| `initialAmount` | ≥ 0 |
| `monthlyContribution` | ≥ 0 |
| `duration` | 1 – 40 ans |
| `annualReturn` | 0 – 20 % |
| `currentTMI` | ∈ {0, 11, 30, 41, 45} (saisie par dropdown) |
| `retirementTMI` | ∈ {0, 11, 30, 41, 45} |
| `ctoFees` / `peaFees` / `avFees` / `perFees` | 0 – 5 % |
| `dividendYield` | 0 – 10 % |
| `perAnnualCap` | 1 000 – 100 000 € |
| `peaCapBreached` | warning orange si `totalContribs > 150 000` |
| `perCapBreached` | warning orange si `monthlyContribution × 12 > perAnnualCap` |

---

## 9. Évolutions futures envisageables

- **Sortie en rente PER** : modélisation de la rente viagère (taxation RVTG selon âge)
- **Rachat échelonné AV** : option pour racheter sur N années afin de bénéficier N fois de l'abattement annuel
- **Transmission AV** : prise en compte de l'avantage successoral (152 500 € par bénéficiaire)
- **PEA-PME** : ajout d'une 5e enveloppe avec plafond 225 000 €
- **PEA Jeune** : plafond 20 000 €, conditions d'âge
- **Sauvegarde de simulation** : persistance via une nouvelle entité `FiscalEnvelopeSimulation` (modèle identique à `LoanSimulation`)
- **Pré-remplissage versement** : si l'utilisateur a une position BOURSE/IMMO_PAPIER active, proposer de pré-remplir `initialAmount` avec sa valeur actuelle
- **Détection automatique d'enveloppe** : pour chaque position du patrimoine, suggérer l'enveloppe optimale selon l'instrument (action UE → PEA, action US → CTO, SCPI → AV…)
- **Comparaison à versements échelonnés réalistes** : au lieu d'un versement initial + mensuel constant, simuler un profil "rampe" avec hausse annuelle des versements
- **Export PDF** : bouton "Télécharger le rapport" (impression CSS ou `react-to-print`)

---

## 10. Pas de backend requis

Ce comparateur est **entièrement calculé côté client**. Il n'y a :
- Aucune entité JPA à créer
- Aucun endpoint `/api/` à ajouter
- Aucune donnée persistée

Le seul appel backend est `GET /api/tax-simulator` (déjà existant) pour pré-remplir la TMI utilisateur. L'outil reste fonctionnel via saisie manuelle si l'appel échoue.

Les barèmes fiscaux sont externalisés dans `frontend/src/data/fiscal-envelopes.js` afin d'être révisables sans recompilation backend.
