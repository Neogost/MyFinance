# Simulateur d'impôts

Le simulateur calcule votre **impôt sur le revenu (IRPP)** à partir de votre situation fiscale complète.

## Prérequis

Pour utiliser le simulateur, votre **profil fiscal** doit être renseigné dans **Mon profil** :
- Nombre de parts fiscales (quotient familial)
- Option d'abattement (forfaitaire 10 % ou frais réels)

## Fonctionnement

Le simulateur agrège automatiquement :
1. **Revenus salariaux** : salaire brut du contrat actif (ou d'une révision salariale sélectionnée)
2. **Primes** : primes annuelles et exceptionnelles déclarées sur le contrat
3. **Revenus complémentaires** : revenus sélectionnés (LOCATIF, DIVIDENDE, AUTRE)
4. **Astreintes / gardes** : montant saisi manuellement dans le simulateur

> ![Formulaire de simulation](/docs/outils/tax-simulator-form.png) — Interface du simulateur avec les sélecteurs de source salariale et de revenus complémentaires

## Résultat

Le simulateur affiche :
- **Revenu fiscal de référence** (RFR)
- **Impôt brut** avant décotes
- **Décotes** appliquées le cas échéant
- **Impôt net** à payer
- **Taux marginal d'imposition** (TMI)
- **Taux moyen d'imposition**

> ![Resultat de simulation](/docs/outils/tax-simulator-result.png) — Résultat de la simulation avec le détail par tranche et les indicateurs de taux

## Barème IRPP

Le calcul utilise le barème progressif en vigueur. Les tranches et taux sont externalisés dans la configuration (fichier `tax-parameters.yml`) pour une mise à jour annuelle facilitée.

## Mode Projection contrat

Lorsque le simulateur est utilisé en mode "Projection contrat", il utilise automatiquement la **révision salariale active** si elle existe (date d'effet ≤ aujourd'hui), garantissant un calcul cohérent avec les projections de la page Salariat.
