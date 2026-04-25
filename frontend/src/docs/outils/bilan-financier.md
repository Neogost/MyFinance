# Bilan financier

Le bilan financier est une vue synthétique de votre situation patrimoniale, calquée sur le **compte de résultat** d'une entreprise.

## Structure du bilan

Le bilan est composé de deux colonnes :

### Revenus (gauche)
- Salaire net mensuel actif (net d'impôt ou net imposable)
- Revenus complémentaires par catégorie (LOCATIF, DIVIDENDE, AIDE_SOCIALE, AUTRE)
- Gains mensuels moyens par catégorie de patrimoine (`plus-value annualisée / 12`)

### Dépenses (droite)
- Dépenses récurrentes par catégorie
- Impôt mensuel estimé (`impôt annuel / 12`)

> ![Page bilan](/docs/outils/bilan-financier-page.png) — Page du bilan financier avec les deux colonnes Revenus et Dépenses, le delta R-D et le taux d'épargne

## Indicateurs clés

### Delta Revenus − Dépenses
Le solde mensuel net (Revenus − Dépenses) affiché en **vert** (excédent) ou **rouge** (déficit), avec le **taux d'épargne** en sous-titre.

### Actif / Passif
En bas de page, deux blocs côte à côte récapitulent :
- **Actif** : valeur de toutes les positions actives (hors IMMO_PHYSIQUE)
- **Passif** : valeur des possessions (grandes possessions avec décote) + positions IMMO_PHYSIQUE + capital restant des dettes

### Ratio de couverture patrimoniale
```
Ratio = Total Actif ÷ Dépenses annuelles
```
Exprimé en **années** : combien d'années vos actifs couvrent-ils vos dépenses sans revenu.

> ![Couverture de sécurité](/docs/outils/bilan-couverture.png) — Bloc indigo du ratio de couverture patrimoniale avec le nombre d'années

### Projection FIRE
Basée sur la règle des 4 % :
```
Objectif FIRE = Dépenses annuelles × 25
```
Affiche une barre de progression, les années restantes estimées et le rendement pondéré du patrimoine.

> ![Indicateur d'indépendance financière](/docs/outils/bilan-fire.png) — Bloc violet de la projection FIRE avec la barre de progression et les hypothèses de calcul

## Toggle Mensuel / Annuel

Un toggle en haut de page permet de basculer entre la vue **mensuelle** et la vue **annuelle** (× 12). Les totaux Actif et Passif restent toujours affichés en valeur absolue.

## Autres outils disponibles

- **Simulateur d'intérêts composés** : projection de l'épargne avec intérêts capitalisés
- **Simulateur d'emprunt** : calcul de mensualités, coût total et tableau d'amortissement
- **Déclaration de patrimoine** : synthèse complète exportable en PDF
- **Simulateur de crise** : impact d'un choc de marché sur le patrimoine net
