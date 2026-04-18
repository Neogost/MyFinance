# Simulateur d'Emprunt Immobilier

## 1. Objectif

Permettre à l'utilisateur de **simuler un emprunt immobilier** en intégrant l'ensemble des coûts réels d'une acquisition (prix, frais de notaire, frais d'agence, garantie, dossier, courtage) et en modélisant précisément le remboursement du crédit (tableau d'amortissement mensuel, assurance, prêt à taux zéro, remboursement anticipé).

Le simulateur pré-remplit le **revenu mensuel net** depuis le profil fiscal de l'utilisateur connecté (via l'API existante), avec la possibilité de le surcharger manuellement pour tester différents scénarios.

> Outil purement frontend — aucun endpoint backend requis hormis `/api/tax-simulator` pour pré-remplir le revenu.

---

## 2. Paramètres d'entrée

### 2.1 Revenus (pré-remplis depuis l'API)

| Paramètre | Source | Description |
|-----------|--------|-------------|
| `apiIncome` | `GET /api/tax-simulator` → `salaryIncome / 12` | Revenu mensuel net de l'utilisateur |
| `incomeOverride` | Saisie manuelle (optionnel) | Surcharge du revenu mensuel net pour simulation |

Si `incomeOverride` est renseigné, il remplace `apiIncome` dans tous les calculs.

---

### 2.2 Le bien immobilier

| Paramètre | Type | Description |
|-----------|------|-------------|
| `propertyPrice` | `number` | Prix de vente du bien (€) |
| `surface` | `number` | Superficie (m²) — affiche le prix au m² |
| `propertyType` | `'ancien' \| 'neuf' \| 'vefa'` | Type de bien — impacte le calcul des frais de notaire |
| `agencyFees` + `agencyFeesMode` | `number` + `'amount'\|'percent'` | Frais d'agence (€ ou % du prix) |
| `dossierFees` + `dossierFeesMode` | `number` + `'amount'\|'percent'` | Frais de dossier bancaire (€ ou % du prêt) |
| `guaranteeFees` + `guaranteeFeesMode` | `number` + `'amount'\|'percent'` | Frais de garantie — caution (Crédit Logement) ou hypothèque (€ ou % du prêt) |
| `brokerageFees` + `brokerageFeesMode` | `number` + `'amount'\|'percent'` | Frais de courtage (€ ou % du prêt) |

---

### 2.3 L'emprunt principal

| Paramètre | Type | Description |
|-----------|------|-------------|
| `loanAmount` | `number` | Montant de l'emprunt principal (€) |
| `personalContrib` | `number` | Apport personnel (€) |
| `loanDuration` | `number` | Durée de l'emprunt (années, 5–30) |
| `annualRate` | `number` | Taux d'intérêt annuel nominal (%) |
| `insuranceRate` | `number` | Taux d'assurance annuel (%) — typiquement 0,10–0,40 % |
| `insuranceBase` | `'initial' \| 'remaining'` | Base de calcul de l'assurance — sur le capital initial (constant) ou sur le capital restant dû (dégressif) |

---

### 2.4 Co-emprunteurs

| Paramètre | Type | Description |
|-----------|------|-------------|
| `participants` | `Array<{id, name, percent}>` | Liste des co-emprunteurs avec leur pourcentage de participation |

La mensualité de chaque participant est affichée dans les KPIs et dans le tableau d'amortissement.

---

### 2.5 Prêt à Taux Zéro (PTZ) — optionnel

