package com.myfinance.service;

import com.myfinance.domain.RegistrationStatus;
import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.User;
import com.myfinance.domain.UserRegistrationRequest;
import com.myfinance.dto.CreateRegistrationRequest;
import com.myfinance.dto.RegistrationRequestDto;
import com.myfinance.repository.UserRegistrationRequestRepository;
import com.myfinance.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserRegistrationService {

    private final UserRegistrationRequestRepository registrationRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    // ── Soumission (public) ────────────────────────────────────

    /**
     * Enregistre une demande d'inscription publique. Pour empêcher l'énumération de comptes
     * (attaque OWASP — différence de réponse selon que le login existe ou non) :
     *   - même réponse renvoyée dans tous les cas (succès, doublon utilisateur, doublon PENDING)
     *   - le hash BCrypt est calculé même quand on n'écrit rien, pour neutraliser l'attaque par timing
     * Les conflits sont logués côté serveur uniquement (admin peut investiguer si besoin).
     */
    public void create(CreateRegistrationRequest request) {
        // Hash systématique pour égaliser le temps de réponse même en cas de no-op
        String hashedPassword = passwordEncoder.encode(request.password());

        boolean loginPris = userRepository.findByLogin(request.login()).isPresent();
        boolean demandeEnAttente = registrationRepository.existsByLoginAndStatus(
                request.login(), RegistrationStatus.PENDING);

        if (loginPris || demandeEnAttente) {
            log.warn("[system] Demande d'inscription ignorée silencieusement - "
                    + "login déjà actif: {}, demande PENDING existante: {}",
                    loginPris, demandeEnAttente);
            return;
        }

        UserRegistrationRequest entity = UserRegistrationRequest.builder()
                .login(request.login())
                .firstName(request.firstName())
                .lastName(request.lastName())
                .hashedPassword(hashedPassword)
                .status(RegistrationStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build();

        UserRegistrationRequest saved = registrationRepository.save(entity);
        log.info("[system] Demande d'inscription créée #{}", saved.getId());
    }

    // ── Lecture (admin) ────────────────────────────────────────

    public List<RegistrationRequestDto> findAll(RegistrationStatus status) {
        List<UserRegistrationRequest> results = (status != null)
                ? registrationRepository.findByStatusOrderByCreatedAtDesc(status)
                : registrationRepository.findAllByOrderByCreatedAtDesc();

        return results.stream().map(RegistrationRequestDto::from).toList();
    }

    // ── Approbation (admin) ────────────────────────────────────

    public RegistrationRequestDto approve(Long id, String adminLogin) {
        UserRegistrationRequest request = getOrThrow(id);
        assertPending(request);

        User user = User.builder()
                .login(request.getLogin())
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .password(request.getHashedPassword())
                .role(RoleEnum.USER)
                .fiscalParts(1.0f)
                .useFlatRateDeduction(true)
                .build();
        userRepository.save(user);

        request.setStatus(RegistrationStatus.APPROVED);
        request.setReviewedAt(LocalDateTime.now());
        request.setReviewedBy(adminLogin);

        RegistrationRequestDto dto = RegistrationRequestDto.from(registrationRepository.save(request));
        log.info("[system] Demande d'inscription #{} approuvée", id);
        return dto;
    }

    // ── Rejet (admin) ──────────────────────────────────────────

    public RegistrationRequestDto reject(Long id, String adminLogin) {
        UserRegistrationRequest request = getOrThrow(id);
        assertPending(request);

        request.setStatus(RegistrationStatus.REJECTED);
        request.setReviewedAt(LocalDateTime.now());
        request.setReviewedBy(adminLogin);

        RegistrationRequestDto dto = RegistrationRequestDto.from(registrationRepository.save(request));
        log.info("[system] Demande d'inscription #{} rejetée", id);
        return dto;
    }

    // ── Helpers ────────────────────────────────────────────────

    private UserRegistrationRequest getOrThrow(Long id) {
        return registrationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Demande introuvable : " + id));
    }

    private void assertPending(UserRegistrationRequest request) {
        if (request.getStatus() != RegistrationStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Cette demande a déjà été traitée (statut : " + request.getStatus() + ").");
        }
    }
}
