# Gestion des dettes

## Objectif

Permettre à l'utilisateur de recenser ses dettes (emprunt immobilier, crédit étudiant, crédit à la consommation, crédit véhicule…) afin d'obtenir un **patrimoine net exact** et une vision complète de son bilan financier personnel.

Une dette peut optionnellement être **liée à une position de type `IMMO_PHYSIQUE`**, ce qui permet de visualiser la valeur nette du bien (valeur estimée − capital restant dû) directement dans la page Patrimoine.

---

## Entité `Debt`

### Champs

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `id` | Long | — | Clé primaire |
| `userId` | Long | oui | Propriétaire |
| `type` | `DebtTypeEnum` | oui | Catégorie de la dette |
| `label` | String | oui | Libellé libre (ex : "Crédit BNP appartement Paris") |
| `lender` | String | non | Établissement prêteur |
| `startDate` | LocalDate | non | Date de début de l'emprunt |
| `endDate` | LocalDate | non | Date de fin théorique (calculée ou saisie) |
| `initialCapital` | BigDecimal | oui | Capital initial emprunté |
| `annualRate` | BigDecimal | oui | Taux d'intérêt annuel (ex : 0.0325 pour 3,25 %) |
| `insuranceRate` | BigDecimal | non | Taux annuel de l'assurance emprunteur (ex : 0.0035 pour 0,35 %) |
| `monthlyPayment` | BigDecimal | non | Mensualité hors assurance |
| `remainingCapitalOverride` | BigDecimal | non | Valeur manuelle du capital restant (prioritaire sur la projection) |
| `currency` | String | oui | Devise (défaut : EUR) |
| `positionId` | Long | non | FK vers une position `IMMO_PHYSIQUE` (nullable) |

### Enum `DebtTypeEnum`

| Valeur | Description |
|--------|-------------|
| `IMMOBILIER` | Emprunt immobilier (résidence principale, investissement locatif) |
| `ETUDIANT` | Prêt étudiant |
| `VEHICULE` | Crédit auto ou moto |
| `CONSOMMATION` | Crédit à la consommation |
| `AUTRE` | Autre type de dette |

---

## Capital restant dû — modes de calcul

Le capital restant dû (`remainingCapital`) est exposé dans le `DebtDto`. Il est déterminé selon une priorité décroissante :

### Mode automatique (projection)

Si les quatre paramètres `initialCapital`, `annualRate`, `monthlyPayment` et `startDate` sont renseignés, le capital restant est **calculé automatiquement** à la date du jour via la formule d'amortissement à taux fixe :

```
tauxMensuel       = annualRate / 12
n                 = nombre de mois écoulés depuis startDate (jusqu'à aujourd'hui)
remainingCapital  = initialCapital × (1 + tauxMensuel)^n
                  − monthlyPayment × ((1 + tauxMensuel)^n − 1) / tauxMensuel
```

Cette formule est exactement celle utilisée par `LoanSimulatorPage` — la logique est partagée. Le résultat est toujours à jour sans aucune saisie de la part de l'utilisateur.

**Cas couverts par le mode automatique :** prêt immobilier classique à taux fixe, crédit auto, prêt étudiant à mensualité constante.

### Mode override manuel

Quand `remainingCapitalOverride` est renseigné, il **remplace** la projection automatique. Ce mode est utile pour :
- Taux variable (renégociation, prêt à taux révisable)
- Remboursement anticipé partiel
- Pause de paiement
- Prêt dont les paramètres exacts ne sont pas connus

L'UI indique clairement le mode actif : *"Capital calculé automatiquement"* ou *"Capital saisi manuellement le JJ/MM/AAAA"*.

Un bouton **"Réinitialiser vers la projection"** efface `remainingCapitalOverride` pour repasser en mode automatique.

### Historique des mises à jour manuelles — entité `DebtBalanceEntry`

Pour tracer l'évolution réelle du capital (notamment après des remboursements anticipés ou des renégociations), chaque saisie manuelle de `remainingCapitalOverride` est historisée dans une table dédiée :

| Champ | Type | Description |
|-------|------|-------------|
| `id` | Long | Clé primaire |
| `debtId` | Long | FK vers `Debt` |
| `entryDate` | LocalDate | Date de la mise à jour |
| `balance` | BigDecimal | Capital restant dû à cette date |
| `note` | String | Commentaire libre (ex : "Remboursement anticipé 5 000 €") |

