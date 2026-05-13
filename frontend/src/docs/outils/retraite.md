# Simulateur retraite

Ce simulateur estime votre pension de retraite (régime général + complémentaire Agirc-Arrco ou CNRACL pour la fonction publique) et calcule le capital d'épargne complémentaire nécessaire pour maintenir votre niveau de vie.

> ![Vue principale du simulateur retraite](/docs/outils/retraite/retraite-overview.png) — Page retraite avec les paramètres à gauche, la projection de pension et le plan d'épargne à droite

---

## Paramètres de base

| Paramètre | Description |
|-----------|------------|
| **Date de naissance** | Détermine votre génération et l'âge légal minimum |
| **Type de contrat** | Privé (Régime général + Agirc-Arrco) ou Public (CNRACL + RAFP) |
| **Âge de départ souhaité** | Peut être différent de l'âge légal (décote ou surcote) |
| **Revenus salariaux** | Importés automatiquement depuis vos contrats actifs |

> ![Panneau paramètres retraite](/docs/outils/retraite/retraite-params.png) — Panneau de gauche avec date de naissance, type de contrat, âge de départ et historique des salaires

---

## Historique de carrière

Renseignez vos salaires bruts passés pour affiner le calcul du **Salaire Annuel Moyen (SAM)** :
- La **retraite de base** est calculée sur les **25 meilleures années** plafonnées au PASS
- Les salaires non saisis sont estimés par rétro-projection linéaire

> ![Historique des salaires](/docs/outils/retraite/retraite-historique.png) — Grille des salaires par année avec les champs de saisie et les années préremplies depuis vos bulletins

---

## Résultats : projection de pension

### Retraite de base

Calculée selon la formule :
```
Pension = SAM × Taux de liquidation × (Trimestres acquis ÷ Trimestres requis)
```

- Taux plein : **50 %** si le nombre de trimestres requis est atteint
- **Décote** : −1,25 % par trimestre manquant (max 25 %)
- **Surcote** : +1,25 % par trimestre supplémentaire

> ![Résultat pension base](/docs/outils/retraite/retraite-pension-base.png) — Carte avec la pension de base calculée, le nombre de trimestres, le taux et la décote ou surcote appliquée

### Retraite complémentaire

Basée sur les **points Agirc-Arrco** accumulés (privé) ou sur la cotisation CNRACL (public).

> ![Résultat pension complémentaire](/docs/outils/retraite/retraite-pension-complementaire.png) — Carte complémentaire avec les points et la pension correspondante

### Total net estimé

Pension brute − prélèvements sociaux (CSG 8,3 % + CRDS + CASA + maladie) = **pension nette mensuelle estimée**.

---

## Plan d'épargne complémentaire

Si votre pension estimée ne couvre pas vos dépenses actuelles, le simulateur calcule le **capital PER nécessaire** pour combler l'écart :

```
Besoin mensuel = Dépenses actuelles − Pension nette
Capital PER = Besoin annuel ÷ Taux de retrait (4 %)
```

> ![Plan d'épargne](/docs/outils/retraite/retraite-epargne.png) — Section plan d'épargne avec l'écart mensuel, le capital PER cible et le versement mensuel recommandé

---

## Sensibilité à l'âge de départ

Un tableau ou graphique compare la pension selon différents âges de départ (62 ans, 63 ans, 64 ans…) pour visualiser l'impact de la décote/surcote.

> ![Tableau de sensibilité](/docs/outils/retraite/retraite-sensibilite.png) — Tableau comparatif avec pension brute, nette et capital PER nécessaire selon l'âge de départ

---

## Notes méthodologiques

- Le simulateur est **indicatif** — votre relevé de carrière sur **info-retraite.fr** fait foi
- Le PASS (Plafond Annuel de la Sécurité Sociale) utilisé est celui en vigueur (2025 : 46 368 €)
- La génération 1968+ a un âge légal de **64 ans** et 172 trimestres requis (réforme 2023)
