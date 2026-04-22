package com.myfinance.service;

import com.myfinance.domain.*;
import com.myfinance.dto.*;
import com.myfinance.repository.FamilyGroupInvitationRepository;
import com.myfinance.repository.FamilyGroupRepository;
import com.myfinance.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FamilyGroupService {

    private final FamilyGroupRepository familyGroupRepository;
    private final FamilyGroupInvitationRepository invitationRepository;
    private final UserRepository userRepository;
    private final PositionService positionService;

    // ── Lecture ────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public FamilyGroupDto findMyGroup(User user) {
        if (user.getFamilyGroup() == null) return null;
        FamilyGroup group = loadGroup(user);
        return buildDto(group);
    }

    @Transactional(readOnly = true)
    public List<FamilyMemberDto> findMyGroupMembers(User user) {
        if (user.getFamilyGroup() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "L'utilisateur n'appartient à aucun groupe");
        }
        FamilyGroup group = loadGroup(user);
        return userRepository.findByFamilyGroup(group)
                .stream()
                .filter(m -> !m.getId().equals(user.getId()))
                .map(FamilyMemberDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PositionDto> findMemberPositions(Long memberId, User currentUser) {
        if (currentUser.getFamilyGroup() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vous n'appartenez à aucun groupe");
        }
        FamilyGroup group = loadGroup(currentUser);
        User member = userRepository.findById(memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Utilisateur introuvable : " + memberId));
        if (member.getFamilyGroup() == null || !member.getFamilyGroup().getId().equals(group.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Cet utilisateur n'est pas membre de votre groupe");
        }
        return positionService.findAllByUser(member, null, null);
    }

    @Transactional(readOnly = true)
    public List<FamilyGroupInvitationDto> findPendingInvitations(User user) {
        return invitationRepository.findByInvitedUserAndStatus(user, InvitationStatus.PENDING)
                .stream()
                .map(FamilyGroupInvitationDto::from)
                .toList();
    }

    // ── Création du groupe ─────────────────────────────────────

    @Transactional
    public FamilyGroupDto create(CreateFamilyGroupRequest request, User owner) {
        if (owner.getFamilyGroup() != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Vous êtes déjà membre d'un groupe");
        }

        FamilyGroup group = FamilyGroup.builder()
                .name(request.name())
                .owner(owner)
                .createdAt(LocalDateTime.now())
                .build();
        group = familyGroupRepository.save(group);

        owner.setFamilyGroup(group);
        userRepository.save(owner);

        return buildDto(group);
    }

    // ── Renommage ──────────────────────────────────────────────

    @Transactional
    public FamilyGroupDto rename(UpdateFamilyGroupRequest request, User owner) {
        FamilyGroup group = requireOwner(owner);
        group.setName(request.name());
        familyGroupRepository.save(group);
        return buildDto(group);
    }

    // ── Dissolution ────────────────────────────────────────────

    @Transactional
    public void dissolve(User owner) {
        FamilyGroup group = requireOwner(owner);

        // Retirer tous les membres
        List<User> members = userRepository.findByFamilyGroup(group);
        for (User member : members) {
            member.setFamilyGroup(null);
            userRepository.save(member);
        }

        // Supprimer les invitations PENDING
        invitationRepository.deleteByGroup(group);

        familyGroupRepository.delete(group);
    }

    // ── Quitter le groupe ──────────────────────────────────────

    @Transactional
    public void leave(User user) {
        if (user.getFamilyGroup() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Vous n'appartenez à aucun groupe");
        }
        FamilyGroup group = loadGroup(user);
        if (group.getOwner().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Le owner doit dissoudre le groupe plutôt que le quitter");
        }
        user.setFamilyGroup(null);
        userRepository.save(user);
    }

    // ── Retirer un membre ──────────────────────────────────────

    @Transactional
    public void removeMember(Long memberId, User owner) {
        FamilyGroup group = requireOwner(owner);

        User member = userRepository.findById(memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Utilisateur introuvable : " + memberId));

        if (member.getFamilyGroup() == null || !member.getFamilyGroup().getId().equals(group.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Cet utilisateur n'est pas membre de votre groupe");
        }
        if (member.getId().equals(owner.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Le owner ne peut pas se retirer lui-même");
        }

        member.setFamilyGroup(null);
        userRepository.save(member);
    }

    // ── Invitations ────────────────────────────────────────────

    @Transactional
    public FamilyGroupInvitationDto sendInvitation(SendInvitationRequest request, User owner) {
        FamilyGroup group = requireOwner(owner);

        User target = userRepository.findByLogin(request.login())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Utilisateur introuvable : " + request.login()));

        if (target.getId().equals(owner.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Vous ne pouvez pas vous inviter vous-même");
        }

        // Vérifier qu'il n'y a pas déjà une invitation PENDING
        invitationRepository.findByGroupAndInvitedUserAndStatus(group, target, InvitationStatus.PENDING)
                .ifPresent(inv -> { throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Une invitation est déjà en attente pour cet utilisateur"); });

        FamilyGroupInvitation invitation = FamilyGroupInvitation.builder()
                .group(group)
                .invitedUser(target)
                .status(InvitationStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build();

        return FamilyGroupInvitationDto.from(invitationRepository.save(invitation));
    }

    @Transactional
    public FamilyGroupDto acceptInvitation(Long invitationId, User user) {
        FamilyGroupInvitation inv = getInvitationForUser(invitationId, user);

        if (user.getFamilyGroup() != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Vous êtes déjà membre d'un groupe. Quittez-le avant d'en rejoindre un autre.");
        }

        inv.setStatus(InvitationStatus.ACCEPTED);
        inv.setRespondedAt(LocalDateTime.now());
        invitationRepository.save(inv);

        user.setFamilyGroup(inv.getGroup());
        userRepository.save(user);

        return buildDto(inv.getGroup());
    }

    @Transactional
    public void refuseInvitation(Long invitationId, User user) {
        FamilyGroupInvitation inv = getInvitationForUser(invitationId, user);

        inv.setStatus(InvitationStatus.REFUSED);
        inv.setRespondedAt(LocalDateTime.now());
        invitationRepository.save(inv);
    }

    // ── Administration ─────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<FamilyGroupDto> findAll() {
        return familyGroupRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::buildDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public FamilyGroupDto findById(Long id) {
        FamilyGroup group = familyGroupRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Groupe introuvable : " + id));
        return buildDto(group);
    }

    @Transactional
    public void adminDissolve(Long groupId) {
        FamilyGroup group = familyGroupRepository.findById(groupId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Groupe introuvable : " + groupId));

        List<User> members = userRepository.findByFamilyGroup(group);
        for (User member : members) {
            member.setFamilyGroup(null);
            userRepository.save(member);
        }

        invitationRepository.deleteByGroup(group);
        familyGroupRepository.delete(group);
    }

    @Transactional
    public void adminRemoveMember(Long groupId, Long memberId) {
        FamilyGroup group = familyGroupRepository.findById(groupId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Groupe introuvable : " + groupId));

        User member = userRepository.findById(memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Utilisateur introuvable : " + memberId));

        if (member.getFamilyGroup() == null || !member.getFamilyGroup().getId().equals(group.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Cet utilisateur n'est pas membre de ce groupe");
        }

        member.setFamilyGroup(null);
        userRepository.save(member);
    }

    // ── Utilitaires privés ─────────────────────────────────────

    private FamilyGroup requireOwner(User user) {
        if (user.getFamilyGroup() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Vous n'avez pas de groupe");
        }
        FamilyGroup group = loadGroup(user);
        if (!group.getOwner().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Seul le owner peut effectuer cette action");
        }
        return group;
    }

    private FamilyGroup loadGroup(User user) {
        return familyGroupRepository.findById(user.getFamilyGroup().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Groupe introuvable"));
    }

    private FamilyGroupInvitation getInvitationForUser(Long invitationId, User user) {
        FamilyGroupInvitation inv = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Invitation introuvable : " + invitationId));

        if (!inv.getInvitedUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Cette invitation ne vous est pas destinée");
        }
        if (inv.getStatus() != InvitationStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Cette invitation n'est plus en attente");
        }
        return inv;
    }

    private FamilyGroupDto buildDto(FamilyGroup group) {
        List<User> members = userRepository.findByFamilyGroup(group);
        List<FamilyGroupInvitation> invitations = invitationRepository.findByGroupOrderByCreatedAtDesc(group);
        return FamilyGroupDto.from(group, members, invitations);
    }
}
