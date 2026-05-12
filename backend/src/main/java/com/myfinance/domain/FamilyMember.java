package com.myfinance.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "family_members")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FamilyMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String firstName;

    private String lastName;

    private LocalDate birthDate;

    private LocalDate deathDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FamilyRelationEnum relation;

    /** Type d'union — uniquement pour CONJOINT. null sinon. */
    @Enumerated(EnumType.STRING)
    private UnionType unionType;

    /** Régime matrimonial — uniquement pour CONJOINT + MARIAGE. null sinon. */
    @Enumerated(EnumType.STRING)
    private MatrimonialRegime matrimonialRegime;

    @Builder.Default
    private Boolean handicap = false;

    @Column(length = 500)
    private String notes;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
