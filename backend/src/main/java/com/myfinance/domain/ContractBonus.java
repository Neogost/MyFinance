package com.myfinance.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Table(name = "contract_bonuses")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContractBonus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id", nullable = false)
    private SalaryContract contract;

    // Nom de la prime (ex : Prime Macron, 13ème mois, Prime de vacances)
    @Column(nullable = false)
    private String label;

    // Montant brut en euros
    @Column(nullable = false)
    private Float grossAmount;

    // Type : prime exceptionnelle (versement unique) ou annuelle (versement récurrent)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BonusTypeEnum type;

    // Pour EXCEPTIONNELLE : date de versement (premier jour du mois concerné)
    private LocalDate paymentDate;

    // Pour ANNUELLE : mois de versement (1 = janvier … 12 = décembre)
    private Integer paymentMonth;
}
