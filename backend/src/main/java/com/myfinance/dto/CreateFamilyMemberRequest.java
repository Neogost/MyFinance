package com.myfinance.dto;

import com.myfinance.domain.FamilyRelationEnum;
import com.myfinance.domain.MatrimonialRegime;
import com.myfinance.domain.UnionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record CreateFamilyMemberRequest(
        @NotBlank String firstName,
        String lastName,
        @NotNull FamilyRelationEnum relation,
        UnionType unionType,
        MatrimonialRegime matrimonialRegime,
        LocalDate birthDate,
        LocalDate deathDate,
        Boolean handicap,
        String notes
) {}
