package com.myfinance.dto;

import com.myfinance.domain.FamilyMember;
import com.myfinance.domain.FamilyRelationEnum;
import com.myfinance.domain.MatrimonialRegime;
import com.myfinance.domain.UnionType;

import java.time.LocalDate;

public record EstateMemberDto(
        Long id,
        String firstName,
        String lastName,
        LocalDate birthDate,
        LocalDate deathDate,
        FamilyRelationEnum relation,
        UnionType unionType,                 // null sauf CONJOINT
        MatrimonialRegime matrimonialRegime, // null sauf MARIAGE
        Boolean handicap,
        String notes
) {
    public static EstateMemberDto from(FamilyMember m) {
        return new EstateMemberDto(
                m.getId(), m.getFirstName(), m.getLastName(),
                m.getBirthDate(), m.getDeathDate(),
                m.getRelation(), m.getUnionType(), m.getMatrimonialRegime(),
                m.getHandicap(), m.getNotes()
        );
    }
}
