# Relevés de patrimoine

Un **relevé** (snapshot) est une photographie datée de votre patrimoine. Il enregistre la valeur de chaque position à un instant donné et permet de tracer l'évolution dans le temps.

> Sur une vision long terme, nous avons décider de ne faire qu'un relevé mensuel au début de mois. Cela permet d'avoir une vision global, mois par mois au fur et a mesure des années et controler l'expension de la base de données. Celui-ci est réalisé automatiquement par le systeme au premier du moins. Un administrateur peux cependant déclancher manuellement cette photo.

## Pourquoi faire des relevés ?

- Alimenter le **graphique d'évolution** du tableau de bord
- Calculer la **plus-value YTD** (depuis le 1er janvier de l'année en cours)
- Suivre votre progression vers l'objectif FIRE
- Disposer d'un historique pour la déclaration de patrimoine

## Recalculer un relevé

Un relevé existant peut être **recalculé** avec les prix actuels des instruments, en conservant sa date d'origine. Utile si les cours ont été mis à jour après la prise du relevé.

> ![Recalculer une snapshot](public/docs/patrimoine/snapshot-recalculate.png) — Bouton recalculer sur un relevé existant dans le panneau, exclusivement Administrateur

## Gestion admin des relevés

Les administrateurs ont accès à une page dédiée (**Administration → Gestion des relevés**) qui permet de créer, modifier ou supprimer manuellement des relevés pour n'importe quel utilisateur.

> ![Page admin gestion des relevés](public/docs/patrimoine/admin-snapshot-page.png) — Page admin de gestion des relevés avec le sélecteur d'utilisateur et le formulaire de saisie manuelle

> Si des utilisateurs sont intéressés, cette fonctionnalités pourrait être ajouter sur la vue patrimoine individuel.

## Graphique d'évolution

Le graphique du tableau de bord affiche les relevés sous forme d'**aires empilées par catégorie** (IMMO_PHYSIQUE, BOURSE, CRYPTO, LIVRET…). Un point "Aujourd'hui" est ajouté automatiquement depuis les positions actives.

> ![Tableau de bord historisant le patrimoine](public/docs/patrimoine/evolution-chart.png) — Graphique d'évolution en aires empilées avec le point live "Aujourd'hui" et le toggle valeur absolue / répartition %
