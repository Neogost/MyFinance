package com.myfinance.service;

import com.myfinance.domain.*;
import com.myfinance.dto.*;
import com.myfinance.repository.FamilyGroupInvitationRepository;
import com.myfinance.repository.FamilyGroupRepository;
import com.myfinance.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class FamilyGroupService {

    // Bornes anti-spam d'invitations (cf. finding N15). L'owner ne peut avoir qu'un
    // nombre limité d'invitations en attente ET ne peut pas en envoyer trop vite.
    private static final int MAX_PENDING_INVITATIONS_PER_GROUP = 10;
    private static final int MAX_INVITATIONS_PER_GROUP_PER_HOUR = 5;

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

    /**
     * Envoie une invitation à rejoindre le groupe. Comportement anti-énumération (M15) :
     * la réponse est identique quel que soit le résultat — login inexistant, owner s'invitant
     * lui-même, invitation déjà en attente, ou création réelle. L'attaquant ne peut pas tester
     * l'existence d'un login en observant le retour. Les conflits sont logués côté serveur
     * uniquement (admin peut investiguer).
     *
     * Le retour est void — l'owner constate le succès en consultant `findMyGroup` (la nouvelle
     * invitation apparaît dans la liste si elle a été créée).
     */
    @Transactional
    public void sendInvitation(SendInvitationRequest request, User owner) {
        FamilyGroup group = requireOwner(owner);

        // Borne dure : 10 invitations PENDING simultanées par groupe (UX cible saturée).
        // Le check ne dépend pas du target → pas de fuite d'info via anti-énumération M15.
        if (invitationRepository.countByGroupAndStatus(group, InvitationStatus.PENDING)
                >= MAX_PENDING_INVITATIONS_PER_GROUP) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Limite d'invitations en attente atteinte (" + MAX_PENDING_INVITATIONS_PER_GROUP
                  + "). Attendez qu'elles soient acceptées/refusées avant d'en envoyer d'autres.");
        }

        // Rate-limit horaire pour empêcher un owner malveillant d'inonder.
        long recent = invitationRepository.countByGroupAndCreatedAtAfter(group,
                LocalDateTime.now().minusHours(1));
        if (recent >= MAX_INVITATIONS_PER_GROUP_PER_HOUR) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Trop d'invitations envoyées dans la dernière heure — réessayez plus tard.");
        }

        Optional<User> targetOpt = userRepository.findByLogin(request.login());
        if (targetOpt.isEmpty()) {
            log.warn("[system] Invitation ignorée — login inexistant: {}", request.login());
            return;
        }
        User target = targetOpt.get();

        if (target.getId().equals(owner.getId())) {
            log.warn("[system] Invitation ignorée — owner #{} tente de s'inviter lui-même", owner.getId());
            return;
        }

        if (invitationRepository.findByGroupAndInvitedUserAndStatus(group, target, InvitationStatus.PENDING).isPresent()) {
            log.warn("[system] Invitation ignorée — déjà PENDING pour user #{} dans groupe #{}",
                    target.getId(), group.getId());
            return;
        }

        FamilyGroupInvitation invitation = FamilyGroupInvitation.builder()
                .group(group)
                .invitedUser(target)
                .status(InvitationStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build();
        invitationRepository.save(invitation);
        log.info("[system] Invitation envoyée — group #{}, target #{}", group.getId(), target.getId());
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