| Paramètre | Type | Description |
|-----------|------|-------------|
| `ptzEnabled` | `boolean` | Activer la simulation PTZ |
| `ptzAmount` | `number` | Montant du PTZ (€) |
| `ptzDuration` | `number` | Durée de remboursement du PTZ (années) |
| `ptzDeferral` | `number` | Période de différé (années pendant lesquelles le PTZ n'est pas remboursé) |

---

### 2.6 Remboursement anticipé — optionnel

| Paramètre | Type | Description |
|-----------|------|-------------|
| `earlyRepayments` | `Array<{id, year, amount, mode}>` | Liste de remboursements anticipés partiels |
| `year` | `number` | Année de l'opération (à partir du mois `year × 12`) |
| `amount` | `number` | Montant remboursé (€) |
| `mode` | `'reduce_duration' \| 'reduce_payment'` | Impact : réduire la durée (même mensualité) ou réduire la mensualité (même durée) |

Une IRA (indemnité de remboursement anticipé) est calculée : `min(3% du capital remboursé, 6 mois d'intérêts)`.

---

### 2.7 Charges propriétaire — optionnel

| Paramètre | Type | Description |
|-----------|------|-------------|
| `propertyTax` | `number` | Taxe foncière annuelle (€) |
| `condoFees` | `number` | Charges de copropriété mensuelles (€) |

Permet de calculer le **coût mensuel total réel** du projet (crédit + charges).

---

### 2.8 Comparaison de scénarios — optionnel

| Paramètre | Type | Description |
|-----------|------|-------------|
| `showComparison` | `boolean` | Activer le scénario alternatif |
| `compDuration` | `number` | Durée alternative (années) |
| `compRate` | `number` | Taux alternatif (%) |

---

## 3. Formules de calcul

### 3.1 Coût total d'acquisition

```
frais_agence    = agencyFeesMode    === 'percent' ? propertyPrice × agencyFees/100    : agencyFees
frais_dossier   = dossierFeesMode   === 'percent' ? loanAmount × dossierFees/100      : dossierFees
frais_garantie  = guaranteeFeesMode === 'percent' ? loanAmount × guaranteeFees/100    : guaranteeFees
frais_courtage  = brokerageFeesMode === 'percent' ? loanAmount × brokerageFees/100    : brokerageFees
frais_notaire   = calculerFraisNotaire(propertyPrice, propertyType)  // cf. §3.2

cout_acquisition = propertyPrice + frais_agence + frais_notaire
                 + frais_dossier + frais_garantie + frais_courtage
apport_requis    = cout_acquisition - loanAmount - ptzAmount
```

---

### 3.2 Frais de notaire

Les frais de notaire sont calculés selon le barème légal français. Ils varient selon le type de bien.

#### Bien ancien (environ 7–8 % du prix)

```
droits_departementaux = propertyPrice × 4.50 %
taxe_communale        = propertyPrice × 1.20 %
frais_assiette        = droits_departementaux × 2.37 %
securite_immobiliere  = max(propertyPrice × 0.10 %, 15)

emoluments_ht = tranche(0,      6 500,  3.945 %)
              + tranche(6 500,  17 000, 1.627 %)
              + tranche(17 000, 60 000, 1.085 %)
              + tranche(> 60 000,       0.814 %)
emoluments_ttc = emoluments_ht × 1.20   // TVA 20 %
debours = ~1 200 €  // forfait indicatif

frais_notaire = droits_departementaux + taxe_communale + frais_assiette
              + securite_immobiliere + emoluments_ttc + debours
```

#### Bien neuf / VEFA (environ 2–3 % du prix)

```
taxe_publicite = propertyPrice × 0.715 %
// + émoluments_ttc + securite_immobiliere + debours (même barème)
```

> Le détail ligne par ligne est affiché dans un **tooltip** au survol du montant des frais de notaire.

---

### 3.3 Mensualité principale (hors assurance)

```
r = annualRate / 100 / 12
n = loanDuration × 12

mensualite = loanAmount × r / (1 − (1 + r)^(−n))   // si r > 0
           = loanAmount / n                           // si r = 0
```

---

### 3.4 Assurance mensuelle

Deux modes selon `insuranceBase` :

```
// Sur capital initial (constant)
assurance(t) = loanAmount × insuranceRate / 100 / 12

// Sur capital restant dû (dégressif)
assurance(t) = capitalMain(t) × insuranceRate / 100 / 12
```

---

### 3.5 Tableau d'amortissement mensuel (boucle dynamique)

```
pour t = 1 à n+12 (sécurité) tant que capitalMain > 0.5 :
  interets(t)      = capitalMain × r
  amortissement(t) = min(currentPayment − interets(t), capitalMain)
  capitalMain      = capitalMain − amortissement(t)

  // PTZ
  si t > ptzDeferral×12 et t ≤ (ptzDeferral + ptzDuration)×12 :
    capitalPtz = capitalPtz − ptzMonthly

  // Remboursement anticipé en mois t = year×12
  si earlyRepayment[t] :
    prepayment = min(earlyRepayment.amount, capitalMain)
    ira = min(prepayment × 0.03, 6 × interets(t))
    capitalMain = capitalMain − prepayment
    si mode === 'reduce_payment' :
      currentPayment = computeMonthlyPayment(capitalMain, annualRate, n − t)
    // 'reduce_duration' : currentPayment inchangé, la boucle se termine naturellement
```

La boucle se termine naturellement quand `capitalMain ≤ 0.5`, ce qui modélise automatiquement la réduction de durée.

---

### 3.6 Coût total du crédit

```
frais_credit    = frais_dossier + frais_garantie + frais_courtage
total_interets  = Σ interets(t)
total_assurance = Σ assurance(t)
cout_credit     = total_interets + total_assurance + frais_credit
cout_total      = cout_acquisition + total_interets + total_assurance
```

---

### 3.7 Taux d'endettement et capacité d'emprunt

```
revenu_mensuel = incomeOverride || apiIncome
mensualites    = mensualite_principale + assurance_mensuelle + ptzMonthly

taux_endettement = mensualites / revenu_mensuel × 100

// Capacité maximale (calcul inverse)
mensualite_max = revenu_mensuel × 0.35 − assurance_mensuelle
capacite_max   = mensualite_max × (1 − (1 + r)^(−n)) / r
```

Seuil réglementaire HCSF : **35 %** (affiché en rouge si dépassé).

---

### 3.8 Coût mensuel total avec charges propriétaire

```
cout_mensuel_total = mensualite_totale + condoFees + propertyTax / 12
```

---

### 3.9 TAEG estimé

Résolution numérique par dichotomie (70 itérations) — trouve le taux mensuel `r` tel que :

```
loanAmount = Σ (mensualite(t) + frais_credit/nbMois) / (1 + r)^t   pour t = 1 … nbMois

TAEG = (1 + r)^12 − 1
```

---

### 3.10 Comparaison de scénarios

Le scénario alternatif recalcule un tableau d'amortissement complet avec `compDuration` et `compRate`, sans remboursements anticipés et avec `insuranceBase = 'initial'`. Il expose :

| Indicateur | Description |
|-----------|-------------|
| `monthlyTotal` | Mensualité + assurance + PTZ |
| `totalInterest` | Total intérêts |
| `totalCreditCost` | Total intérêts + assurance + frais |
| `taeg` | TAEG du scénario alternatif |
| `debtRatio` | Taux d'endettement alternatif |
| `actualMonths` | Durée effective (après amortissement complet) |

---

## 4. Interface utilisateur

### 4.1 Layout général

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Simulateur d'Emprunt Immobilier                                        │
├────────────────────────┬────────────────────────────────────────────────┤
│  PANNEAU GAUCHE (w-80) │  PANNEAU DROIT (flex-1)                        │
│                        │                                                │
│  Revenus               │  Bannière TAEG + durée effective (fond sombre) │
│  Le bien               │                                                │
│  ─ Frais courtage      │  KPIs synthèse (4 cartes)                      │
│  L'emprunt             │  Mensualité | Taux endettement                 │
│  ─ Base assurance      │  Coût crédit | Capacité max                    │
│  Co-emprunteurs        │                                                │
│  PTZ ▾                 │  Coût mensuel total (avec charges)             │
│  Remboursement anticipé│                                                │
│  Charges propriétaire  │  Mensualité par participant                    │
│  Comparaison de scénar.│                                                │
│                        │  Répartition des coûts (donut)                 │
│                        │                                                │
│                        │  Comparaison de scénarios (tableau)            │
│                        │                                                │
│                        │  Graphiques : capital restant + amortissement  │
│                        │                                                │
│                        │  Tableau d'amortissement ▾                     │
│                        │  [Vue annuelle / mensuelle]                    │
└────────────────────────┴────────────────────────────────────────────────┘
```

### 4.2 Section "Revenus"

- Affichage du revenu mensuel net pré-rempli (depuis l'API) avec badge "Depuis votre profil"
- Si l'API échoue ou si l'utilisateur n'a pas de contrat actif : champ vide avec placeholder
- Input "Surcharger le revenu mensuel net (€)" — si renseigné, remplace le revenu API
- Taux d'endettement en temps réel (badge vert < 33 % / orange 33–35 % / rouge > 35 %)

### 4.3 Section "Le bien"

- Prix, superficie (→ prix/m²), type de bien (toggle Ancien/Neuf/VEFA)
- Frais de notaire — lecture seule avec tooltip de détail au clic
- Frais d'agence, de dossier, de garantie, de courtage — inputs toggle €/%

### 4.4 Section "L'emprunt"

- Montant emprunté, apport personnel
- Durée — slider 5–30 ans
- Taux annuel (%), taux d'assurance (%/an)
- **Base d'assurance** — toggle "Capital initial (fixe)" / "Capital restant dû (dégressif)"

### 4.5 Section "Co-emprunteurs"

- Bouton "+ Ajouter un co-emprunteur" — crée une ligne avec nom et % de participation
- La somme des % est vérifiée (avertissement si ≠ 100 %)
- La mensualité de chaque participant est affichée dans la synthèse

### 4.6 Section "Remboursement anticipé"

- Bouton "+ Ajouter un remboursement anticipé" — crée une ligne avec année, montant, mode
- Mode : **Réduire la durée** (garder la mensualité) ou **Réduire la mensualité** (garder la durée)
- IRA affichée dans le tableau d'amortissement (ligne mise en évidence en amber)

### 4.7 Section "Charges propriétaire"

- Taxe foncière annuelle (€) → converti en mensuel pour le coût total
- Charges de copropriété mensuelles (€)

### 4.8 Section "Comparaison de scénarios"

- Checkbox "Comparer avec un scénario alternatif"
- Inputs : durée alternative et taux alternatif
- Tableau de comparaison affiché en panneau droit

### 4.9 Bannière TAEG

En haut du panneau droit, fond sombre (gray-800) :

```
TAEG estimé     Durée effective
3,82 %          20 ans (240 mois)
```

### 4.10 Tableau de comparaison (si activé)

8 lignes de comparaison entre le scénario principal et le scénario alternatif :

| Indicateur | Scénario 1 | Scénario 2 |
|-----------|-----------|-----------|
| Durée | 20 ans | 25 ans |
| Taux | 3,50 % | 3,00 % |
| Mensualité totale | … | … |
| Total intérêts | … | … |
| Total assurance | … | … |
| Coût total crédit | … | … |
| TAEG | … | … |
| Taux d'endettement | … | … |

### 4.11 Tableau d'amortissement

- Vue **annuelle** par défaut (agrégats) avec graphique ComposedChart (Bar intérêts + Bar amortissement + Area capital)
- Vue **mensuelle** dépliable — lignes de remboursement anticipé surlignées en amber
- Colonnes : Mois, Intérêts, Amortissement, Assurance, Mensualité, Remb. anticipé, IRA, Capital principal, Capital PTZ, Capital total

---

## 5. Graphiques (Recharts)

### 5.1 Répartition des coûts (PieChart donut)

Segments : Prix du bien / Frais d'agence / Frais de notaire / Intérêts du crédit / Assurance emprunt.

### 5.2 Évolution du capital restant dû (ComposedChart)

- Area chart : capital principal restant
- Area chart : capital PTZ restant (si PTZ actif)
- Axe X : années — Axe Y : montant (€)

### 5.3 Répartition annuelle intérêts / amortissement (ComposedChart)

- Bar empilée : intérêts (rose) + amortissement (indigo)
- Axe X : années — Axe Y : montant (€)

---

## 6. Structure du composant

### 6.1 Fonctions pures

| Fonction | Description |
|---------|-------------|
| `computeEmoluments(price)` | Calcule les émoluments notaire HT (barème dégressif 4 tranches) |
| `computeNotaryFees(price, type)` | Retourne `{ total, percent, detail[] }` selon le type de bien |
| `computeMonthlyPayment(capital, annualRate, months)` | Formule annuité — retourne la mensualité hors assurance |
| `bisect(fn, low, high, target)` | Dichotomie 70 itérations pour résolution numérique |
| `computeTAEG(loanAmount, rows, totalFees)` | TAEG via `bisect` sur la valeur actuelle des flux |
| `buildAmortizationTable({...})` | Boucle dynamique — retourne `{ rows, annualSummary, monthlyPrincipal, monthlyInsurance, ptzMonthly, actualMonths }` |

### 6.2 Sub-composants

| Composant | Rôle |
|-----------|------|
| `NumInput` | Input numérique avec label + hint |
| `AmountPctInput` | Input numérique + toggle €/% avec hint calculé |
| `Section` | Carte pliable/dépliable avec thème accent |
| `PropertyTypeToggle` | Sélecteur 3 états (Ancien / Neuf / VEFA) |

### 6.3 État React

```js
// Revenus
const [apiIncome, setApiIncome]           = useState(null)
const [incomeLoading, setIncomeLoading]   = useState(true)
const [incomeOverride, setIncomeOverride] = useState('')

// Bien
const [propertyPrice, setPropertyPrice]         = useState(250000)
const [surface, setSurface]                     = useState(0)
const [propertyType, setPropertyType]           = useState('ancien')
const [agencyFees, setAgencyFees]               = useState(0)
const [agencyFeesMode, setAgencyFeesMode]       = useState('percent')
const [dossierFees, setDossierFees]             = useState(1000)
const [dossierFeesMode, setDossierFeesMode]     = useState('amount')
const [guaranteeFees, setGuaranteeFees]         = useState(1)
const [guaranteeFeesMode, setGuaranteeFeesMode] = useState('percent')
const [brokerageFees, setBrokerageFees]         = useState(0)
const [brokerageFeesMode, setBrokerageFeesMode] = useState('amount')

// Emprunt
const [loanAmount, setLoanAmount]           = useState(200000)
const [personalContrib, setPersonalContrib] = useState(30000)
const [loanDuration, setLoanDuration]       = useState(20)
const [annualRate, setAnnualRate]           = useState(3.5)
const [insuranceRate, setInsuranceRate]     = useState(0.20)
const [insuranceBase, setInsuranceBase]     = useState('initial') // 'initial' | 'remaining'

// Co-emprunteurs
const [participants, setParticipants] = useState([{ id: 1, name: 'Emprunteur 1', percent: 100 }])

// PTZ
const [ptzEnabled, setPtzEnabled]   = useState(false)
const [ptzAmount, setPtzAmount]     = useState(30000)
const [ptzDuration, setPtzDuration] = useState(15)
const [ptzDeferral, setPtzDeferral] = useState(5)

// Remboursement anticipé
const [earlyRepayments, setEarlyRepayments] = useState([]) // [{ id, year, amount, mode }]

// Charges propriétaire
const [propertyTax, setPropertyTax] = useState(0)
const [condoFees, setCondoFees]     = useState(0)

// Comparaison de scénarios
const [showComparison, setShowComparison] = useState(false)
const [compDuration, setCompDuration]     = useState(25)
const [compRate, setCompRate]             = useState(3.0)

// UI
const [showMonthly, setShowMonthly]     = useState(false)
const [showTable, setShowTable]         = useState(true)
const [notaryTooltip, setNotaryTooltip] = useState(null)
```

### 6.4 useMemo principal

```js
const calc = useMemo(() => {
  // frais, acquisition, amortissement
  // taeg, comparison, totalMonthlyCost
  // pricePerSqm, debtRatio, maxLoanCapacity
  // donutItems, chartData
}, [
  propertyPrice, surface, propertyType,
  agencyFees, agencyFeesMode, dossierFees, dossierFeesMode,
  guaranteeFees, guaranteeFeesMode, brokerageFees, brokerageFeesMode,
  loanAmount, personalContrib, loanDuration, annualRate,
  insuranceRate, insuranceBase,
  ptzEnabled, ptzAmount, ptzDuration, ptzDeferral,
  earlyRepayments,
  propertyTax, condoFees,
  showComparison, compDuration, compRate,
  monthlyIncome,
])
```

---

## 7. Navigation et routing

### 7.1 App.jsx

```jsx
import LoanSimulatorPage from './components/tools/LoanSimulatorPage'
// ...
{currentPage === 'loan-simulator' && <LoanSimulatorPage />}
```

### 7.2 Navigation.jsx

Entrée dans le dropdown **Outils** :

```jsx
{ page: 'loan-simulator', label: "Simulateur d'emprunt" }
```

La variable `isToolsPage` inclut `'loan-simulator'`.

---

## 8. Contraintes de validation

| Champ | Contrainte |
|-------|-----------|
| `propertyPrice` | > 0 |
| `loanAmount` | > 0 |
| `loanDuration` | 5 – 30 ans |
| `annualRate` | 0,1 – 15 % |
| `insuranceRate` | 0 – 2 % |
| `ptzDeferral` | < `ptzDuration` |
| `earlyRepayment.year` | ≥ 1 |
| `participants` somme % | Avertissement si ≠ 100 % |
| `taux_endettement` | Avertissement si > 35 %, rouge si > 50 % |

---

## 9. Pas de backend requis (sauf revenus)

Le seul appel API est `GET /api/tax-simulator` pour pré-remplir le revenu — le champ `salaryIncome` du `TaxSimulationDto` est divisé par 12. Si l'appel échoue, l'outil reste entièrement fonctionnel via saisie manuelle. Aucune entité JPA ni endpoint `/api/loan-simulator` à créer.
