package com.myfinance.service;

import com.myfinance.domain.RegistrationStatus;
import com.myfinance.domain.User;
import com.myfinance.domain.UserRegistrationRequest;
import com.myfinance.dto.CreateRegistrationRequest;
import com.myfinance.dto.RegistrationRequestDto;
import com.myfinance.repository.UserRegistrationRequestRepository;
import com.myfinance.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserRegistrationServiceTest {

    @Mock UserRegistrationRequestRepository registrationRepository;
    @Mock UserRepository userRepository;
    @Mock PasswordEncoder passwordEncoder;
    @InjectMocks UserRegistrationService service;

    UserRegistrationRequest pendingRequest;
    CreateRegistrationRequest validRequest;

    @BeforeEach
    void setUp() {
        validRequest = new CreateRegistrationRequest("jean.dupont", "Jean", "Dupont", "Password1");

        pendingRequest = UserRegistrationRequest.builder()
                .id(1L)
                .login("jean.dupont")
                .firstName("Jean")
                .lastName("Dupont")
                .hashedPassword("$2a$hashed")
                .status(RegistrationStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build();
    }

    // ── create ─────────────────────────────────────────────────

    @Test
    void create_sauvegardeEtRetourneLaDemandeAvecStatutPending() {
        when(userRepository.findByLogin("jean.dupont")).thenReturn(Optional.empty());
        when(registrationRepository.existsByLoginAndStatus("jean.dupont", RegistrationStatus.PENDING)).thenReturn(false);
        when(passwordEncoder.encode("Password1")).thenReturn("$2a$hashed");
        when(registrationRepository.save(any())).thenReturn(pendingRequest);

        RegistrationRequestDto result = service.create(validRequest);

        assertThat(result.login()).isEqualTo("jean.dupont");
        assertThat(result.status()).isEqualTo(RegistrationStatus.PENDING);
        verify(passwordEncoder).encode("Password1");
        verify(registrationRepository).save(any(UserRegistrationRequest.class));
    }

    @Test
    void create_leve409_siLoginDejaUtiliseDansUsers() {
        when(userRepository.findByLogin("jean.dupont")).thenReturn(Optional.of(User.builder().build()));

        assertThatThrownBy(() -> service.create(validRequest))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));

        verify(registrationRepository, never()).save(any());
    }

    @Test
    void create_leve409_siDemandePendingExistante() {
        when(userRepository.findByLogin("jean.dupont")).thenReturn(Optional.empty());
        when(registrationRepository.existsByLoginAndStatus("jean.dupont", RegistrationStatus.PENDING)).thenReturn(true);

        assertThatThrownBy(() -> service.create(validRequest))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));

        verify(registrationRepository, never()).save(any());
    }

    // ── findAll ────────────────────────────────────────────────

    @Test
    void findAll_sansFiltre_retourneToutesLesDemandes() {
        when(registrationRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(pendingRequest));

        List<RegistrationRequestDto> result = service.findAll(null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).login()).isEqualTo("jean.dupont");
    }

    @Test
    void findAll_avecFiltre_retourneLesDemandesDuStatut() {
        when(registrationRepository.findByStatusOrderByCreatedAtDesc(RegistrationStatus.PENDING))
                .thenReturn(List.of(pendingRequest));

        List<RegistrationRequestDto> result = service.findAll(RegistrationStatus.PENDING);

        assertThat(result).hasSize(1);
    }

    // ── approve ────────────────────────────────────────────────

    @Test
    void approve_creeLeCompteEtMarqueApproved() {
        when(registrationRepository.findById(1L)).thenReturn(Optional.of(pendingRequest));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(registrationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        RegistrationRequestDto result = service.approve(1L, "admin");

        assertThat(result.status()).isEqualTo(RegistrationStatus.APPROVED);
        assertThat(result.reviewedBy()).isEqualTo("admin");
        assertThat(result.reviewedAt()).isNotNull();
        verify(userRepository).save(any(User.class));
    }

    @Test
    void approve_leve404_siDemandIntrouvable() {
        when(registrationRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.approve(99L, "admin"))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void approve_leve409_siDejaTraitee() {
        pendingRequest.setStatus(RegistrationStatus.APPROVED);
        when(registrationRepository.findById(1L)).thenReturn(Optional.of(pendingRequest));

        assertThatThrownBy(() -> service.approve(1L, "admin"))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));

        verify(userRepository, never()).save(any());
    }

    // ── reject ─────────────────────────────────────────────────

    @Test
    void reject_marqueRejectedSansCrerDeCompte() {
        when(registrationRepository.findById(1L)).thenReturn(Optional.of(pendingRequest));
        when(registrationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        RegistrationRequestDto result = service.reject(1L, "admin");

        assertThat(result.status()).isEqualTo(RegistrationStatus.REJECTED);
        assertThat(result.reviewedBy()).isEqualTo("admin");
        verify(userRepository, never()).save(any());
    }

    @Test
    void reject_leve409_siDejaTraitee() {
        pendingRequest.setStatus(RegistrationStatus.REJECTED);
        when(registrationRepository.findById(1L)).thenReturn(Optional.of(pendingRequest));

        assertThatThrownBy(() -> service.reject(1L, "admin"))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));
    }
}
