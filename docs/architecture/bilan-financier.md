# Bilan Financier Personnel

## Vue d'ensemble

Le Bilan Financier Personnel est une vue synthétique calquée sur le compte de résultat d'entreprise. Elle consolide en une seule page les revenus, dépenses, actifs et passifs de l'utilisateur pour donner une photographie financière instantanée.

Accessible depuis **Outils → Bilan financier** dans la navigation.

---

## Structure de la vue

```
┌──────────────────────────────────────────────────────┐
│                                   [Mensuel] [Annuel] │
├──────────────────────────────────────────────────────┤
│                      REVENUS  (vert)                 │
│  Salaire — Entreprise X              0 000,00 €      │
│  Revenus locatifs                       00,00 €      │
│  Dividendes                              0,00 €      │
│  Bourse (gains moy. mensuels)          000,00 €      │
│  Crypto-monnaie (gains moy. mensuels)   00,00 €      │
│  Immo papier (gains moy. mensuels)      00,00 €      │
│                                TOTAL  0 000,00 €     │
├──────────────────────────────────────────────────────┤
│                      DÉPENSES  (orange)              │
│  Logement                              000,00 €      │
│  Transport                              00,00 €      │
│  Alimentation                          000,00 €      │
│  …autres catégories…                                 │
│  Impôt estimé          [estimé]        000,00 €      │
│                                TOTAL  0 000,00 €     │
├─────────────────────────┬────────────────────────────┤
│   ACTIF  (vert)         │   PASSIF  (orange)         │
│  Bourse      00 000 €  │  Immobilier physique        │
│  Crypto      00 000 €  │               000 000 €     │
│  Immo papier 00 000 €  │  Collection     0 000 €     │
│  Livret      00 000 €  │  Véhicule       0 000 €     │
│  Liquidités   0 000 €  │  …                          │
│  ─────────────────────  │  ─────────────────────     │
│  TOTAL      000 000 €  │  TOTAL        000 000 €     │
├──────────────────────────────────────────────────────┤
│                    Δ R-D  +0 000,00 €                │
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
| Revenus | Revenus projetés par catégorie | `GET /api/positions?status=ACTIVE` | `computed.currentValueEur × PROJECTION_RATES[cat] / 12` agrégé par catégorie |
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

### Revenus — Revenus projetés par catégorie d'actif

Catégories concernées : `BOURSE`, `CRYPTO`, `IMMO_PAPIER`, `LIVRET`.

```
revenuMensuel(cat) = Σ(position.computed.currentValueEur) × PROJECTION_RATES[cat] / 12
```

Les taux sont définis dans `frontend/src/components/patrimoine/constants.js` (`PROJECTION_RATES`) :

| Catégorie | Taux annuel | Source |
|-----------|-------------|--------|
| `BOURSE` | 7 % | Rendement moyen long terme MSCI World |
| `CRYPTO` | 15 % | Estimation conservative |
| `IMMO_PAPIER` | 5 % | Rendement moyen SCPI |
| `LIVRET` | 2,4 % | Taux Livret A en vigueur |

Les positions avec `currentValueEur ≤ 0` ou taux = 0 sont exclues. Le taux est affiché entre parenthèses dans le label de chaque ligne, ex. `Bourse (proj. 7,0 %/an)`.

> `IMMO_PHYSIQUE` est exclu des revenus : une résidence principale ne génère pas de revenu direct. Sa valeur apparaît dans le Passif.
>
> `LIQUIDITE` est exclu des revenus (`PROJECTION_RATES.LIQUIDITE = 0`).

### Actif vs Passif — Immobilier physique

Les positions `IMMO_PHYSIQUE` n'apparaissent **pas** dans la colonne Actif. Elles sont agrégées dans la colonne **Passif** (logique Kiyosaki : un bien immobilier non locatif coûte plutôt qu'il ne rapporte).

### Dépenses — Impôt estimé

```
impôtMensuel = taxSimulator.totalEstimatedTax / 12
```

Badge « estimé » affiché. Si le simulateur échoue (profil fiscal incomplet ou erreur réseau), la ligne est simplement absente — l'appel utilise `.catch(() => null)`.

### Δ R-D et taux d'épargne

```
ΔRD = totalRevenus − totalDépenses
tauxEpargne = (ΔRD / totalRevenus) × 100
```

Affiché en vert (`+X €`) si positif, rouge si négatif. La section rouge inclut le message « Capacité d'épargne négative ». Le taux d'épargne est affiché en sous-titre (ex. `Taux d'épargne : 32,4 %`).

### Ratio de couverture patrimoniale

```
ratioCouverture = totalActif / (totalDépenses × 12)   [en années]
```

Représente le nombre d'années pendant lesquelles le patrimoine financier permettrait de couvrir les dépenses sans aucun revenu. Affiché dans un bloc indigo distinct avec l'unité « ans ».

### Projection FIRE

Voir la description complète dans `docs/architecture/dashboard.md` (section 9 — FireProjectionWidget). Le bilan financier intègre le même calcul sous forme de bloc violet avec :
- Barre de progression vers l'objectif FIRE (`totalActif / fireTarget`)
- Estimation des années restantes et année cible
- Trois hypothèses : rendement pondéré, dépenses annuelles, objectif FIRE (25× dépenses)

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
- **Revenus IMMO_PHYSIQUE locatif** : si une position IMMO_PHYSIQUE est en location, permettre de la basculer côté Actif/Revenus.
