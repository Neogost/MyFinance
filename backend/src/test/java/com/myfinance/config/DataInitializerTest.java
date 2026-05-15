package com.myfinance.config;

import com.myfinance.domain.User;
import com.myfinance.repository.UserRepository;
import com.myfinance.service.PasswordPolicyService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DataInitializerTest {

    @Mock UserRepository userRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock PasswordPolicyService passwordPolicyService;

    @InjectMocks DataInitializer initializer;

    @BeforeEach
    void setUp() {
        lenient().when(passwordEncoder.encode(any())).thenReturn("hash");
    }

    @Test
    void run_baseDejaPeuplee_noOp() {
        when(userRepository.count()).thenReturn(1L);

        initializer.run(null);

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void run_passwordAbsent_leveIllegalState() {
        when(userRepository.count()).thenReturn(0L);
        ReflectionTestUtils.setField(initializer, "initialAdminPassword", "");

        assertThatThrownBy(() -> initializer.run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("MYFINANCE_ADMIN_INITIAL_PASSWORD");
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void run_passwordTropCourt_leveIllegalState() {
        when(userRepository.count()).thenReturn(0L);
        ReflectionTestUtils.setField(initializer, "initialAdminPassword", "Ab1!");

        assertThatThrownBy(() -> initializer.run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("12 caractères");
    }

    @Test
    void run_passwordSansComplexite_leveIllegalState() {
        when(userRepository.count()).thenReturn(0L);
        // 12+ caractères mais que des minuscules → manque maj/chiffre/spécial
        ReflectionTestUtils.setField(initializer, "initialAdminPassword", "abcdefghijklmn");

        assertThatThrownBy(() -> initializer.run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("majuscule");
    }

    @Test
    void run_passwordValide_creeAdmin() {
        when(userRepository.count()).thenReturn(0L);
        ReflectionTestUtils.setField(initializer, "initialAdminPassword", "Sup3rSecret!Pwd");

        initializer.run(null);

        verify(passwordPolicyService).validateNotCommon("Sup3rSecret!Pwd");
        verify(passwordPolicyService).validateNotContainsIdentity("Sup3rSecret!Pwd", "admin", "Admin", "Admin");
        verify(passwordEncoder).encode("Sup3rSecret!Pwd");
        verify(userRepository).save(any(User.class));
    }

    @Test
    void run_passwordVerifiePolicyExceptionPropageeEnIllegalState() {
        when(userRepository.count()).thenReturn(0L);
        ReflectionTestUtils.setField(initializer, "initialAdminPassword", "AdminAdmin1!");

        org.springframework.web.server.ResponseStatusException refus =
                new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.BAD_REQUEST,
                        "Le mot de passe ne doit pas contenir votre login, prénom ou nom.");
        org.mockito.Mockito.doThrow(refus).when(passwordPolicyService)
                .validateNotContainsIdentity(any(), any(), any(), any());

        assertThatThrownBy(() -> initializer.run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("MYFINANCE_ADMIN_INITIAL_PASSWORD")
                .hasMessageContaining("login, prénom ou nom");
        verify(userRepository, never()).save(any(User.class));
        assertThat(refus).isNotNull(); // capture la cause sans warning unused
    }
}
