# Gérer ses positions

Une **position** représente un investissement ou un compte : portefeuille boursier, compte crypto, livret d'épargne, bien immobilier, etc.

## Catégories de positions

| Catégorie | Exemples | Suivi |
|-----------|----------|-------|
| BOURSE | Actions, ETF, OPCVM, obligations | Par unités × prix instrument |
| CRYPTO | Bitcoin, Ethereum, altcoins | Par unités × prix instrument |
| LIVRET | Livret A, LDDS, PEL, CEL | Par solde déclaré |
| ASSURANCE_VIE | Fonds euros, UC | Par solde déclaré |
| LIQUIDITE | Compte courant, épargne libre | Par solde mis à jour manuellement |
| IMMO_PHYSIQUE | Résidence principale, investissement locatif | Par valeur estimée déclarée |
| AUTRE | SCPI, private equity, prêts… | Par solde déclaré |

## Enveloppes fiscales

Chaque position est rattachée à une enveloppe fiscale :

- **PEA** — Plan d'Épargne en Actions
- **CTO** — Compte-Titres Ordinaire
- **PEE / PERCO** — Épargne salariale
- **ASSURANCE_VIE**
- **PER** — Plan d'Épargne Retraite
- **CRYPTO** — Compte crypto
- **LIVRET** — Livret réglementé
- **AUTRE**

## Créer une position

1. Accédez à la page **Patrimoine**
2. Cliquez sur **Nouvelle position**
3. **Étape 1** : choisissez la catégorie, l'enveloppe fiscale et le type de propriété (personnel, joint, SCI…)
4. **Étape 2** : renseignez les détails selon la catégorie (instrument pour BOURSE/CRYPTO, valeur estimée pour IMMO…)

> 📷 `public/docs/patrimoine/position-form-step1.png` — Formulaire étape 1 : sélection de la catégorie et de l'enveloppe fiscale

> 📷 `public/docs/patrimoine/position-form-step2.png` — Formulaire étape 2 : détails selon la catégorie (ex : recherche d'instrument BOURSE par ISIN)

## Associer un instrument (BOURSE / CRYPTO)

Pour une position BOURSE ou CRYPTO, vous devez associer un **instrument financier** (action, ETF, crypto…). Recherchez par ISIN (BOURSE) ou ticker (CRYPTO). Si l'instrument n'existe pas encore, vous pouvez le créer directement depuis le formulaire.

> 📷 `public/docs/patrimoine/instrument-search.png` — Recherche d'instrument avec résultats et option de création à la volée

## Vue d'ensemble du patrimoine

La page Patrimoine affiche :

- La **valeur totale brute**, le montant investi et la plus-value globale
- La **plus-value YTD** (depuis le 1er janvier) si un relevé antérieur à l'année en cours existe
- Un **positionnement INSEE** par décile selon votre tranche d'âge
- Un résumé **par catégorie** avec barre de progression vers votre objectif

> 📷 `public/docs/patrimoine/patrimoine-page.png` — Page patrimoine complète avec le résumé par catégorie et les indicateurs globaux

## Fermer une position

Une position peut être **fermée** (solde à zéro, plus d'ordres possibles) sans être supprimée. Elle reste consultable dans l'historique et n'apparaît plus dans les calculs actifs.

## Lier une position immobilière à un crédit

Une position IMMO_PHYSIQUE peut être associée à une dette (crédit immobilier). Dans ce cas, la carte de position affiche la **valeur nette** = valeur estimée − capital restant dû.

> 📷 `public/docs/patrimoine/position-card-immo.png` — Carte d'une position IMMO_PHYSIQUE avec le bloc rouge "Crédit lié" et la valeur nette calculée
