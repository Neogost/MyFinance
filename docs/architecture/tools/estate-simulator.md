# Simulateur de donation et de succession

> **Statut : 📝 Spécifié, non implémenté**
> Document de spécification pour livraison V1 (donation seule), V2 (succession), V3 (planification 15 ans).

## 1. Objectif

Permettre à l'utilisateur de :
- **V1 — Donation** : simuler une donation entre vifs (en pleine propriété ou démembrée) à un membre de sa famille, calculer l'abattement disponible et les droits restant à payer.
- **V2 — Succession** : simuler la transmission de l'ensemble du patrimoine au décès, avec répartition entre héritiers et calcul des droits de mutation par voie de décès.
- **V3 — Stratégie 15 ans** : planificateur de donations échelonnées pour épuiser optimalement les abattements (renouvelables tous les 15 ans).

L'app a déjà tout le patrimoine valorisé (positions, possessions, dettes) et la `birthDate` de l'utilisateur. Il manque uniquement la cellule familiale et les barèmes fiscaux.

Accessible depuis **Outils → Donation & succession** dans la navigation.

---

## 2. Cadre fiscal — rappel

### 2.1 Abattements (renouvelables tous les 15 ans)

| Lien de parenté | Abattement |
|---|---:|
| Conjoint / partenaire de PACS (donation seulement, succession exonérée) | 80 724 € |
| Enfant (par parent et par enfant) | 100 000 € |
| Petit-enfant | 31 865 € |
| Arrière-petit-enfant | 5 310 € |
| Frère / sœur | 15 932 € |
| Neveu / nièce | 7 967 € |
| Autres / sans lien | 1 594 € |
| **Bonus** : enfant handicapé | +159 325 € |

### 2.2 Barème ligne directe (donation et succession)

Sur la part **après abattement** :

| Tranche | Taux |
|---|---:|
| ≤ 8 072 € | 5 % |
| 8 072 – 12 109 € | 10 % |
| 12 109 – 15 932 € | 15 % |
| 15 932 – 552 324 € | 20 % |
| 552 324 – 902 838 € | 30 % |
| 902 838 – 1 805 677 € | 40 % |
| > 1 805 677 € | 45 % |

### 2.3 Barème entre frères et sœurs

| Tranche | Taux |
|---|---:|
| ≤ 24 430 € | 35 % |
| > 24 430 € | 45 % |

### 2.4 Démembrement temporaire (article 669 CGI)

Lorsque le donateur transmet la **nue-propriété** d'un bien et conserve l'**usufruit**, la valeur fiscale de la nue-propriété dépend de l'âge de l'usufruitier (le donateur) :

| Âge usufruitier | Valeur usufruit | Valeur nue-propriété (taxable) |
|---|---:|---:|
| < 21 ans | 90 % | 10 % |
| 21–30 | 80 % | 20 % |
| 31–40 | 70 % | 30 % |
| 41–50 | 60 % | 40 % |
| 51–60 | 50 % | 50 % |
| **61–70** | 40 % | **60 %** |
| 71–80 | 30 % | 70 % |
| 81–90 | 20 % | 80 % |
| ≥ 91 | 10 % | 90 % |

**Optimisation classique** : donner la nue-propriété d'un bien immobilier vers 50-55 ans → seuls 50 % de sa valeur sont fiscalement transmis, le donateur garde l'usage et perçoit les loyers, et au décès le nu-propriétaire devient plein propriétaire **sans nouveaux droits**.

### 2.5 Spécificités à signaler (mais hors V1)

- **Assurance-vie** hors succession civile mais fiscalité spéciale (article 990 I CGI) : 152 500 € exonérés par bénéficiaire pour les versements avant 70 ans, puis 20 % puis 31,25 %
- **Pacte Dutreil** : exonération 75 % sur transmission d'entreprise familiale sous engagement
- **Présents d'usage** : non taxables si proportionnés au train de vie
- **Don familial de sommes d'argent** (article 790 G CGI) : 31 865 € supplémentaires si donateur < 80 ans et donataire majeur

---

## 3. Données

### 3.1 Données existantes dans MyFinance

- **Patrimoine valorisé** par catégorie : `positions`, `possessions`, `debts`
- **Date de naissance** utilisateur (`User.birthDate`) — pour calcul démembrement
- **Family Group** existant : potentiellement réutilisable mais limité (pas de date de naissance des membres, pas de lien de parenté)

### 3.2 Données à ajouter

Nouvelle entité `FamilyMember` (table `family_members`) :

