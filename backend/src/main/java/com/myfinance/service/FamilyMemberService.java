package com.myfinance.service;

import com.myfinance.domain.FamilyMember;
import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.User;
import com.myfinance.dto.CreateFamilyMemberRequest;
import com.myfinance.dto.EstateMemberDto;
import com.myfinance.dto.UpdateFamilyMemberRequest;
import com.myfinance.repository.FamilyMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FamilyMemberService {

    private final FamilyMemberRepository familyMemberRepository;

    public List<EstateMemberDto> findAllByUser(User user) {
        return familyMemberRepository.findByUserOrderByRelationAscFirstNameAsc(user)
                .stream()
                .map(EstateMemberDto::from)
                .toList();
    }

    public EstateMemberDto create(CreateFamilyMemberRequest request, User user) {
        FamilyMember member = FamilyMember.builder()
                .user(user)
                .firstName(request.firstName())
                .lastName(request.lastName())
                .relation(request.relation())
                .unionType(normalizeUnionType(request.relation(), request.unionType()))
                .matrimonialRegime(normalizeRegime(request.relation(), request.unionType(), request.matrimonialRegime()))
                .birthDate(request.birthDate())
                .deathDate(request.deathDate())
                .handicap(request.handicap() != null ? request.handicap() : false)
                .notes(request.notes())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        return EstateMemberDto.from(familyMemberRepository.save(member));
    }

    public EstateMemberDto update(Long id, UpdateFamilyMemberRequest request, User currentUser) {
        FamilyMember member = getWithOwnershipCheck(id, currentUser);
        member.setFirstName(request.firstName());
        member.setLastName(request.lastName());
        member.setRelation(request.relation());
        member.setUnionType(normalizeUnionType(request.relation(), request.unionType()));
        member.setMatrimonialRegime(normalizeRegime(request.relation(), request.unionType(), request.matrimonialRegime()));
        member.setBirthDate(request.birthDate());
        member.setDeathDate(request.deathDate());
        member.setHandicap(request.handicap() != null ? request.handicap() : false);
        member.setNotes(request.notes());
        member.setUpdatedAt(LocalDateTime.now());
        return EstateMemberDto.from(familyMemberRepository.save(member));
    }

    /** unionType n'a de sens que pour CONJOINT — on le force à null sinon. */
    private com.myfinance.domain.UnionType normalizeUnionType(
            com.myfinance.domain.FamilyRelationEnum relation,
            com.myfinance.domain.UnionType unionType) {
        if (relation == com.myfinance.domain.FamilyRelationEnum.CONJOINT) {
            return unionType != null ? unionType : com.myfinance.domain.UnionType.MARIAGE;
        }
        return null;
    }

    /** Régime matrimonial n'a de sens que pour CONJOINT MARIAGE — null sinon. */
    private com.myfinance.domain.MatrimonialRegime normalizeRegime(
            com.myfinance.domain.FamilyRelationEnum relation,
            com.myfinance.domain.UnionType unionType,
            com.myfinance.domain.MatrimonialRegime regime) {
        if (relation == com.myfinance.domain.FamilyRelationEnum.CONJOINT
                && unionType == com.myfinance.domain.UnionType.MARIAGE) {
            return regime != null ? regime : com.myfinance.domain.MatrimonialRegime.COMMUNAUTE;
        }
        return null;
    }

    public void delete(Long id, User currentUser) {
        getWithOwnershipCheck(id, currentUser);
        familyMemberRepository.deleteById(id);
    }

    public FamilyMember getWithOwnershipCheck(Long id, User currentUser) {
        FamilyMember member = familyMemberRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Membre introuvable : " + id));
        boolean isOwner = member.getUser().getId().equals(currentUser.getId());
        boolean isAdmin = currentUser.getRole() == RoleEnum.ADMIN;
        if (!isOwner && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès non autorisé");
        }
        return member;
    }
}
