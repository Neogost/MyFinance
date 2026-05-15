package com.myfinance.dto;

import com.myfinance.domain.FamilyRelationEnum;
import com.myfinance.domain.MatrimonialRegime;
import com.myfinance.domain.UnionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record UpdateFamilyMemberRequest(
        @NotBlank @Size(max = 100) String firstName,
        @Size(max = 100) String lastName,
        @NotNull FamilyRelationEnum relation,
        UnionType unionType,
        MatrimonialRegime matrimonialRegime,
        LocalDate birthDate,
        LocalDate deathDate,
        Boolean handicap,
        @Size(max = 2000) String notes
) {}
