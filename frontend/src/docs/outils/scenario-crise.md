# Scénario de crise

Ce simulateur évalue la résistance de votre patrimoine face à un choc simultané : chute des marchés financiers, perte de revenus et/ou dépense imprévue. Il calcule un **score de résistance** sur 100 points.

> ![Vue principale simulation de crise](/docs/outils/crise/crise-overview.png) — Page scénario de crise avec le score de résistance, les sliders de paramétrage et le détail par axe

---

## Choisir un scénario prédéfini

L'outil propose des scénarios basés sur des crises historiques :

| Scénario | Chute marchés | Référence |
|----------|--------------|-----------|
| Crise modérée | −20 % | Correction normale |
| Crise 2020 (Covid) | −34 % | Mars 2020 |
| Crise 2008 | −57 % | Subprimes |
| Crise dot-com | −49 % | 2000-2002 |
| Personnalisé | Libre | — |

> ![Sélecteur de scénario](/docs/outils/crise/crise-scenarios.png) — Boutons de sélection des scénarios prédéfinis avec le résumé de chacun

---

## Paramètres personnalisables

Affinez le scénario avec des paramètres spécifiques à votre situation :

| Paramètre | Description |
|-----------|------------|
| **Baisse des marchés (%)** | Chute appliquée à vos positions Bourse et Crypto |
| **Perte de revenus (mois)** | Durée d'une interruption de revenus (chômage, arrêt maladie) |
| **Dépense imprévue (€)** | Montant d'une urgence (réparation, hospitalisation…) |
| **Réduction dépenses (%)** | Capacité à réduire vos dépenses fixes en urgence |

> ![Sliders de paramétrage](/docs/outils/crise/crise-params.png) — Zone de paramétrage avec les 4 sliders et l'affichage dynamique du scénario simulé

---

## Score de résistance

Le score sur 100 combine plusieurs axes :

| Axe | Ce qui est évalué |
|-----|------------------|
| **Matelas de sécurité** | Couverture en mois de dépenses après le choc |
| **Diversification** | Actifs non impactés par la crise de marché (Livrets, Immo physique) |
| **Flux de revenus** | Revenus alternatifs pendant la période de crise |
| **Endettement** | Capacité à honorer les mensualités sans revenu |
| **Flexibilité** | Dépenses compressibles vs fixes |

> ![Score et radar](/docs/outils/crise/crise-score.png) — Score global en grand, radar par axe et jauge colorée (rouge < 40, orange 40-70, vert > 70)

---

## Résultat chiffré

Après le choc simulé, l'outil affiche :
- **Patrimoine net résiduel** : valeur après la chute des marchés
- **Trésorerie restante** : matelas après la dépense imprévue et les mois sans revenu
- **Durée de survie** : combien de mois vous pouvez tenir sans aucun revenu
- **Point critique** : date estimée à partir de laquelle votre situation devient critique

> ![Résultat chiffré](/docs/outils/crise/crise-resultat.png) — Cartes avec patrimoine résiduel, trésorerie restante et durée de survie

---

## Recommandations

En bas de page, le simulateur génère des recommandations personnalisées selon votre score :
- Score < 40 : constitution urgente d'un matelas de sécurité
- Score 40-70 : diversification ou réduction des dettes recommandée
- Score > 70 : situation solide, axes d'amélioration ciblés

---

## Formules de calcul

Les taux utilisés sont des approximations basées sur des données historiques. Les performances passées ne garantissent pas les performances futures. Cet outil est fourni à titre indicatif.
