# Relevés de patrimoine

Un **relevé** (snapshot) est une photographie datée de votre patrimoine. Il enregistre la valeur de chaque position à un instant donné et permet de tracer l'évolution dans le temps.

## Pourquoi faire des relevés ?

- Alimenter le **graphique d'évolution** du tableau de bord
- Calculer la **plus-value YTD** (depuis le 1er janvier de l'année en cours)
- Suivre votre progression vers l'objectif FIRE
- Disposer d'un historique pour la déclaration de patrimoine

## Créer un relevé

Depuis la page **Patrimoine**, cliquez sur **Relevés de patrimoine** (bouton visible uniquement pour les administrateurs).

Deux options :
- **Relevé pour moi** : génère un snapshot de vos positions actives avec leurs valeurs actuelles
- **Relevé pour tous** : génère un snapshot pour l'ensemble des utilisateurs (admin uniquement)

> 📷 `public/docs/patrimoine/snapshot-panel.png` — Panneau de gestion des relevés avec la liste des relevés passés (date, investi, valeur, plus-value)

## Recalculer un relevé

Un relevé existant peut être **recalculé** avec les prix actuels des instruments, en conservant sa date d'origine. Utile si les cours ont été mis à jour après la prise du relevé.

> 📷 `public/docs/patrimoine/snapshot-recalculate.png` — Bouton recalculer sur un relevé existant dans le panneau

## Gestion admin des relevés

Les administrateurs ont accès à une page dédiée (**Administration → Gestion des relevés**) qui permet de créer, modifier ou supprimer manuellement des relevés pour n'importe quel utilisateur.

> 📷 `public/docs/patrimoine/admin-snapshot-page.png` — Page admin de gestion des relevés avec le sélecteur d'utilisateur et le formulaire de saisie manuelle

## Graphique d'évolution

Le graphique du tableau de bord affiche les relevés sous forme d'**aires empilées par catégorie** (IMMO_PHYSIQUE, BOURSE, CRYPTO, LIVRET…). Un point "Aujourd'hui" est ajouté automatiquement depuis les positions actives.

> 📷 `public/docs/patrimoine/evolution-chart.png` — Graphique d'évolution en aires empilées avec le point live "Aujourd'hui" et le toggle valeur absolue / répartition %
