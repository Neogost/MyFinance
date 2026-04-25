# Revenus salariaux

La section **Salariat** permet de modéliser votre situation salariale complète : contrat, bulletins réels, révisions, primes, avantages en nature et astreintes.

## Contrat salarial

Un seul contrat peut être **actif** à la fois. Il définit le salaire brut de base, le nombre de mois payés (12 ou 13), les jours travaillés par semaine et les heures hebdomadaires.

### Créer un contrat

1. Allez dans **Revenus → Salariat**
2. Cliquez sur **Nouveau contrat**
3. Renseignez l'entreprise, le salaire brut annuel et les paramètres de temps de travail

> ![Formulaire de création](/docs/revenus/salary-form.png) — Formulaire de création d'un contrat salarial avec les champs entreprise, salaire brut et paramètres temps de travail

## Projections calculées

Pour chaque contrat, MyFinance calcule automatiquement 4 niveaux de rémunération en annuel, mensuel, journalier et horaire :

| Niveau | Calcul |
|--------|--------|
| **Super brut** | Brut × 1,45 (coût employeur estimé) |
| **Brut** | Salaire brut déclaré |
| **Net imposable** | Brut - cotisation patronal estimé |
| **Net d'impôt** | Net imposable − impôt estimé (profil fiscal requis) |

> Pour que le **Net d'impôt** soit calculé, votre profil fiscal doit être renseigné (nombre de parts, options d'abattement).

> ![Grille de projection](/docs/revenus/salary-projections.png) — Grille de projections avec les 4 niveaux en colonnes et les périodes (annuel, mensuel, journalier, horaire) en lignes

## Révisions salariales

Enregistrez l'historique de vos augmentations via l'onglet **Révisions**. La révision active (la plus récente avec une date d'effet ≤ aujourd'hui) est utilisée dans les projections et le simulateur d'impôts.

> ![Paneau des révisions](/docs/revenus/salary-revisions.png) — Panneau des révisions salariales avec la liste chronologique et la révision active mise en évidence

## Bulletins de paie réels

L'onglet **Bulletins** permet de saisir les valeurs réelles de chaque fiche de paie (net imposable et net perçu mensuels). Utile pour comparer la réalité aux projections.

> ![Listes des bulletins de paie](/docs/revenus/pay-slips.png) — Liste des bulletins de paie avec les colonnes mois, net imposable et net perçu

## Primes

L'onglet **Primes** gère deux types :
- **EXCEPTIONNELLE** : prime ponctuelle avec date de versement
- **ANNUELLE** : prime récurrente avec mois de versement habituel

Les primes sont intégrées dans le calcul de l'impôt estimé via le simulateur.

> ![Listes des primes](/docs/revenus/bonuses.png) — Panneau des primes avec les types EXCEPTIONNELLE et ANNUELLE

## Avantages en nature

L'onglet **Avantages** permet de saisir les avantages en nature (véhicule de fonction, tickets resto…). Ils sont intégrés dans le net d'impôt mensuel (modèle exonéré — hors assiette fiscale).

## Astreintes et gardes

Les astreintes/gardes peuvent être renseignées, elles sont incluses dans les calculs d'estimation des impots.