```java
@Entity @Table(name = "family_members")
public class FamilyMember {
    @Id @GeneratedValue Long id;
    @ManyToOne User user;                  // propriétaire de la fiche
    String firstName;
    String lastName;                        // optionnel
    LocalDate birthDate;                    // optionnel sauf pour démembrement
    LocalDate deathDate;                    // null si vivant
    @Enumerated(EnumType.STRING)
    FamilyRelationEnum relation;            // CONJOINT, ENFANT, PETIT_ENFANT, FRERE_SOEUR, NEVEU_NIECE, AUTRE
    Boolean handicap;                       // pour bonus abattement
    String notes;                           // libre
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}

public enum FamilyRelationEnum {
    CONJOINT,        // marié, PACS — abattement donation 80 724 €
    ENFANT,          // 100 000 €
    PETIT_ENFANT,    // 31 865 €
    ARRIERE_PETIT_ENFANT, // 5 310 €
    FRERE_SOEUR,     // 15 932 €
    NEVEU_NIECE,     // 7 967 €
    AUTRE            // 1 594 €
}
```

⚠ **Ne pas dupliquer** avec `FamilyGroup` qui sert à un autre usage (agrégation de patrimoine entre comptes utilisateurs distincts). Un membre familial ici n'a **pas** forcément un compte sur l'app.

### 3.3 Historique des donations passées

Optionnel V1, fortement recommandé V2 :

```java
@Entity @Table(name = "past_donations")
public class PastDonation {
    @Id @GeneratedValue Long id;
    @ManyToOne User donor;
    @ManyToOne FamilyMember recipient;
    LocalDate donationDate;
    BigDecimal amountEur;
    String label;
}
```

Sert à calculer **l'abattement résiduel** : si l'utilisateur a déjà donné 60k à son fils il y a 5 ans, il ne lui reste que 40k d'abattement libre avant les 15 ans révolus.

---

## 4. Logique de calcul

### 4.1 Service `EstateSimulatorService`

```java
public DonationSimulationResultDto simulateDonation(User donor, DonationSimulationRequest request) {

    FamilyMember recipient = familyMemberRepository.findByIdAndUser(request.recipientId(), donor)
        .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Bénéficiaire introuvable"));

    // 1. Valeur fiscale du bien transmis
    BigDecimal valueTransmitted = request.giftValueEur();
    if (request.dismembered()) {
        // Démembrement : seule la nue-propriété est transmise
        int donorAge = Period.between(donor.getBirthDate(), LocalDate.now()).getYears();
        BigDecimal npRatio = bareme669CGI(donorAge);   // ex : 0.50 si 51-60 ans
        valueTransmitted = valueTransmitted.multiply(npRatio);
    }

    // 2. Abattement disponible (selon lien + donations passées dans les 15 ans)
    BigDecimal abattementBase = abattementFor(recipient.getRelation(), recipient.isHandicap());
    BigDecimal abattementUsed = pastDonationRepository
            .sumByDonorAndRecipientSince(donor, recipient, LocalDate.now().minusYears(15));
    BigDecimal abattementResiduel = abattementBase.subtract(abattementUsed).max(ZERO);

    // 3. Part taxable
    BigDecimal taxable = valueTransmitted.subtract(abattementResiduel).max(ZERO);

    // 4. Droits selon barème (ligne directe ou frères-sœurs ou autres)
    BigDecimal droits = computeDroitsByBareme(taxable, recipient.getRelation());

    return new DonationSimulationResultDto(
        valueTransmitted,
        abattementBase, abattementUsed, abattementResiduel,
        taxable, droits,
        valueTransmitted.subtract(droits) // net reçu par le bénéficiaire
    );
}
```

### 4.2 Calcul du barème par tranches

Identique à l'IRPP : application progressive sur les tranches.

```java
private BigDecimal applyTranches(BigDecimal taxable, List<TrancheParam> tranches) {
    BigDecimal droits = ZERO;
    BigDecimal previousLimit = ZERO;
    for (TrancheParam t : tranches) {
        if (taxable.compareTo(previousLimit) <= 0) break;
        BigDecimal upper = t.limit() != null ? t.limit().min(taxable) : taxable;
        BigDecimal width = upper.subtract(previousLimit);
        droits = droits.add(width.multiply(t.rate()));
        previousLimit = t.limit() != null ? t.limit() : taxable;
    }
    return droits;
}
```

### 4.3 Externalisation des barèmes

