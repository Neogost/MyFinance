# Simulateur de crise

## Objectif

Permettre à l'utilisateur de visualiser l'impact qu'une crise financière historique aurait sur son patrimoine actuel, d'estimer le temps de récupération, et d'explorer des leviers d'action (réallocation au creux, rééquilibrage préventif).

Accessible via **Outils → Simulation de crise**.

---

## Principe de fonctionnement

Le simulateur est **100 % frontend** — aucun endpoint backend n'est nécessaire. Il s'appuie sur quatre appels API existants effectués en parallèle au chargement :

| Donnée | Endpoint |
|--------|----------|
| Positions actives par catégorie | `GET /api/positions?status=ACTIVE` |
| Total passifs | `GET /api/possessions/summary` |
| Dépenses mensuelles | `GET /api/recurring-expenses/summary` |
| Contrat salarial actif | `GET /api/salary-contracts` |

L'utilisateur choisit un scénario, configure des options (perte d'emploi, réallocation), et consulte l'impact immédiat, le score de résilience, la trajectoire de récupération et l'impact sur son horizon FIRE.

---

## Fichiers

| Fichier | Rôle |
|---------|------|
| `CrisisSimulatorPage.jsx` | Page principale — toute la logique et l'UI |
| `crisisScenarios.js` | Constantes : taux de chute et rendements post-crise par scénario |

---

## Scénarios disponibles

### Scénarios historiques

| Scénario | BOURSE | IMMO_PAPIER | IMMO_PHYSIQUE | CRYPTO | LIVRET / LIQUIDITE | Rendement post-crise | Réf. historique |
|----------|--------|-------------|---------------|--------|--------------------|----------------------|-----------------|
| 2008 — Subprimes      | −55 % | −15 % | −10 % |  0 %  | 0 % | 8 % / an  | 5–7 ans  |
| 2000 — Bulle dot-com  | −50 % |  −5 % |  +5 % |  0 %  | 0 % | 9 % / an  | 6–8 ans  |
| 2020 — COVID-19       | −35 % | −10 % |  −3 % | −50 % | 0 % | 20 % / an | 6–12 mois |
| 2022 — Crypto Winter  | −20 % |  −8 % |  −5 % | −75 % | 0 % | 8 % / an  | 3–5 ans  |

### Scénario personnalisé

L'utilisateur définit ses propres taux de chute par catégorie via des sliders (−100 % à 0 %).

---

## Calculs

### Impact immédiat

```
valeurApres(cat)    = valeurAvant(cat) × (1 + tauxChute(cat))
perteTotale         = Σ valeurApres(cat) − patrimoineBrutAvant
patrimoineNetApres  = patrimoineBrutApres − totalPassif
```

### Perte d'emploi — érosion du matelas

Lorsque l'option "perte d'emploi" est activée avec une durée N mois :

```
erosionMatelas           = min(liquiditesApres, N × depensesMensuelles)
liquiditesApresChomage   = max(0, liquiditesApres − N × depensesMensuelles)
patrimoineBrutApresChomage = patrimoineBrutApres − erosionMatelas
epargneAnnuelle          = 0   // aucune épargne pendant la récupération
```

Le point de départ du calcul de récupération est `patrimoineBrutApresChomage` (et non `patrimoineBrutApres`).

### Estimation du temps de récupération

Simulation itérative année par année jusqu'au retour au niveau pré-crise (plafonnée à 50 ans) :

```
valeur(0) = recoveryStart  // patrimoineBrutApres ou patrimoineBrutApresChomage
valeur(n) = valeur(n-1) × (1 + rendementPostCrise) + epargneAnnuelle
recoveryYears = n tel que valeur(n) ≥ patrimoineBrutAvant
```

### Réallocation post-crise — rachat au creux

Lorsque l'utilisateur réinjecte `reinvestPct %` de son matelas en Bourse au creux :

```
reinvestAmount  = liquiditesAffichees × reinvestPct / 100
reinvestBonus   = reinvestAmount × (1 / (1 + bourseDrawdown) − 1)
  // acheter à prix décoté donne un surplus de parts ; le bonus = gain théorique
  // si retour au niveau pré-crise
recoveryStartReinvest = recoveryStart + reinvestBonus
```

Le `recoveryBonus` s'ajoute au point de départ de la récupération sans modifier le patrimoine total (on modélise uniquement le gain de parts supplémentaires sur la portion réinvestie).

