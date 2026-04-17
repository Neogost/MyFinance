# Bilan Financier Personnel

## Vue d'ensemble

Le Bilan Financier Personnel est une vue synthétique calquée sur le compte de résultat d'entreprise. Elle consolide en une seule page les revenus, dépenses, actifs et passifs de l'utilisateur pour donner une photographie financière instantanée.

Accessible depuis **Outils → Bilan financier** dans la navigation.

---

## Structure de la vue

```
┌──────────────────────────────────────────────────────┐
│                                   [Mensuel] [Annuel]  │
├──────────────────────────────────────────────────────┤
│                      REVENUS  (vert)                  │
│  Salaire — Entreprise X              2 787,25 €      │
│  Revenus locatifs                       27,49 €      │
│  Dividendes                              0,00 €      │
│  Bourse (gains moy. mensuels)          199,82 €      │
│  Crypto-monnaie (gains moy. mensuels)   60,62 €      │
│  Immo papier (gains moy. mensuels)      56,61 €      │
│                                TOTAL  3 131,79 €      │
├──────────────────────────────────────────────────────┤
│                      DÉPENSES  (orange)               │
│  Logement                              662,83 €      │
│  Transport                              83,00 €      │
│  Alimentation                          300,00 €      │
│  …autres catégories…                                 │
│  Impôt estimé          [estimé]        233,66 €      │
│                                TOTAL  1 330,24 €      │
├─────────────────────────┬────────────────────────────┤
│   ACTIF  (vert)         │   PASSIF  (orange)         │
│  Bourse      68 468 €  │  Immobilier physique        │
│  Crypto      12 321 €  │               115 000 €     │
│  Immo papier 10 980 €  │  Collection     7 500 €     │
│  Livret      10 278 €  │  Véhicule       6 119 €     │
│  Liquidités   4 215 €  │  …                          │
│  ─────────────────────  │  ─────────────────────     │
│  TOTAL      106 264 €  │  TOTAL        131 156 €     │
├──────────────────────────────────────────────────────┤
│                    Δ R-D  +1 801,55 €                │
└──────────────────────────────────────────────────────┘
```

---

## Sources de données

Aucun endpoint backend nouveau. Tout provient d'endpoints existants.

| Bloc | Ligne | Endpoint | Champ |
|------|-------|----------|-------|
| Revenus | Salaire | `GET /api/salary-contracts` | Contrat sans `endDate` → `monthlyNetAfterTax` ou `monthlyNetImposable` si profil fiscal incomplet |
| Revenus | Revenus locatifs | `GET /api/other-incomes` | Type `LOCATIF` — somme des `amount` |
| Revenus | Dividendes | `GET /api/other-incomes` | Type `DIVIDENDE` — somme des `amount` |
| Revenus | Aides sociales | `GET /api/other-incomes` | Type `AIDE_SOCIALE` — somme des `amount` |
| Revenus | Gains par catégorie | `GET /api/positions?status=ACTIVE` | `computed.capitalGainEur / 12` agrégé par catégorie |
| Dépenses | Par catégorie | `GET /api/recurring-expenses/summary` | `byCategory[].monthlyAmount` |
| Dépenses | Impôt estimé | `GET /api/tax-simulator` | `totalEstimatedTax / 12` |
| Actif | Par catégorie | `GET /api/positions?status=ACTIVE` | `computed.currentValueEur` agrégé par catégorie (hors `IMMO_PHYSIQUE`) |
| Passif | Immobilier physique | `GET /api/positions?status=ACTIVE` | `computed.currentValueEur` des positions `IMMO_PHYSIQUE` |
| Passif | Possessions | `GET /api/possessions/summary` | `byCategory[].totalEffectiveValue` |

> **Note :** `OtherIncome.amount` est toujours mensuel — aucune conversion de fréquence n'est nécessaire.

---

## Règles de calcul

### Revenus — Salaire

Contrat actif = premier contrat sans `endDate`, ou à défaut le premier de la liste.

Priorité :
1. `monthlyNetAfterTax` (profil fiscal complet)
2. `monthlyNetImposable` (profil fiscal incomplet — badge « net imposable » affiché)

Un bandeau d'avertissement jaune s'affiche si le profil fiscal est incomplet.

### Revenus — Revenus complémentaires

