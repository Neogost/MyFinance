package com.myfinance.dto;

import com.myfinance.domain.FamilyGroup;
import com.myfinance.domain.FamilyGroupInvitation;
import com.myfinance.domain.User;

import java.time.LocalDateTime;
import java.util.List;

public record FamilyGroupDto(
        Long id,
        String name,
        FamilyMemberDto owner,
        List<FamilyMemberDto> members,
        List<FamilyGroupInvitationDto> invitations,
        LocalDateTime createdAt
) {
    public static FamilyGroupDto from(FamilyGroup group, List<User> members, List<FamilyGroupInvitation> invitations) {
        return new FamilyGroupDto(
                group.getId(),
                group.getName(),
                FamilyMemberDto.from(group.getOwner()),
                members.stream().map(FamilyMemberDto::from).toList(),
                invitations.stream().map(FamilyGroupInvitationDto::from).toList(),
                group.getCreatedAt()
        );
    }
}