Cet historique est accessible dans le détail d'une dette (tableau chronologique) et permet de comparer la trajectoire réelle avec la projection théorique.

**Endpoints associés :**

| Méthode | URL | Description |
|---------|-----|-------------|
| `GET` | `/api/debts/{id}/balance-entries` | Liste l'historique des mises à jour manuelles |
| `POST` | `/api/debts/{id}/balance-entries` | Ajouter une entrée (met à jour `remainingCapitalOverride`) |
| `DELETE` | `/api/debts/{id}/balance-entries/{entryId}` | Supprimer une entrée (recalcule le dernier override actif) |

---

## Tableau d'amortissement (12 prochains mois)

Quand le mode automatique est actif, le `DebtDto` expose un tableau `nextMonthsSchedule` (12 entrées) calculé côté backend :

```json
[
  { "month": "2025-05", "payment": 850.00, "interest": 195.42, "capital": 654.58, "remainingCapital": 187_345.42 },
  ...
]
```

Ce tableau est affiché dans l'UI en accordéon dépliable depuis la carte de chaque dette.

---

## Taux d'assurance emprunteur

L'assurance emprunteur (`insuranceRate`) est exprimée en **taux annuel sur le capital initial** (convention la plus courante des banques françaises). La cotisation mensuelle estimée est :

```
cotisationMensuelleAssurance = initialCapital × insuranceRate / 12
```

Le coût mensuel total de la dette (intérêts + assurance) est exposé dans le `DebtDto` :

```
monthlyTotalCost = monthlyPayment + cotisationMensuelleAssurance
```

> Note : certains contrats calculent l'assurance sur le capital restant dû. Le champ `insuranceRate` supporte les deux conventions via une saisie libre — c'est l'utilisateur qui choisit la base lors de la saisie.

---

## Lien avec une position `IMMO_PHYSIQUE`

### Principe

La FK `positionId` sur `Debt` est **nullable** — une dette peut exister sans être liée à un bien immobilier (ex : crédit étudiant), et un bien immobilier peut exister sans dette associée (bien possédé pleinement).

Quand la liaison est renseignée, la position `IMMO_PHYSIQUE` expose dans son `PositionDto` une valeur nette calculée :

```
valeurNette = currentValueEur − remainingCapital
```

### Saisie dans `PositionForm`

Dans le wizard de création/édition d'une position `IMMO_PHYSIQUE` (étape 2), un sélecteur optionnel permet de choisir parmi les dettes existantes de type `IMMOBILIER` non encore liées à un autre bien. Texte indicatif : *"Emprunt associé (optionnel)"*.

Si aucune dette n'existe encore, un lien "Créer une dette" redirige vers la page Dettes avec le type `IMMOBILIER` pré-sélectionné.

---

## Impact sur les modules existants

### Patrimoine net

Le calcul du patrimoine net intègre le capital restant dû de toutes les dettes :

```
patrimoineNet = patrimoineBrut − totalActifsMatériels − totalDettes
totalDettes   = Σ remainingCapital (toutes dettes actives)
```

Sur la **carte IMMO_PHYSIQUE** dans `PatrimoinePage`, si une dette est liée :
- Affichage de la valeur nette sous la valeur estimée : `Valeur nette : X €`
- Barre de remboursement : `(initialCapital − remainingCapital) / initialCapital`
- Badge discret indiquant le capital restant dû

### Bilan financier (`BilanFinancierPage`)

- Les dettes apparaissent dans la colonne **Passif** par type (`IMMOBILIER`, `VEHICULE`…)
- La mensualité totale (`monthlyTotalCost`) s'additionne aux charges mensuelles dans le calcul de la capacité d'épargne
- Ratio d'endettement affiché : `totalDettes / patrimoineBrut` en %

### Simulateur de crise (`CrisisSimulatorPage`)

Pendant une crise, les dettes restent constantes (le capital restant dû ne baisse pas). Le patrimoine net peut devenir négatif si les actifs s'effondrent sous le niveau des dettes :

```
patrimoineNetApres = patrimoineBrutApres − totalActifsMatériels − totalDettes
```