```yaml
# backend/src/main/resources/donation-parameters.yml
donation:
  abattements:
    CONJOINT: 80724
    ENFANT: 100000
    PETIT_ENFANT: 31865
    ARRIERE_PETIT_ENFANT: 5310
    FRERE_SOEUR: 15932
    NEVEU_NIECE: 7967
    AUTRE: 1594
    HANDICAP_BONUS: 159325
  bareme-ligne-directe:
    - { limit: 8072,    rate: 0.05 }
    - { limit: 12109,   rate: 0.10 }
    - { limit: 15932,   rate: 0.15 }
    - { limit: 552324,  rate: 0.20 }
    - { limit: 902838,  rate: 0.30 }
    - { limit: 1805677, rate: 0.40 }
    - { limit: null,    rate: 0.45 }
  bareme-freres-soeurs:
    - { limit: 24430, rate: 0.35 }
    - { limit: null,  rate: 0.45 }
  demembrement-669-cgi:
    - { age-max: 20, np-ratio: 0.10 }
    - { age-max: 30, np-ratio: 0.20 }
    - { age-max: 40, np-ratio: 0.30 }
    - { age-max: 50, np-ratio: 0.40 }
    - { age-max: 60, np-ratio: 0.50 }
    - { age-max: 70, np-ratio: 0.60 }
    - { age-max: 80, np-ratio: 0.70 }
    - { age-max: 90, np-ratio: 0.80 }
    - { age-max: 999, np-ratio: 0.90 }
```

Lu par `@ConfigurationProperties` dans `DonationParameters.java`. Réforme fiscale fréquente sur ce sujet → critique d'externaliser.

---

## 5. DTOs

```java
public record DonationSimulationRequest(
    @NotNull Long recipientId,
    @NotNull @Positive BigDecimal giftValueEur,
    @NotNull String giftLabel,            // "Appartement Lyon" ou "Espèces"
    Boolean dismembered                   // null = false (pleine propriété)
) {}

public record DonationSimulationResultDto(
    BigDecimal valueTransmitted,           // après éventuel démembrement
    BigDecimal abattementBase,
    BigDecimal abattementUsed,
    BigDecimal abattementResiduel,
    BigDecimal taxable,
    BigDecimal droits,
    BigDecimal netReceived,
    String warning                         // ex : "Démembrement irrévocable, consulter notaire"
) {}

public record FamilyMemberDto(
    Long id, String firstName, String lastName,
    LocalDate birthDate, LocalDate deathDate,
    FamilyRelationEnum relation, Boolean handicap, String notes
) {}
```

---

## 6. Endpoints API

| Méthode | URL | Auth | Description |
|---|---|---|---|
| `GET` | `/api/family-members` | Authentifié | Liste les membres de la famille |
| `POST` | `/api/family-members` | Authentifié | Ajoute un membre |
| `PUT` | `/api/family-members/{id}` | Authentifié | Modifie un membre |
| `DELETE` | `/api/family-members/{id}` | Authentifié | Supprime un membre |
| `POST` | `/api/estate/donation/simulate` | Authentifié | Simule une donation (sans persistance) |
| `GET` | `/api/estate/past-donations` | Authentifié | (V2) Liste donations passées |
| `POST` | `/api/estate/past-donations` | Authentifié | (V2) Enregistre une donation effectuée |
| `POST` | `/api/estate/succession/simulate` | Authentifié | (V2) Simule la succession à un état figé |

---

## 7. Interface utilisateur

### 7.1 Page principale `EstateSimulatorPage`

Accessible via **Outils → Donation & succession**. 3 onglets :

```
┌──────────────────────────────────────────────────────────┐
│  🏛️  Donation & succession                                │
│  ┌──────────────┬───────────────┬────────────────┐       │
│  │  Donation    │  Succession   │ Stratégie 15 ans│       │
│  │  ═══════════ │               │                 │       │
│  └──────────────┴───────────────┴────────────────┘       │
└──────────────────────────────────────────────────────────┘
```

### 7.2 Onglet "Donation" (V1)

