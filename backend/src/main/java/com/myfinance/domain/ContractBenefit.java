package com.myfinance.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "contract_benefits")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContractBenefit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id", nullable = false)
    private SalaryContract contract;

    // Libellé de l'avantage (ex : Frais de télétravail, Forfait téléphone…)
    @Column(nullable = false)
    private String label;

    // Montant mensuel en euros
    @Column(nullable = false)
    private Float monthlyAmount;
}
