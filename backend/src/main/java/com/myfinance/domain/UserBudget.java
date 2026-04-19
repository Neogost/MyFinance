package com.myfinance.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "user_budgets",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "category"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserBudget {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ExpenseCategoryEnum category;

    @Column(nullable = false)
    private Float monthlyLimit;
}