```
┌──────────────────────────────────────────────────────────┐
│  Cellule familiale  [✏ Gérer]                            │
│  • Marie, conjoint, 52 ans                               │
│  • Léo, enfant, 25 ans                                   │
│  • Emma, enfant, 22 ans                                  │
├──────────────────────────────────────────────────────────┤
│  Simulation                                              │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Bénéficiaire    [Léo, enfant       ▾]              │  │
│  │ Bien transmis   [● Position    ○ Catégorie ○ Libre] │ │
│  │                  [Appartement Lyon — 320 000 € ▾]  │  │
│  │ Mode            [● Pleine propriété                 │  │
│  │                  ○ Démembrement (NP seule)         ] │  │
│  │                                                    │  │
│  │ [Simuler]                                          │  │
│  └────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────┤
│  Résultat                                                │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Valeur transmise            320 000 €              │  │
│  │ Abattement Léo              100 000 €              │  │
│  │   ↳ déjà utilisé              0 €                  │  │
│  │   ↳ disponible              100 000 €              │  │
│  │ Part taxable                220 000 €              │  │
│  │ Droits à payer             ~38 000 €               │  │
│  │ ───────────────────────────────────────            │  │
│  │ Léo recevra net            282 000 €               │  │
│  │                                                    │  │
│  │ 💡 Astuce démembrement : à 55 ans, NP = 50 %.       │  │
│  │    En transmettant en NP, valeur fiscale = 160k€,  │  │
│  │    abattement absorbe tout → 0 € de droits.        │  │
│  │    Léo deviendrait plein propriétaire à votre      │  │
│  │    décès, sans droits supplémentaires.             │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 7.3 Onglet "Succession" (V2)

Affiche : situation patrimoniale figée à la date du jour, ventilation par héritier selon les règles légales (réserve héréditaire + quotité disponible), calcul des droits par héritier.

### 7.4 Onglet "Stratégie 15 ans" (V3)

Frise chronologique avec optimisation automatique : « Donner X €/Y €/Z € à chacun de vos enfants tous les 15 ans + démembrement de l'appart à 55 ans = transmission optimale du patrimoine ».

### 7.5 Modal "Gérer la famille"

Ajout / édition / suppression des membres. Champs : prénom, lien, date de naissance (optionnelle), handicap (toggle), décédé (toggle + date).

---

## 8. Composants frontend

```
frontend/src/components/tools/estate/
├── EstateSimulatorPage.jsx          Page conteneur (3 tabs)
├── DonationTab.jsx                   Onglet V1
├── SuccessionTab.jsx                 Onglet V2
├── StrategyTab.jsx                   Onglet V3
├── FamilyMembersModal.jsx            Gestion famille
├── DonationSimulationForm.jsx        Formulaire de simulation
└── DonationResultCard.jsx            Affichage résultat + tips
```

---

## 9. Cas d'usage typiques

### Cas 1 : donation classique sous abattement
*« Je donne 60 000 € de PEA à mon fils (premier don). »*
→ Abattement 100 000 € absorbe tout. **0 € de droits**, fils reçoit 60 000 €.

### Cas 2 : donation au-dessus de l'abattement
*« Je donne mon appart 300 000 € à mon fils. »*
→ Abattement 100k → taxable 200k → barème 20 % progressive → ~38k€ de droits.

### Cas 3 : optimisation par démembrement
*« Même chose, mais en NP, j'ai 55 ans. »*
→ Valeur fiscale = 150k → abattement 100k → taxable 50k → ~9k€ de droits. **Économie 29k€**.

### Cas 4 : abattement déjà partiellement utilisé
*« J'avais déjà donné 60k il y a 5 ans à mon fils. »*
→ Abattement résiduel = 40k. Pour 60k de don → taxable 20k → droits ~3k€.

### Cas 5 : donation entre frères et sœurs
*« Je donne 50k à ma sœur. »*
→ Abattement 15 932 € → taxable 34 068 € → barème 35 %/45 % → ~14k€ de droits.

### Cas 6 : succession (V2)
*« Je décède aujourd'hui, mon patrimoine = 800k, j'ai un conjoint et 2 enfants. »*
→ Conjoint exonéré (succession), reste à partager entre 2 enfants : abattement 100k chacun, etc.

---

## 10. Tests à prévoir

### Backend (`EstateSimulatorServiceTest`)
- Calcul abattement par lien de parenté (les 7 cas de l'enum)
- Bonus handicap appliqué correctement
- Démembrement : `npRatio` correct selon âge (boundaries 20/21, 30/31, etc.)
- Barème ligne directe : tranches correctes (boundaries 8072, 12109, 15932…)
- Barème frères/sœurs : tranches correctes
- Abattement résiduel : déduit les donations < 15 ans
- Taxable = 0 si abattement absorbe tout

### Backend (`FamilyMemberServiceTest`)
- CRUD avec ownership check (un user ne voit pas les family members d'un autre)
- Validation : prénom obligatoire, relation obligatoire

### Frontend
- Modal famille : ajout / édition / suppression
- Simulation : mise à jour résultat en temps réel
- Conseil démembrement affiché si donateur > 50 ans et bien immobilier > abattement

---

## 11. Évolutions possibles (V4+)

- **Assurance-vie séparée** : modal dédié bénéficiaires + 152 500 € abattement avant 70 ans
- **Pacte Dutreil** : si entreprise dans le patrimoine
- **Donations-partages** : alternative à la succession classique
- **Export PDF** : compte-rendu chiffré pour aller voir un notaire
- **Comparateur scénarios** : 3 stratégies en parallèle (rien faire / donations échelonnées / démembrement total)
- **Notifications anniversaires 15 ans** : « Tu peux re-donner à Léo, le précédent don date d'il y a 15 ans »

---

## 12. Limites et avertissements

- **Disclaimer obligatoire** : « Calculs indicatifs. Toute donation ou succession doit être validée par un notaire. La fiscalité évolue régulièrement (loi de finances annuelle). »
- **Pas de conseil patrimonial automatisé** : l'app présente les chiffres, ne suggère pas (sauf le tip démembrement contextuel)
- **Patrimoine professionnel non géré** : les fonds de commerce, parts de SCI, entreprises ne sont pas dans le scope
- **Législation française uniquement** : pas de support des résidences étrangères, conventions fiscales internationales
