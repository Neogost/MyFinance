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
}
