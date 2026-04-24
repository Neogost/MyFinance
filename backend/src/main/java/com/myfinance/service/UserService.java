package com.myfinance.service;

import com.myfinance.domain.User;
import com.myfinance.dto.ChangePasswordRequest;
import com.myfinance.dto.CreateUserRequest;
import com.myfinance.dto.UpdateUserRequest;
import com.myfinance.dto.UserDto;
import com.myfinance.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    // ── Spring Security ────────────────────────────────────────

    @Override
    public UserDetails loadUserByUsername(String login) throws UsernameNotFoundException {
        return userRepository.findByLogin(login)
                .orElseThrow(() -> new UsernameNotFoundException("Utilisateur introuvable : " + login));
    }

    // ── Lecture ────────────────────────────────────────────────

    public List<UserDto> findAll() {
        return userRepository.findAll().stream()
                .map(UserDto::from)
                .toList();
    }

    public UserDto findById(Long id) {
        return userRepository.findById(id)
                .map(UserDto::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Utilisateur introuvable : " + id));
    }

    // ── Lecture (entité) — usage interne et simulateur ────────

    public User findEntityById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Utilisateur introuvable : " + id));
    }

    // ── Création ───────────────────────────────────────────────

    public UserDto create(CreateUserRequest request) {
        if (userRepository.findByLogin(request.login()).isPresent()) {
            log.warn("[system] Création utilisateur refusée - login déjà utilisé");
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Ce login est déjà utilisé : " + request.login());
        }

        validerProfilFiscal(request.useFlatRateDeduction(), request.customProfessionalDeduction());

        User user = User.builder()
                .firstName(request.firstName())
                .lastName(request.lastName())
                .birthDate(request.birthDate())
                .login(request.login())
                .password(passwordEncoder.encode(request.password()))
                .role(request.role())
                .fiscalParts(request.fiscalParts() != null ? request.fiscalParts() : 1.0f)
                .useFlatRateDeduction(request.useFlatRateDeduction() != null ? request.useFlatRateDeduction() : true)
                .customProfessionalDeduction(request.customProfessionalDeduction())
                .build();

        UserDto dto = UserDto.from(userRepository.save(user));
        log.info("[system] Utilisateur créé #{} [rôle: {}]", dto.id(), request.role());
        return dto;
    }

    // ── Modification ───────────────────────────────────────────

    public UserDto update(Long id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Utilisateur introuvable : " + id));

        // Vérifie que le nouveau login n'est pas déjà pris par quelqu'un d'autre
        userRepository.findByLogin(request.login())
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    log.warn("[system] Modification utilisateur #{} refusée - login déjà utilisé", id);
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "Ce login est déjà utilisé : " + request.login());
                });

        validerProfilFiscal(request.useFlatRateDeduction(), request.customProfessionalDeduction());

        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setBirthDate(request.birthDate());
        user.setLogin(request.login());
        user.setRole(request.role());

        if (request.password() != null && !request.password().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.password()));
        }

        // Mise à jour profil fiscal uniquement si les champs sont fournis
        if (request.fiscalParts() != null) user.setFiscalParts(request.fiscalParts());
        if (request.useFlatRateDeduction() != null) {
            user.setUseFlatRateDeduction(request.useFlatRateDeduction());
            user.setCustomProfessionalDeduction(request.customProfessionalDeduction());
        }

        UserDto dto = UserDto.from(userRepository.save(user));
        log.info("[system] Utilisateur modifié #{}", id);
        return dto;
    }

    // ── Validation profil fiscal ───────────────────────────────

    private void validerProfilFiscal(Boolean useFlatRate, Float customDeduction) {
        if (Boolean.FALSE.equals(useFlatRate) && customDeduction == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Le montant des frais réels est obligatoire quand l'abattement forfaitaire est désactivé");
        }
    }

    // ── Changement de mot de passe (self-service) ─────────────

    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Utilisateur introuvable : " + userId));

        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Mot de passe actuel incorrect");
        }

        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        log.info("[user:{}] Mot de passe modifié", userId);
    }

    // ── Suppression ────────────────────────────────────────────

    public void delete(Long id) {
        if (!userRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Utilisateur introuvable : " + id);
        }
        userRepository.deleteById(id);
        log.info("[system] Utilisateur supprimé #{}", id);
    }
}
