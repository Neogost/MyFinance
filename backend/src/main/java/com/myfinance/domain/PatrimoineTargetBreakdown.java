package com.myfinance.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "patrimoine_target_breakdowns",
       uniqueConstraints = @UniqueConstraint(
               columnNames = {"patrimoine_target_id", "dimension", "breakdown_key"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatrimoineTargetBreakdown {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patrimoine_target_id", nullable = false)
    private PatrimoineTarget target;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BreakdownDimension dimension;

    @Column(name = "breakdown_key", nullable = false)
    private String breakdownKey;

    @Column(name = "target_percentage", nullable = false, precision = 5, scale = 2)
    private BigDecimal targetPercentage;
}
