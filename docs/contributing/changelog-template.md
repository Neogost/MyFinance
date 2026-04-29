# Convention de rédaction du CHANGELOG

Le fichier [`CHANGELOG.md`](../../CHANGELOG.md) à la racine du projet est **affiché aux utilisateurs** via la modal "Notes de version" (accessible depuis le pied de page).

À chaque release, on ajoute une **nouvelle section au sommet** du fichier (la plus récente en premier, la plus ancienne en bas). Les versions précédentes ne sont **jamais modifiées rétroactivement**.

## Structure d'une entrée de version

Chaque version suit le squelette suivant. Les sections sont **toujours dans le même ordre** et celles qui n'ont pas de contenu sont **omises** (pas de "Aucune correction").

```markdown
## vX.Y.Z — JJ mois AAAA — Titre court

> Une phrase d'accroche optionnelle qui résume l'intention de la release.

### ✨ Nouveautés

#### Nom de la fonctionnalité (chemin d'accès dans l'app)

Description courte (1–2 phrases) puis une liste de points clés :
- **Élément en gras** : explication courte
- **Autre élément** : autre explication

### 🎨 Améliorations

- **Titre court** : description en une phrase
- ...

### 🔒 Sécurité

- Description de la mesure de sécurité (cible non-technique)
- ...

### 🐛 Corrections

- Description du bug corrigé (du point de vue utilisateur, pas du diff)
- ...

### 🛠 Sous le capot

- Améliorations techniques visibles uniquement par les développeurs (montée de version, refactor, infra)
- ...

---
```

## Règles de rédaction

| Règle | Exemple |
|-------|---------|
| Dater au format français | `28 avril 2026` |
| Titre court orienté "thème" | `Crédit Lombard, personnalisation et sécurité` |
| Cible utilisateur final | « Suppression d'une dette : ajout de la gestion transactionnelle » plutôt que « `@Transactional` sur DebtService.delete » |
| Mettre en gras les mots-clés | `**Effet de levier** : simule…` |
| Préciser le chemin d'accès | `(Outils → Simulateur de crédit Lombard)` |
| Pas d'emoji dans le corps | Réservé aux titres de section |
| Séparateur `---` entre les versions | Améliore la lisibilité de la modal |

## Section omise

Si une version n'a pas de **Corrections**, on retire entièrement le bloc — pas de section vide ni de mention "rien à signaler".

## Numérotation

On suit le **versionnage sémantique** (cf. CLAUDE.md → "Gestion des versions") :

| Type | Quand | Titre suggéré |
|------|-------|---------------|
| PATCH (`1.4.X`) | Correctifs uniquement | « Corrections diverses », « Stabilité » |
| MINOR (`1.X.0`) | Nouvelle fonctionnalité | Ex : « Crédit Lombard, personnalisation et sécurité » |
| MAJOR (`X.0.0`) | Refonte / rupture | « Nouveau moteur de calcul fiscal » |

## Workflow d'une release

1. Mettre à jour le numéro de version dans `backend/pom.xml`
2. Ajouter la nouvelle section au sommet de `CHANGELOG.md`
3. Commit `chore(release): bump version to X.Y.Z` (inclut pom.xml + CHANGELOG.md)
4. Tagger : `git tag vX.Y.Z` puis `git push origin main && git push origin vX.Y.Z`
5. Déployer via `./scripts/deploy.sh`

La modal "Notes de version" affiche automatiquement le contenu mis à jour.
