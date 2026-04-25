# Gérer ses positions

Une **position** représente un investissement ou un compte : portefeuille boursier, compte crypto, livret d'épargne, bien immobilier, etc.

## Catégories de positions

| Catégorie | Exemples | Suivi |
|-----------|----------|-------|
| BOURSE | Actions, ETF, OPCVM, obligations | Par unités × prix instrument |
| CRYPTO | Bitcoin, Ethereum, altcoins | Par unités × prix instrument |
| LIVRET | Livret A, LDDS, PEL, CEL | Par solde déclaré |
| LIQUIDITE | Compte courant, épargne libre | Par solde mis à jour manuellement |
| IMMO_PAPIER | Part d'une SCPI, Crownfunding immobilier | Par valeur estimée déclarée |
| IMMO_PHYSIQUE | Résidence principale, investissement locatif | Par valeur estimée déclarée |

## Enveloppes fiscales

Chaque position est rattachée à une enveloppe fiscale :

- **PEA** — Plan d'Épargne en Actions
- **CTO** — Compte-Titres Ordinaire
- **PEE / PERCO** — Épargne salariale
- **ASSURANCE_VIE**
- **PER** — Plan d'Épargne Retraite
- **LIVRET** — Livret réglementé
- **FLAT TAX** - Compte crypto
- **AUTRE**

## Créer une position

1. Accédez à la page **Patrimoine**
2. Cliquez sur **Nouvelle position**
3. **Étape 1** : choisissez la catégorie du type de position que vous voulez saisir (Bourse, Crypto, Livret...)
4. **Étape 2** : renseignez les détails selon la catégorie (instrument pour BOURSE/CRYPTO, valeur estimée pour IMMO…)

> ![Formulaire de position, Etape 1](public/docs/patrimoine/position-form-step1.png) — Formulaire étape 1 : sélection de la catégorie et de l'enveloppe fiscale

> ![Formulaire de position, Etape 2](public/docs/patrimoine/position-form-step2.png) — Formulaire étape 2 : détails selon la catégorie (ex : recherche d'instrument BOURSE par ISIN)


Une fois créé, la position est prête pour recevoir des versements via un "Mouvement" ou une actualisation du solde.

## Associer un instrument (BOURSE / CRYPTO)

Pour une position BOURSE ou CRYPTO, vous devez associer un **instrument financier** (action, ETF, crypto…). Vous pouvez recherchez par ISIN (BOURSE), par libellé de l'indice ou ticker (CRYPTO). Si l'instrument n'existe pas encore, vous pouvez le créer directement depuis le formulaire. Pour cela, nous vous invitons à retrouver sur votre plateforme associé à la position que vous saisissez l'ISBN ou le ticker. Et de saisir le libellé correspondant. Sans cet identifiant "technique", l'application ne pourra pas mettre à jours le court de cette position automatiquement.
En cas de méconnaissance, faite comme vous pouvez, un administrateur essaiera de régularisé cela.

> ![Formulaire de position, Etape 2](public/docs/patrimoine/instrument-search.png) — Recherche d'instrument avec résultats et option de création à la volée

## Vue d'ensemble du patrimoine

La page Patrimoine affiche :

- La **valeur totale brute du patrimoine**, le montant investi et la plus-value globale
- La **valeur total financier du patrimoine** Le montant investi et la plus-value du patrimoine dans l'ensemble des catégories excepté les investissements "Non liquide" que sont les positions Immobilier Physique et Papier.
- La **valeur total investi** sommes des mouvements d'Achat ou Dépot sur les positions prises soustrait aux mouvements de Vente ou de Retrait
- La **valeur des plus-values global**, la somme des plus-values percu sur les différentes position au travers des mouvements d'AirDrop, d'Intéret, d'Abondement et de Dividende
- La **valeur des plus-values YTD**, la sommes des plus-values depuis le début d'années - YTD - s'il y a un historique sur l'année précédente.
- La **projection du patrimoine**, la valeur projeter des plus-values sur l'année en cours au proratat des positions prise et des performances moyennes des différentes positions. Cette valeur est à titre indicatif. 

L'entête de la page propose également un résumé des investissements et plus-values par type de position. 

L'ensemble de ces différents indicateur mettent a disposition le détail de leurs calculs dans leurs tooltips associés.

> ![Page patrimoine - Mode Liste](public/docs/patrimoine/patrimoine-page.png) — Page patrimoine complète avec le résumé par catégorie et les indicateurs globaux

## Fermer une position

Une position peut être **fermée** (solde à zéro, plus d'ordres possibles) sans être supprimée. Elle reste consultable dans l'historique et mais sera toujours prisent en compte dans vos investissements et plus-values.

## Suprimer une position

Une position peut être **supprimée** (suppression total) via le bouton "x" sur chaque position.

## Lier une position immobilière à un crédit

Une position IMMO_PHYSIQUE peut être associée à une dette (crédit immobilier). Ce crédit est à saisir et associé dans l'onglet **dettes** de l'application. Si un crédit est associé a une position IMMO_PHYSIQUE, il est possible de consulter l'avancement du remboursement et de la valeur du bien dans votre patrimoine en mode d'affiche "Grille".

> ![Page patrimoine - Mode Liste](public/docs/patrimoine/position-card-immo.png) — Carte d'une position IMMO_PHYSIQUE avec le bloc rouge "Crédit lié" et la valeur nette calculée

## Gestion de la stratégie

Dans l'entête de la page Patrimoine, il est possible de saisir une stratégie et objectif patrimonial. Ces informations permettent de faire apparaitre, si saisie, une ligne d'avancement dans la catégorie associé. Cela permet aussi de généré, sur le dashboard, le widget de suivi des objectifs patrimoniaux.


> ![Formulaire de saisie des Objectifs](public/docs/patrimoine/target.png) — Formulaire de saisie des objectis patrimoniaux