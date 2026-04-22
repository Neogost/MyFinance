# Simulateur de crise

## Objectif

Permettre à l'utilisateur de visualiser l'impact qu'une crise financière historique aurait sur son patrimoine actuel, et d'estimer le temps de récupération selon son taux d'épargne.

Accessible via **Outils → Simulation de crise**.

---

## Principe de fonctionnement

Le simulateur est **100 % frontend** — aucun nouvel endpoint backend n'est nécessaire. Il s'appuie sur :
- Les positions actives déjà chargées (`GET /api/positions?status=ACTIVE`)
- Des **taux de chute historiques par catégorie** stockés comme constantes
- Le taux d'épargne et le patrimoine calculés localement

L'utilisateur choisit un scénario, visualise l'impact immédiat sur chaque catégorie, et consulte une estimation du temps de récupération.

---

## Scénarios disponibles

### Scénarios historiques

#### 2008 — Crise des subprimes

La plus grande crise financière depuis 1929. Effondrement du marché immobilier américain, faillite de Lehman Brothers, chute mondiale des marchés actions.

| Catégorie      | Chute estimée | Durée de récupération |
|----------------|---------------|-----------------------|
| BOURSE         | −55 %         | 5–7 ans               |
| IMMO_PAPIER    | −15 %         | 3–4 ans               |
| IMMO_PHYSIQUE  | −10 %         | 3–5 ans               |
| CRYPTO         | n/a (inexistant) | —                  |
| LIVRET         | 0 %           | immédiat              |
| LIQUIDITE      | 0 %           | immédiat              |

Rendement moyen post-crise (pour le calcul de récupération) : **+8 % / an** (BOURSE), **+3 % / an** (IMMO).

---

#### 2000 — Éclatement de la bulle dot-com

Effondrement des valeurs technologiques après une période de spéculation extrême. Impact limité sur l'immobilier physique, qui a joué un rôle refuge en France.

| Catégorie      | Chute estimée | Durée de récupération |
|----------------|---------------|-----------------------|
| BOURSE         | −50 %         | 6–8 ans               |
| IMMO_PAPIER    | −5 %          | 1–2 ans               |
| IMMO_PHYSIQUE  | +5 %          | (hausse contre-cyclique) |
| CRYPTO         | n/a           | —                     |
| LIVRET         | 0 %           | immédiat              |
| LIQUIDITE      | 0 %           | immédiat              |

Rendement moyen post-crise : **+9 % / an** (BOURSE).

---

#### 2020 — Choc COVID-19

Chute brutale et récupération en V. La crise la plus courte de l'histoire moderne sur les marchés actions.

| Catégorie      | Chute estimée | Durée de récupération |
|----------------|---------------|-----------------------|
| BOURSE         | −35 %         | 6–12 mois             |
| IMMO_PAPIER    | −10 %         | 1–2 ans               |
| IMMO_PHYSIQUE  | −3 %          | 6–12 mois             |
| CRYPTO         | −50 %         | 6–12 mois             |
| LIVRET         | 0 %           | immédiat              |
| LIQUIDITE      | 0 %           | immédiat              |

Rendement moyen post-crise : **+25 % / an** sur 2 ans (rebond exceptionnel).

---

#### 2022 — Crypto Winter + marché baissier

Hausse des taux directeurs, effondrement des cryptomonnaies, bear market actions.

| Catégorie      | Chute estimée | Durée de récupération |
|----------------|---------------|-----------------------|
| BOURSE         | −20 %         | 1–3 ans               |
| IMMO_PAPIER    | −8 %          | 2–3 ans               |
| IMMO_PHYSIQUE  | −5 %          | 2–4 ans               |
| CRYPTO         | −75 %         | 3–5 ans               |
| LIVRET         | 0 %           | immédiat              |
| LIQUIDITE      | 0 %           | immédiat              |

---

### Scénario personnalisé

L'utilisateur définit lui-même un taux de chute par catégorie via des sliders (−100 % à 0 %). Utile pour tester des hypothèses personnalisées ou des scénarios extrêmes.

---

## Calculs

### Impact immédiat

Pour chaque catégorie `cat` :

```
valeurApres(cat) = valeurAvant(cat) × (1 + tauxChute(cat))
pertePotentielle(cat) = valeurAvant(cat) − valeurApres(cat)
```

Totaux :

```
patrimoineBrutApres  = Σ valeurApres(cat)
patrimoineNetApres   = patrimoineBrutApres − totalPassif
perteTotale          = patrimoineBrutAvant − patrimoineBrutApres
```

### Couverture du matelas de sécurité

Si l'utilisateur a configuré un matelas de sécurité :

