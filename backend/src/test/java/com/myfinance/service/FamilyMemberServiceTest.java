package com.myfinance.service;

import com.myfinance.domain.*;
import com.myfinance.dto.CreateFamilyMemberRequest;
import com.myfinance.dto.EstateMemberDto;
import com.myfinance.dto.UpdateFamilyMemberRequest;
import com.myfinance.repository.FamilyMemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FamilyMemberServiceTest {

    @Mock FamilyMemberRepository familyMemberRepository;
    @InjectMocks FamilyMemberService service;

    User owner;
    User otherUser;
    User admin;
    FamilyMember member;

    @BeforeEach
    void setUp() {
        owner     = User.builder().id(1L).login("owner").role(RoleEnum.USER).build();
        otherUser = User.builder().id(2L).login("other").role(RoleEnum.USER).build();
        admin     = User.builder().id(3L).login("admin").role(RoleEnum.ADMIN).build();

        member = FamilyMember.builder()
                .id(1L).user(owner)
                .firstName("Léo").relation(FamilyRelationEnum.ENFANT)
                .handicap(false)
                .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now())
                .build();
    }

    // ── findAllByUser ──────────────────────────────────────────

    @Test
    void findAllByUser_retourneLaListe() {
        when(familyMemberRepository.findByUserOrderByRelationAscFirstNameAsc(owner))
                .thenReturn(List.of(member));

        List<EstateMemberDto> result = service.findAllByUser(owner);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).firstName()).isEqualTo("Léo");
    }

    // ── create ─────────────────────────────────────────────────

    @Test
    void create_sauvegardeEtRetourneLDto() {
        CreateFamilyMemberRequest request = new CreateFamilyMemberRequest(
                "Emma", null, FamilyRelationEnum.ENFANT,
                null, null,
                LocalDate.of(2000, 1, 1), null, false, null);

        when(familyMemberRepository.save(any())).thenAnswer(inv -> {
            FamilyMember m = inv.getArgument(0);
            m.setId(2L);
            return m;
        });

        EstateMemberDto result = service.create(request, owner);

        assertThat(result.id()).isEqualTo(2L);
        assertThat(result.firstName()).isEqualTo("Emma");
        verify(familyMemberRepository).save(any(FamilyMember.class));
    }

    // ── update ─────────────────────────────────────────────────

    @Test
    void update_leve404_siMembre_introuvable() {
        when(familyMemberRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(99L,
                new UpdateFamilyMemberRequest("X", null, FamilyRelationEnum.AUTRE, null, null, null, null, false, null),
                owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void update_leve403_siAutreUtilisateur() {
        when(familyMemberRepository.findById(1L)).thenReturn(Optional.of(member));

        assertThatThrownBy(() -> service.update(1L,
                new UpdateFamilyMemberRequest("Léo", null, FamilyRelationEnum.ENFANT, null, null, null, null, false, null),
                otherUser))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(familyMemberRepository, never()).save(any());
    }

    @Test
    void update_autorisePourAdmin() {
        when(familyMemberRepository.findById(1L)).thenReturn(Optional.of(member));
        when(familyMemberRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        assertThatNoException().isThrownBy(() -> service.update(1L,
                new UpdateFamilyMemberRequest("Léo", null, FamilyRelationEnum.ENFANT, null, null, null, null, false, null),
                admin));
    }

    // ── delete ─────────────────────────────────────────────────

    @Test
    void delete_supprimeLeMembre() {
        when(familyMemberRepository.findById(1L)).thenReturn(Optional.of(member));

        service.delete(1L, owner);

        verify(familyMemberRepository).deleteById(1L);
    }

    @Test
    void delete_leve403_siPasLeProprietaire() {
        when(familyMemberRepository.findById(1L)).thenReturn(Optional.of(member));

        assertThatThrownBy(() -> service.delete(1L, otherUser))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(familyMemberRepository, never()).deleteById(any());
    }
}
