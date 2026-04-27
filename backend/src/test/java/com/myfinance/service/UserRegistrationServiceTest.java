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
    @Mock PasswordPolicyService passwordPolicyService;
    @InjectMocks UserRegistrationService service;

    UserRegistrationRequest pendingRequest;
    CreateRegistrationRequest validRequest;

    @BeforeEach
    void setUp() {
        validRequest = new CreateRegistrationRequest("jean.dupont", "Jean", "Dupont", "Secure123!Pass");

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
    void create_sauvegardeLaDemandeAvecStatutPending() {
        when(userRepository.findByLogin("jean.dupont")).thenReturn(Optional.empty());
        when(registrationRepository.existsByLoginAndStatus("jean.dupont", RegistrationStatus.PENDING)).thenReturn(false);
        when(passwordEncoder.encode("Secure123!Pass")).thenReturn("$2a$hashed");
        when(registrationRepository.save(any())).thenReturn(pendingRequest);

        service.create(validRequest);

        verify(passwordEncoder).encode("Secure123!Pass");
        verify(registrationRepository).save(any(UserRegistrationRequest.class));
    }

    @Test
    void create_ignoreSilencieusement_siLoginDejaUtiliseDansUsers() {
        when(userRepository.findByLogin("jean.dupont")).thenReturn(Optional.of(User.builder().build()));
        when(passwordEncoder.encode("Secure123!Pass")).thenReturn("$2a$hashed");

        // Pas d'exception : la méthode retourne normalement (anti-énumération)
        service.create(validRequest);

        // Le hash est calculé même en cas de no-op (anti-timing attack)
        verify(passwordEncoder).encode("Secure123!Pass");
        // Mais aucune entrée n'est persistée
        verify(registrationRepository, never()).save(any());
    }

    @Test
    void create_ignoreSilencieusement_siDemandePendingExistante() {
        when(userRepository.findByLogin("jean.dupont")).thenReturn(Optional.empty());
        when(registrationRepository.existsByLoginAndStatus("jean.dupont", RegistrationStatus.PENDING)).thenReturn(true);
        when(passwordEncoder.encode("Secure123!Pass")).thenReturn("$2a$hashed");

        service.create(validRequest);

        verify(passwordEncoder).encode("Secure123!Pass");
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
    void approve_purgeLeHashApresCopieVersUser() {
        // Capture le User envoyé à userRepository.save() pour vérifier qu'il reçoit bien
        // le hash AVANT la purge sur la demande.
        when(registrationRepository.findById(1L)).thenReturn(Optional.of(pendingRequest));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(registrationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        org.mockito.ArgumentCaptor<User> userCaptor = org.mockito.ArgumentCaptor.forClass(User.class);

        service.approve(1L, "admin");

        verify(userRepository).save(userCaptor.capture());
        // Le User créé doit avoir reçu le hash original
        assertThat(userCaptor.getValue().getPassword()).isEqualTo("$2a$hashed");
        // Mais la demande persistée doit avoir un hash purgé (chaîne vide — la colonne est NOT NULL)
        assertThat(pendingRequest.getHashedPassword()).isEmpty();
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
    void reject_purgeLeHashAussi() {
        when(registrationRepository.findById(1L)).thenReturn(Optional.of(pendingRequest));
        when(registrationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.reject(1L, "admin");

        // La demande rejetée ne doit pas conserver le hash en base
        assertThat(pendingRequest.getHashedPassword()).isEmpty();
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
