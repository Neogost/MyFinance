package com.myfinance.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "patrimoine_kpi_targets",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "kpi_type"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatrimoineKpiTarget {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "kpi_type", nullable = false)
    private KpiType kpiType;

    /** Valeur cible en % (ex : 5.0 pour 5 %). */
    @Column(nullable = false)
    private Double targetValue;
}
