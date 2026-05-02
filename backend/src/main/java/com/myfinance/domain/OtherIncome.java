package com.myfinance.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;


@Entity
@Table(name = "other_incomes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OtherIncome {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OtherIncomeTypeEnum type;

    @Column(nullable = false)
    private String label;

    @Column(nullable = false)
    private Float amount;

    @Column(nullable = false)
    private LocalDate date;

    // ── Informations fiscales ──────────────────────────────────
    // Nullable pour compatibilité avec les revenus existants avant cette fonctionnalité.
    // Le simulateur traite null comme isTaxable=true et specificTaxRate=null (barème IRPP).

    private Boolean isTaxable; // Ce revenu est-il imposable ?

    private Float specificTaxRate; // Taux fixe en % (ex : 30.0 pour flat tax) — null = barème IRPP normal

    /** Bien immobilier IMMO_PHYSIQUE associé — LOCATIF uniquement, nullable */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "position_id")
    private Position position;

    // ── Contrat de location (LOCATIF uniquement) ───────────────
    // Si periodStart est renseigné, le revenu est un contrat récurrent.
    // amount = loyer mensuel ; date est automatiquement positionné sur periodStart.

    /** Début du contrat de location — null si saisie ponctuelle */
    private LocalDate periodStart;

    /** Fin du contrat de location — null si contrat en cours */
    private LocalDate periodEnd;

    /** Jour du mois de perception du loyer (1–28) */
    private Integer dayOfMonth;
}