```
liquiditesApres  = valeurApres(LIQUIDITE) + valeurApres(LIVRET)
moisCouverts     = liquiditesApres / totalDepensesMenusuelles
objectifAtteint  = liquiditesApres >= targetMatelas
```

### Estimation du temps de récupération

Basé sur le **rendement moyen historique post-crise** du scénario et le **taux d'épargne actuel** de l'utilisateur :

```
epargneAnnuelle   = capaciteEpargne × 12
rendementAnnuel   = rendementPostCrise(scenario)  // constante par scénario

// Croissance composée jusqu'au retour au niveau d'avant-crise
N = log(patrimoineBrutAvant / patrimoineBrutApres)
    / log(1 + rendementAnnuel + epargneAnnuelle / patrimoineBrutApres)
```

Si l'utilisateur active l'option "perte d'emploi" :

```
epargneAnnuelleReduite = 0  // ou valeur partielle selon durée chômage saisie
```

---

## Interface utilisateur

### Mise en page

```
┌─────────────────────────────────────────────────────────┐
│  Sélecteur de scénario  [2008 ▼]    □ Perte d'emploi   │
├──────────────────┬──────────────────────────────────────┤
│  AVANT           │  APRÈS                               │
│  Patrimoine brut │  Patrimoine brut                     │
│  Patrimoine net  │  Patrimoine net                      │
│                  │  Perte totale  −XXX €  (−XX %)       │
├──────────────────┴──────────────────────────────────────┤
│  Détail par catégorie                                   │
│  ████████████  BOURSE    125 000 €  →  56 250 €  −55%  │
│  ██████        IMMO      200 000 €  → 180 000 €  −10%  │
│  ████████████  LIVRET     20 000 €  →  20 000 €    0%  │
├─────────────────────────────────────────────────────────┤
│  Matelas de sécurité                                    │
│  Liquidités après crise : 18 000 €  → X mois couverts  │
│  Objectif matelas : [atteint ✓ / insuffisant ✗]        │
├─────────────────────────────────────────────────────────┤
│  Récupération estimée                                   │
│  À ton taux d'épargne actuel (XXX €/mois) + rendement  │
│  historique post-crise :  ≈ N années                   │
│  [barre de progression avec jalons 25/50/75/100 %]     │
└─────────────────────────────────────────────────────────┘
```

### Composants

| Composant | Rôle |
|-----------|------|
| `CrisisSimulatorPage.jsx` | Page principale, orchestration |
| `CrisisScenarioSelector.jsx` | Sélecteur de scénario + toggle perte d'emploi |
| `CrisisSummaryCards.jsx` | Cartes avant/après (patrimoine brut, net, perte) |
| `CrisisCategoryBreakdown.jsx` | Tableau détail par catégorie avec barres visuelles |
| `CrisisSafetyNetStatus.jsx` | Indicateur matelas post-crise |
| `CrisisRecoveryEstimate.jsx` | Estimation de récupération + barre de progression |
| `crisisScenarios.js` | Constantes : taux de chute et rendements post-crise |
| `crisisUtils.js` | Fonctions de calcul (impact, récupération) |

---

## Données utilisées

| Donnée | Source |
|--------|--------|
| Positions actives par catégorie | `GET /api/positions?status=ACTIVE` (déjà disponible) |
| Total passifs | `GET /api/possessions/summary` (déjà disponible) |
| Capacité d'épargne / dépenses | `GET /api/recurring-expenses/summary` (déjà disponible) |
| Matelas de sécurité (cible) | `user.safetyNetMode` + `computeSafetyNetTarget()` (déjà disponible) |
| Taux de chute historiques | Constantes locales dans `crisisScenarios.js` |

Aucun nouvel endpoint backend requis.

---

## Limites et avertissements

Le simulateur doit afficher un avertissement visible :

> *Les taux de chute utilisés sont des approximations basées sur les données historiques. Les performances passées ne préjugent pas des performances futures. Cet outil est fourni à titre indicatif uniquement.*

Limites connues :
- Les taux appliqués sont des moyennes globales — l'impact réel dépend de la composition précise du portefeuille (secteur, géographie, duration des obligations…)
- L'immobilier physique est valorisé via `estimatedCurrentValue` saisie manuellement — la simulation applique un taux forfaitaire sur cette valeur
- Le scénario "perte d'emploi" est binaire (oui/non + durée) ; il ne modélise pas les indemnités chômage

---

## Navigation

Entrée **Simulation de crise** à ajouter dans le menu **Outils** de `Navigation.jsx`, routée via `currentPage = 'crisis-simulator'`.