### Impact FIRE

Calcul séparé avec un rendement long terme fixe (7 % / an) indépendant du scénario :

```
fireTarget          = depensesMensuelles × 12 × 25  // règle des 4 %
yearsToFireBefore   = computeRecoveryYears(patrimoineBrutAvant, fireTarget, 7 %, epargneAnnuelle)
yearsToFireAfter    = computeRecoveryYears(recoveryStart, fireTarget, 7 %, epargneAnnuelle)
fireDelay           = yearsToFireAfter − yearsToFireBefore
```

### Score de résilience

Score synthétique de 0 à 10 calculé comme la moyenne pondérée de trois composantes :

| Composante | Poids | Formule | Seuils |
|------------|-------|---------|--------|
| Perte patrimoniale | 40 % | `max(0, 10 × (1 − │perte│ / 50 %))` | 10 si 0 % de perte, 0 si ≥ 50 % |
| Couverture du matelas | 30 % | `min(10, moisCouverts × 10 / 6)` | 10 si ≥ 6 mois couverts |
| Temps de récupération | 30 % | `max(0, 10 × (1 − années / 15))` | 10 si immédiat, 0 si ≥ 15 ans |

```
resilienceScore = round(lossScore × 0.4 + matScore × 0.3 + recScore × 0.3)
```

Libellés : 7–10 → **Résilient** (vert), 4–6 → **Modéré** (ambre), 0–3 → **Vulnérable** (rouge).

### Recommandation de rééquilibrage

Le composant identifie le sous-score le plus faible et calcule une action concrète :

| Cas | Action proposée | Calcul |
|-----|-----------------|--------|
| Matelas insuffisant | Transférer X € de CRYPTO/BOURSE/IMMO_PAPIER vers LIVRET | Monte jusqu'à 6 mois de couverture |
| Perte trop élevée | Réduire de 20 % l'exposition à CRYPTO ou BOURSE | Cible : limiter la perte à < 30 % |
| Récupération trop lente | Augmenter l'épargne mensuelle de 10 % des dépenses | Réduit les années de récupération |

Le nouveau score projeté est affiché pour chaque suggestion.

---

## Interface utilisateur

### Sections de la page

1. **Sélecteur de scénario** — boutons de scénario + description + sliders (mode personnalisé) + toggle perte d'emploi avec durée (mois)
2. **Synthèse avant / après** — 3 cartes : patrimoine brut, patrimoine net, perte potentielle
3. **Score de résilience** — anneau SVG + 3 sous-scores + recommandation de rééquilibrage
4. **Impact par catégorie** — barres horizontales avec valeurs avant/après et badge %
5. **Matelas de sécurité** — valeur résiduelle, mois couverts, objectif ; épuisement mois par mois (si perte d'emploi active)
6. **Réallocation post-crise** — slider de réinvestissement + montant, plus-value latente, récupération accélérée
7. **Estimation de récupération** — nombre d'années + courbe Recharts avec ligne "Avant crise", ligne "FIRE" et trajectoire avec/sans réallocation
8. **Impact sur la projection FIRE** — 3 cartes (objectif FIRE, sans crise, après crise) + barres de progression vers l'objectif
9. **Méthodologie** — explication du calcul du score de résilience

### Courbe de récupération

Graphique `LineChart` Recharts montrant la trajectoire année par année depuis le creux :
- Ligne indigo : trajectoire de base
- Ligne verte en pointillés : trajectoire avec réallocation (si active)
- `ReferenceLine` horizontal gris : niveau pré-crise
- `ReferenceLine` horizontal violet : objectif FIRE (si inférieur au patrimoine actuel)

---

## Limites et avertissements

- Les taux appliqués sont des moyennes globales — l'impact réel dépend de la composition précise du portefeuille (secteur, géographie, duration)
- L'immobilier physique est valorisé via `estimatedCurrentValue` saisie manuellement — la simulation applique un taux forfaitaire
- Le scénario "perte d'emploi" ne modélise pas les indemnités chômage
- Le "bonus de réallocation au creux" suppose un retour intégral au niveau pré-crise de la Bourse
- Le score FIRE utilise un rendement fixe de 7 % / an indépendant du scénario sélectionné
- La recommandation de rééquilibrage est indicative et ne tient pas compte de la fiscalité des arbitrages
