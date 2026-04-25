# Gestion des instruments financiers

La page **Administration → Instruments financiers** permet aux administrateurs de gérer le référentiel des instruments financiers (actions, ETF, cryptos…) utilisés dans les positions.

## Accès

Cette section est réservée aux utilisateurs avec le rôle **ADMIN**.

## Tableau des instruments

Le tableau liste tous les instruments avec :
- Nom et ticker/ISIN
- Catégorie (BOURSE ou CRYPTO)
- Cours actuel et date de mise à jour (en orange si > 30 jours)
- Symbole Boursorama (BOURSE) ou CoinGecko ID (CRYPTO) pour la mise à jour automatique
- Indicateur de prix fixe (🔒)

> 📷 `/docs/administration/instruments-table.png` — Tableau des instruments avec les colonnes cours, date de mise à jour, symbole et badge prix fixe

## Créer ou modifier un instrument

1. Cliquez sur **Nouvel instrument** ou sur le bouton **Modifier** d'un instrument existant
2. Renseignez le nom, le ticker, la devise et la catégorie
3. Pour BOURSE : saisissez le **symbole Boursorama** (ex : `1rPMSFT` pour Microsoft)
4. Pour CRYPTO : le CoinGecko ID est résolu automatiquement depuis le ticker
5. Activez **Prix fixe** si le cours ne doit jamais être mis à jour automatiquement (ex : fonds euros, livrets)

> 📷 `/docs/administration/instrument-form.png` — Formulaire de création/édition d'instrument avec le champ symbole Boursorama et la checkbox prix fixe

## Supprimer un instrument

Le bouton **Supprimer** (rouge) affiche une modale de confirmation indiquant le **nombre de mouvements associés** qui seront également supprimés (en cascade avec les positions).

> ⚠ La suppression d'un instrument supprime toutes les positions et tous les mouvements associés. Cette action est irréversible.

> 📷 `/docs/administration/instrument-delete-modal.png` — Modale de confirmation de suppression avec le compteur de mouvements associés

## Mise à jour des cours

Le bouton **Mettre à jour les cours** (visible ADMIN uniquement sur la page Patrimoine) ouvre une modale de mise à jour groupée.

- Les instruments avec cours obsolètes (> 30 j) sont affichés en **orange**
- Les instruments en **prix fixe** (🔒) sont grisés et non modifiables
- La **variation %** est calculée en temps réel lors de la saisie du nouveau cours

> 📷 `/docs/administration/price-update-modal.png` — Modale de mise à jour groupée des cours avec les groupes BOURSE/CRYPTO et les indicateurs de variation

## Mise à jour automatique

Les cours sont mis à jour **automatiquement** le 1er de chaque mois (2h du matin) via :
- **Boursorama** (scraping) pour les instruments BOURSE
- **CoinGecko** pour les cryptos
- **ECB / Frankfurter** pour les taux de change

Un snapshot mensuel est automatiquement généré après chaque mise à jour. Les administrateurs peuvent également déclencher une mise à jour manuelle depuis la page Instruments.

## Taux de change

Le bouton **Taux de change** (ADMIN) permet de consulter et mettre à jour les taux de conversion devise → EUR utilisés pour valoriser les positions en devises étrangères.

> 📷 `/docs/administration/exchange-rates-modal.png` — Modale de gestion des taux de change avec le tableau des devises et les dates de mise à jour
