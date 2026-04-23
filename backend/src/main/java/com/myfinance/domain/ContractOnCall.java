package com.myfinance.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "contract_on_calls")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContractOnCall {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id", nullable = false)
    private SalaryContract contract;

    // Forfait hebdomadaire en euros
    @Column(nullable = false)
    private Float weeklyFlatRate;

    // Nombre de semaines d'astreinte estimées par an
    @Column(nullable = false)
    private Integer estimatedWeeksPerYear;
}
