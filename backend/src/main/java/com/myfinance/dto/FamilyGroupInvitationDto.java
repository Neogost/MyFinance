package com.myfinance.dto;

import com.myfinance.domain.FamilyGroupInvitation;
import com.myfinance.domain.InvitationStatus;

import java.time.LocalDateTime;

public record FamilyGroupInvitationDto(
        Long id,
        Long groupId,
        String groupName,
        String ownerFirstName,
        String ownerLastName,
        FamilyMemberDto invitedUser,
        InvitationStatus status,
        LocalDateTime createdAt,
        LocalDateTime respondedAt
) {
    public static FamilyGroupInvitationDto from(FamilyGroupInvitation inv) {
        return new FamilyGroupInvitationDto(
                inv.getId(),
                inv.getGroup().getId(),
                inv.getGroup().getName(),
                inv.getGroup().getOwner().getFirstName(),
                inv.getGroup().getOwner().getLastName(),
                FamilyMemberDto.from(inv.getInvitedUser()),
                inv.getStatus(),
                inv.getCreatedAt(),
                inv.getRespondedAt()
        );
    }
}
