package com.myfinance.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PasswordPolicyServiceTest {

    @Mock PasswordEncoder passwordEncoder;
    @InjectMocks PasswordPolicyService passwordPolicyService;

    // ── validateNotCommon ─────────────────────────────────────────────────────

    @ParameterizedTest(name = "validateNotCommon — rejette \"{0}\"")
    @ValueSource(strings = {
            "password1234!", "Password1234!", "PASSWORD1234!",  // case-insensitive
            "azerty1234!", "qwerty1234!",
            "myfinance1234!", "admin12345!"
    })
    void validateNotCommon_leve400_siMotDePasseCourant(String password) {
        assertThatThrownBy(() -> passwordPolicyService.validateNotCommon(password))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(rse.getReason()).contains("trop courant");
                });
    }

    @ParameterizedTest(name = "validateNotCommon — accepte \"{0}\"")
    @ValueSource(strings = {
            "Th!sIsAStr0ngPass#42",
            "MonSuperMotDePasse$2026",
            "K3v!nDsm4yC0d3"
    })
    void validateNotCommon_neLeveRien_siMotDePasseOriginal(String password) {
        assertThatNoException().isThrownBy(() -> passwordPolicyService.validateNotCommon(password));
    }

    @Test
    void validateNotCommon_neLeveRien_siNull() {
        assertThatNoException().isThrownBy(() -> passwordPolicyService.validateNotCommon(null));
    }

    // ── validateNotContainsIdentity ───────────────────────────────────────────

    @ParameterizedTest(name = "validateNotContainsIdentity — {0}")
    @MethodSource("identityViolations")
    void validateNotContainsIdentity_leve400_siMotDePasseContientIdentite(
            String description, String password, String login, String firstName, String lastName) {

        assertThatThrownBy(() -> passwordPolicyService.validateNotContainsIdentity(
                password, login, firstName, lastName))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(rse.getReason()).contains("login, prénom ou nom");
                });
    }

    static Stream<Arguments> identityViolations() {
        return Stream.of(
                Arguments.of("contient le login (case-insensitive)",
                        "MonKevinPass1!", "kevin", "Jean", "Dupont"),
                Arguments.of("contient le prénom",
                        "JeanPass2026!", "user42", "Jean", "Dupont"),
                Arguments.of("contient le nom",
                        "PassDupont2026!", "user42", "Jean", "Dupont"),
                Arguments.of("contient l'identité avec mixed case",
                        "passDUPONT99!", "user42", "Jean", "Dupont")
        );
    }

    @Test
    void validateNotContainsIdentity_neLeveRien_siAucuneCoincidence() {
        assertThatNoException().isThrownBy(() -> passwordPolicyService.validateNotContainsIdentity(
                "RandomPass2026!", "kevin", "Jean", "Dupont"));
    }

    @Test
    void validateNotContainsIdentity_neLeveRien_siIdentiteTropCourte() {
        // Identité < 3 caractères ignorée (faux positifs probables)
        assertThatNoException().isThrownBy(() -> passwordPolicyService.validateNotContainsIdentity(
                "MyPass2026!", "ab", "Jo", "Vu"));
    }

    @Test
    void validateNotContainsIdentity_neLeveRien_siIdentitesNullOuVides() {
        assertThatNoException().isThrownBy(() -> passwordPolicyService.validateNotContainsIdentity(
                "MyPass2026!", null, "", "  "));
    }

    @Test
    void validateNotContainsIdentity_neLeveRien_siPasswordNull() {
        assertThatNoException().isThrownBy(() -> passwordPolicyService.validateNotContainsIdentity(
                null, "kevin", "Jean", "Dupont"));
    }

    @Test
    void validateNotContainsIdentity_neLeveRien_siPasswordVide() {
        assertThatNoException().isThrownBy(() -> passwordPolicyService.validateNotContainsIdentity(
                "  ", "kevin", "Jean", "Dupont"));
    }

    // ── validateNotSameAsCurrent ──────────────────────────────────────────────

    @Test
    void validateNotSameAsCurrent_leve400_siNouveauIdentiqueALancien() {
        when(passwordEncoder.matches("NewPass2026!", "$2a$10$hash")).thenReturn(true);

        assertThatThrownBy(() -> passwordPolicyService.validateNotSameAsCurrent(
                "NewPass2026!", "$2a$10$hash"))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(rse.getReason()).contains("différent de l'actuel");
                });
    }

    @Test
    void validateNotSameAsCurrent_neLeveRien_siNouveauDifferent() {
        when(passwordEncoder.matches("NewPass2026!", "$2a$10$hash")).thenReturn(false);

        assertThatNoException().isThrownBy(() -> passwordPolicyService.validateNotSameAsCurrent(
                "NewPass2026!", "$2a$10$hash"));
    }

    @Test
    void validateNotSameAsCurrent_neLeveRien_siNewPasswordNull() {
        assertThatNoException().isThrownBy(() -> passwordPolicyService.validateNotSameAsCurrent(
                null, "$2a$10$hash"));
        verify(passwordEncoder, never()).matches(anyString(), anyString());
    }

    @Test
    void validateNotSameAsCurrent_neLeveRien_siCurrentHashNull() {
        assertThatNoException().isThrownBy(() -> passwordPolicyService.validateNotSameAsCurrent(
                "NewPass2026!", null));
        verify(passwordEncoder, never()).matches(anyString(), anyString());
    }
}
