# Mon profil

La page profil regroupe toutes les informations personnelles et préférences utilisées par les simulateurs et les calculs de l'application. **Un profil complet est indispensable pour obtenir des simulations précises.**

> ![Page profil complète](/docs/profil/profil-overview.png) — Page Mon profil avec l'ensemble des panneaux : mot de passe, hauts faits, informations personnelles, fiscal, regroupement familial, matelas de sécurité, suivi et suppression

---

## Changer le mot de passe

En haut de page, le formulaire de changement de mot de passe nécessite la saisie de votre mot de passe actuel puis du nouveau mot de passe (confirmé deux fois).

### Règles obligatoires

Le nouveau mot de passe doit respecter **les 5 critères suivants** (vérifiés en temps réel sous le champ) :

| Critère | Exemple |
|---------|---------|
| 12 caractères minimum | — |
| Au moins une majuscule | `A`–`Z` |
| Au moins une minuscule | `a`–`z` |
| Au moins un chiffre | `0`–`9` |
| Au moins un caractère spécial | `!@#$%^&*` |

**Exemple de mot de passe valide :** `MonBudget2025!`

> 💡 **Recommandation :** utilisez une phrase de passe plutôt qu'un mot unique — plus longue, elle est à la fois plus sûre et plus facile à retenir. Exemple : `Café&Investissement42`

> ![Formulaire mot de passe](/docs/profil/profil-password.png) — Formulaire de changement avec les indicateurs de règles (✓ vert / ○ gris) qui s'activent en temps réel pendant la saisie

---

## Hauts faits

Le panneau **Hauts faits** affiche votre progression dans les 67 badges disponibles (répartis en catégories : patrimoine, épargne, discipline, milestones…). Les badges débloqués apparaissent en couleur, les badges verrouillés en gris. Certains badges secrets restent masqués jusqu'à leur déblocage.

> ![Panneau hauts faits](/docs/profil/profil-achievements.png) — Grille des hauts faits avec les badges débloqués en couleur et les badges verrouillés en gris

---

## Informations personnelles

Ces données permettent à plusieurs outils de personnaliser leurs calculs et leurs rapports.

| Champ | Utilisé par |
|-------|------------|
| **Prénom et Nom** | Navigation (en-tête), Simulateur d'emprunt (emprunteur), Déclaration de patrimoine |
| **Date de naissance** | Déciles INSEE (positionnement par âge), Simulateur retraite, Stratégie 15 ans |
| **Poste actuel** | Déclaration de patrimoine (section identité) |
| **Commune de naissance** | Déclaration de patrimoine |
| **Code postal de naissance** | Déclaration de patrimoine |

> ![Informations personnelles](/docs/profil/profil-personnel.png) — Section informations personnelles avec tous les champs et leurs infobulles explicatives

---

## Profil fiscal

| Champ | Description |
|-------|------------|
| **Nombre de parts fiscales** | Quotient familial (1 part = célibataire, 2 = couple, +0,5 par enfant à charge) |
| **Type d'abattement** | Forfaitaire 10 % ou Frais réels (si vous déclarez vos frais professionnels réels) |
| **Frais réels (€)** | Montant annuel, si l'option frais réels est sélectionnée |

> ✅ Ces données sont utilisées dans **3 endroits** de l'application : le **Simulateur des impôts** (calcul de l'IRPP), la colonne **Net d'impôt** des projections salariales (contrats de travail), et le **Bilan financier** (impôt mensuel estimé dans les dépenses). Sans ce panneau renseigné, ces trois calculs affichent `—` à la place de l'impôt.

> ![Panneau fiscal](/docs/profil/profil-fiscal.png) — Panneau fiscal avec le sélecteur de parts, le choix du type d'abattement et le champ frais réels conditionnel

---

## Regroupement familial

Le regroupement familial permet de partager certaines données financières avec un partenaire ou un proche (conjoint, parent…). Il est utilisé dans le **simulateur d'emprunt** (co-emprunteur) et dans la **vue patrimoine familial** du tableau de bord.

### Créer un groupe

Cliquez sur **Créer un groupe**, donnez-lui un nom, puis invitez un membre par son identifiant de connexion. L'invité reçoit une notification et doit accepter.

### Rejoindre un groupe

Si vous avez reçu une invitation, elle apparaît dans ce panneau. Vous pouvez l'accepter ou la refuser.

### Quitter ou dissoudre un groupe

- **Membre** : bouton "Quitter le groupe"
- **Propriétaire** : bouton "Dissoudre le groupe" (retire tous les membres)

> ![Panneau regroupement familial](/docs/profil/profil-famille.png) — Panneau avec le statut du groupe, les membres, le formulaire d'invitation et les boutons de gestion

---

## Matelas de sécurité

Définissez le montant cible de votre épargne de précaution. Ce chiffre est utilisé dans le **scoring patrimonial** et le **widget FIRE** du tableau de bord.

Trois modes de calcul sont disponibles :

| Mode | Description |
|------|------------|
| **Mois de dépenses** | Objectif = N × total dépenses récurrentes mensuelles |
| **Mois de salaire** | Objectif = N × salaire net mensuel |
| **Montant fixe** | Objectif saisi directement en euros |

> ![Matelas de sécurité](/docs/profil/profil-matelas.png) — Section matelas avec le sélecteur de mode, le multiplicateur de mois et l'objectif calculé affiché en temps réel

---

## Suivi de l'usage

Vous pouvez activer ou désactiver le suivi de votre navigation dans l'application. Ce suivi est **entièrement anonymisé** — aucune donnée financière n'est collectée.

Ce qui est enregistré si le suivi est activé :

| Type | Détail |
|------|--------|
| Pages visitées | Quelles sections sont consultées |
| Actions effectuées | Créations, modifications, suppressions (sans les valeurs) |
| Boutons cliqués | Ouverture de formulaires, toggles (mode nuit, masquer valeurs…) |
| Formulaires soumis | Mise à jour du profil, changement de mot de passe |

> ![Panneau suivi](/docs/profil/profil-analytics.png) — Toggle de désactivation du suivi avec la liste détaillée de ce qui est collecté

---

## Suppression du compte

⚠️ **Ces actions sont irréversibles.**

Deux options distinctes sont proposées en bas de page :

### Supprimer uniquement mes données

Efface toutes vos données financières (contrats, positions, dépenses, dettes, possessions, snapshots, simulations…) tout en conservant votre compte. Vous repartez d'un profil vierge.

### Supprimer mon compte et mes données

Efface les données **et** supprime définitivement votre compte. Vous serez déconnecté immédiatement et ne pourrez plus vous reconnecter avec cet identifiant.

Les données supprimées incluent notamment : contrats salariaux, revenus complémentaires, dépenses récurrentes, positions patrimoniales, relevés de patrimoine, dettes, possessions, simulations d'emprunt, objectifs patrimoniaux et historique de navigation.

> ![Modal suppression](/docs/profil/profil-delete.png) — Modal de confirmation avec la liste détaillée des données supprimées et la case à cocher obligatoire avant validation
