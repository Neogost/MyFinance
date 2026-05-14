# Tableau de bord

Le tableau de bord est la page d'accueil de MyFinance. Il centralise votre situation financière complète en un coup d'œil, avec des widgets personnalisables adaptés à vos priorités.

> ![Vue générale du tableau de bord](/docs/tableau-de-bord/dashboard-overview.png) — Vue d'ensemble du tableau de bord avec plusieurs widgets actifs : patrimoine, FIRE, scoring, dettes

## Personnalisation

Cliquez sur l'icône **⚙️** en haut à droite du tableau de bord pour ouvrir le panneau de personnalisation. Vous pouvez activer ou désactiver chaque widget indépendamment et les réordonner selon vos préférences.

> ![Panneau de personnalisation](/docs/tableau-de-bord/dashboard-customize.png) — Panneau de personnalisation avec les toggles de chaque widget et le bouton de réinitialisation

Les choix sont sauvegardés automatiquement dans votre profil.

---

## Widgets disponibles

### Évolution du patrimoine

Graphique en aires affichant l'évolution de votre patrimoine net au fil du temps, par catégorie d'actifs (Bourse, Immobilier, Crypto, Livrets, Liquidités).

- Basé sur vos **relevés de patrimoine** (snapshots)
- Période sélectionnable (3 mois, 6 mois, 1 an, tout)
- Survol d'un point → détail par catégorie

> ![Widget évolution patrimoine](/docs/tableau-de-bord/widget-patrimoine.png) — Graphique en aires colorées avec légende et sélecteur de période

---

### FIRE — Indépendance financière

Affiche votre progression vers l'indépendance financière selon la règle des 4 % :

- **Revenus passifs actuels** : ce que votre patrimoine génère chaque mois sans travail
- **Objectif FIRE** : dépenses annuelles × 25
- **Barre de progression** : pourcentage atteint
- **Années estimées** : projection basée sur votre capacité d'épargne et le rendement pondéré

> ![Widget FIRE](/docs/tableau-de-bord/widget-fire.png) — Bloc FIRE avec barre de progression, revenus passifs et estimation du nombre d'années restantes

---

### Scoring patrimonial

Score global sur **105 points** réparti sur 6 axes :

| Axe | Ce qui est évalué |
|-----|------------------|
| Matelas de sécurité | Couverture en mois de dépenses |
| Diversification | Répartition entre catégories d'actifs |
| Endettement | Ratio dette / patrimoine |
| Épargne | Taux d'épargne mensuel |
| Revenus passifs | Autonomie sans salaire |
| Investissement | Régularité et volume |

> ![Widget scoring](/docs/tableau-de-bord/widget-scoring.png) — Radar hexagonal du scoring avec le niveau global (FRAGILE, STABLE, SOLIDE, OPTIMISÉ) et le détail par axe

---

### Dettes

Vue synthétique de tous vos crédits en cours :

- Ratio d'endettement global (seuil réglementaire 35 %)
- Date estimée de libération totale
- Progression par type de crédit (immobilier, auto, perso)
- Capital restant total

> ![Widget dettes](/docs/tableau-de-bord/widget-dettes.png) — Widget dettes avec le ratio d'endettement, la date de fin et les barres de progression par crédit

---

### Cash flow — Sankey

Diagramme de flux reliant vos **revenus → dépenses → épargne**. Chaque flèche est proportionnelle au montant.

> ![Widget Sankey](/docs/tableau-de-bord/widget-sankey.png) — Diagramme Sankey avec les flux de revenus, les catégories de dépenses et le solde d'épargne

---

### Prochains prélèvements

Liste des dépenses récurrentes qui seront prélevées dans les 7 prochains jours, avec le montant et la date exacte.

> ![Widget prélèvements](/docs/tableau-de-bord/widget-prelevements.png) — Liste des 3 à 5 prochains prélèvements avec montant et date

---

### TWR YTD — Performance annuelle

Affiche le rendement annualisé de votre portefeuille depuis le 1er janvier, calculé selon la méthode **Time-Weighted Return** (indépendante des flux d'entrée/sortie).

> ![Widget TWR](/docs/tableau-de-bord/widget-twr.png) — Widget TWR avec le pourcentage de performance et la comparaison avec l'indice de référence

---

### Objectifs patrimoniaux

Radar affichant l'avancement par catégorie d'actifs par rapport aux objectifs que vous avez définis dans **Stratégie & Objectifs**.

> ![Widget objectifs](/docs/tableau-de-bord/widget-objectifs.png) — Graphique radar avec les cibles en pointillés et la répartition actuelle en plein

