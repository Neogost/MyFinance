package com.myfinance.dto;

import com.myfinance.domain.BonusTypeEnum;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record CreateContractBonusRequest(
        @NotBlank @Size(max = 200) String label,
        // Montant signé : peut être négatif pour les contrats PUBLIC (retenues IFSE/CIA).
        // Le contrôle « > 0 pour PRIVATE » est fait dans ContractBonusService.
        @NotNull @DecimalMin("-1000000") @DecimalMax("1000000") Float grossAmount,
        @NotNull BonusTypeEnum type,
        LocalDate paymentDate,                  // requis si type = EXCEPTIONNELLE
        @Min(1) @Max(12) Integer paymentMonth,  // requis si type = ANNUELLE
        LocalDate startDate,                    // requis si type = MENSUELLE
        LocalDate endDate                       // optionnel si type = MENSUELLE (null = indéfinie)
) {}
