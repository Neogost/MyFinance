package com.myfinance.repository;

import com.myfinance.domain.FamilyGroup;
import com.myfinance.domain.FamilyGroupInvitation;
import com.myfinance.domain.InvitationStatus;
import com.myfinance.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface FamilyGroupInvitationRepository extends JpaRepository<FamilyGroupInvitation, Long> {

    List<FamilyGroupInvitation> findByInvitedUserAndStatus(User invitedUser, InvitationStatus status);

    List<FamilyGroupInvitation> findByGroupOrderByCreatedAtDesc(FamilyGroup group);

    Optional<FamilyGroupInvitation> findByGroupAndInvitedUserAndStatus(
            FamilyGroup group, User invitedUser, InvitationStatus status);

    long countByGroupAndStatus(FamilyGroup group, InvitationStatus status);

    long countByGroupAndCreatedAtAfter(FamilyGroup group, LocalDateTime cutoff);

    void deleteByGroup(FamilyGroup group);

    void deleteByInvitedUser(User invitedUser);
}
