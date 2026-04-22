package com.myfinance.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "patrimoine_targets",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "category"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatrimoineTarget {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String category;

    @Column(nullable = false)
    private Double targetAmountEur;
}