Seuls les types `LOCATIF`, `DIVIDENDE` et `AIDE_SOCIALE` apparaissent dans le bilan. Le type `AUTRE` est volontairement exclu (revenu non récurrent). Les lignes avec montant = 0 sont masquées.

### Revenus — Gains d'investissement par catégorie

Catégories concernées : `BOURSE`, `CRYPTO`, `IMMO_PAPIER`, `LIVRET`.

```
gainMensuel(catégorie) = Σ(position.computed.capitalGainEur) / 12
```

Approximation : on ramène le gain total latent à une moyenne sur 12 mois. Les moins-values (gain < 0) sont exclues. Une note de bas de page l'indique.

> `IMMO_PHYSIQUE` est exclu des revenus : une résidence principale ne génère pas de revenu direct. Sa valeur apparaît dans le Passif.
>
> `LIQUIDITE` est exclu des revenus (pas de plus-value latente).

### Actif vs Passif — Immobilier physique

Les positions `IMMO_PHYSIQUE` n'apparaissent **pas** dans la colonne Actif. Elles sont agrégées dans la colonne **Passif** (logique Kiyosaki : un bien immobilier non locatif coûte plutôt qu'il ne rapporte).

### Dépenses — Impôt estimé

```
impôtMensuel = taxSimulator.totalEstimatedTax / 12
```

Badge « estimé » affiché. Si le simulateur échoue (profil fiscal incomplet ou erreur réseau), la ligne est simplement absente — l'appel utilise `.catch(() => null)`.

### Δ R-D

```
ΔRD = totalRevenus − totalDépenses
```

Affiché en vert (`+X €`) si positif, rouge si négatif. La section rouge inclut le message « Capacité d'épargne négative ».

### Vue annuelle

Toggle **Mensuel / Annuel** — multiplicateur `× 12` appliqué à tous les montants des sections Revenus et Dépenses. La section Actif/Passif affiche toujours des valeurs ponctuelles (non multipliées).

---

## Composant frontend

**Fichier :** `frontend/src/components/tools/BilanFinancierPage.jsx`

Page auto-contenue, pas de composant enfant externe. Deux sous-composants locaux :
- `BilanRow` — ligne de tableau avec label, montant optionnel et badge
- `TotalRow` — ligne de total avec couleur paramétrable

**Appels API (en parallèle via `Promise.all`) :**

| Fonction | Fichier |
|----------|---------|
| `getSalaryContracts()` | `api/income.js` |
| `getOtherIncomes()` | `api/income.js` |
| `getPositions({ status: 'ACTIVE' })` | `api/patrimoine.js` |
| `simulateTax()` | `api/tools.js` |
| `getExpenseSummary()` | `api/expenses.js` |
| `getPossessionsSummary()` | `api/possessions.js` |

**Layout Actif/Passif :** CSS grid 2 colonnes. Chaque colonne est `flex flex-col` ; la ligne TOTAL est extraite de la `<table>` et positionnée avec `mt-auto` pour garantir l'alignement en bas quelle que soit la hauteur de chaque colonne.

---

## Navigation

- `Navigation.jsx` — entrée « Bilan financier » dans le dropdown **Outils** ; `isToolsPage` inclut `bilan-financier`
- `App.jsx` — route `currentPage === 'bilan-financier'`

---

## États particuliers

| Situation | Comportement |
|-----------|-------------|
| Aucun contrat salarial | Ligne Salaire affichée en italique gris, montant `—` |
| Profil fiscal incomplet | Badge « net imposable » sur la ligne salaire + bandeau amber |
| Simulateur d'impôts inaccessible | Ligne impôt absente (catch silencieux) |
| Aucune position active | Message « Aucune position active » dans la colonne Actif |
| Aucun passif ni IMMO_PHYSIQUE | Message « Aucun passif renseigné » dans la colonne Passif |
| Gain négatif (moins-value) | Exclu des revenus (seulement les gains > 0 sont affichés) |

---

## Évolutions possibles (hors périmètre V1)

- **Vue historique** : comparer avec la date d'un snapshot passé.
- **Export PDF** : `window.print()` + CSS print media.
- **Patrimoine net** : afficher `Actif − Passif` sous le bilan.
- **Taux d'épargne** : `Δ R-D / Total Revenus × 100` en badge.
- **Revenus IMMO_PHYSIQUE locatif** : si une position IMMO_PHYSIQUE est en location, permettre de la basculer côté Actif/Revenus.