Si `patrimoineNetApres < 0` : affichage d'une alerte "Patrimoine net négatif — vos dettes dépassent la valeur de vos actifs".

### Simulateur d'emprunt (`LoanSimulatorPage`)

Bouton **"Enregistrer comme dette"** en bas du simulateur permettant d'importer le résultat de la simulation (capital, taux, mensualité, durée) directement dans le module Dettes avec le mode automatique activé.

### Tableau de bord (`DashboardPage`)

Widget **Taux d'endettement** : `totalDettes / patrimoineBrut` avec indicateur coloré :
- < 30 % : vert
- 30–60 % : ambre
- > 60 % : rouge

---

## API envisagée

| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/debts` | Authentifié | Liste ses dettes (avec `remainingCapital` et `monthlyTotalCost` calculés) |
| `GET` | `/api/debts/summary` | Authentifié | Synthèse : total capital restant dû, mensualités totales, répartition par type |
| `GET` | `/api/debts/{id}` | Authentifié | Détail + `nextMonthsSchedule` (12 mois) |
| `POST` | `/api/debts` | Authentifié | Créer une dette |
| `PUT` | `/api/debts/{id}` | Authentifié | Modifier une dette |
| `DELETE` | `/api/debts/{id}` | Authentifié | Supprimer une dette |
| `GET` | `/api/debts/{id}/balance-entries` | Authentifié | Historique des mises à jour manuelles |
| `POST` | `/api/debts/{id}/balance-entries` | Authentifié | Ajouter une mise à jour manuelle du capital |
| `DELETE` | `/api/debts/{id}/balance-entries/{entryId}` | Authentifié | Supprimer une entrée de l'historique |

---

## Frontend

### Page `DettePage`

Accessible depuis le menu (emplacement à définir lors de l'implémentation).

Structure :
- **4 KPIs** : total capital restant dû, mensualités totales (hors assurance), cotisations assurance mensuelles, taux d'endettement
- **Répartition par type** : barres horizontales par `DebtTypeEnum`
- **Liste groupée** par type avec pour chaque dette :
  - Label + établissement + mode actif (automatique / manuel)
  - Barre de remboursement : progression `(initialCapital − remainingCapital) / initialCapital`
  - Taux + mensualité + cotisation assurance + `monthlyTotalCost`
  - Accordéon : tableau des 12 prochains mois (échéance, intérêts, capital, solde)
  - Accordéon : historique des mises à jour manuelles
  - Badge si liée à un bien immobilier (avec lien vers la position)

### Formulaire `DebtForm`

Modal avec les champs :
- Type (select), label (texte libre), établissement
- Capital initial, taux annuel, mensualité, date de début
- Taux assurance emprunteur
- Override manuel du capital restant (avec date et note)
- Sélecteur de position IMMO_PHYSIQUE (uniquement si type = IMMOBILIER)

Aperçu temps réel : capital restant calculé automatiquement selon les paramètres, mensualité totale avec assurance, coût total restant estimé.

---

## Décisions de conception

**Pourquoi un `remainingCapitalOverride` plutôt que `remainingCapital` stocké ?**
Le capital projeté est toujours recalculable depuis les paramètres — le stocker introduirait une donnée redondante qui se désynchronise dès qu'on modifie le taux ou la mensualité. L'override n'intervient qu'en exception (remboursement anticipé, taux variable), et est clairement distingué dans l'UI.

**Pourquoi `DebtBalanceEntry` plutôt qu'un simple champ `lastManualUpdate` ?**
L'historique permet de comparer la trajectoire réelle avec la projection théorique, et de retrouver l'effet de chaque remboursement anticipé. Le coût de stockage est négligeable (une entrée par mise à jour manuelle, quelques fois par an).

**Pourquoi `positionId` sur `Debt` plutôt que `debtId` sur `Position` ?**
Une position immobilière peut exister sans dette (bien possédé pleinement). Placer la FK côté `Debt` préserve la position comme entité autonome et évite d'alourdir `CreatePositionRequest` pour tous les types de position.

**Pourquoi ne pas renommer les "Passifs" (possessions) actuels ?**
Le terme "Passifs" est déjà ancré dans la navigation, les API et la documentation. La cohabitation est acceptable en précisant le contexte : "Passifs matériels" pour les possessions, "Dettes" pour le nouveau module.
