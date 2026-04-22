package com.myfinance.service;

import com.myfinance.config.LoginRateLimitProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LoginAttemptServiceTest {

    private static final int MAX_ATTEMPTS = 5;
    private static final long BASE_LOCK = 5L;
    private static final long MAX_LOCK = 80L;

    private LoginAttemptService service;

    @BeforeEach
    void setUp() {
        LoginRateLimitProperties props = new LoginRateLimitProperties();
        props.setMaxAttempts(MAX_ATTEMPTS);
        props.setBaseLockMinutes(BASE_LOCK);
        props.setMaxLockMinutes(MAX_LOCK);
        service = new LoginAttemptService(props);
    }

    // ── estBloque ──────────────────────────────────────────────

    @Test
    void nonBloque_sansEchec() {
        assertThat(service.estBloque("user")).isFalse();
    }

    @Test
    void nonBloque_sousLeSeuil() {
        for (int i = 0; i < 4; i++) service.enregistrerEchec("user");
        assertThat(service.estBloque("user")).isFalse();
    }

    @Test
    void bloque_apres5Echecs() {
        for (int i = 0; i < 5; i++) service.enregistrerEchec("user");
        assertThat(service.estBloque("user")).isTrue();
    }

    @Test
    void nonBloque_loginNull() {
        assertThat(service.estBloque(null)).isFalse();
    }

    // ── enregistrerSucces ──────────────────────────────────────

    @Test
    void succes_reinitialiseLesEchecs() {
        for (int i = 0; i < 5; i++) service.enregistrerEchec("user");
        service.enregistrerSucces("user");
        assertThat(service.estBloque("user")).isFalse();
    }

    // ── secondesRestantes ──────────────────────────────────────

    @Test
    void secondesRestantes_zero_sansEchec() {
        assertThat(service.secondesRestantes("user")).isZero();
    }

    @Test
    void secondesRestantes_positif_quandBloque() {
        for (int i = 0; i < 5; i++) service.enregistrerEchec("user");
        assertThat(service.secondesRestantes("user")).isGreaterThan(0);
    }

    @Test
    void secondesRestantes_zero_loginNull() {
        assertThat(service.secondesRestantes(null)).isZero();
    }

    // ── dureeBlocageMinutes ────────────────────────────────────

    @Test
    void duree_5echecs_5minutes() {
        assertThat(service.dureeBlocageMinutes(5)).isEqualTo(5);
    }

    @Test
    void duree_9echecs_5minutes() {
        assertThat(service.dureeBlocageMinutes(9)).isEqualTo(5);
    }

    @Test
    void duree_10echecs_10minutes() {
        assertThat(service.dureeBlocageMinutes(10)).isEqualTo(10);
    }

    @Test
    void duree_15echecs_20minutes() {
        assertThat(service.dureeBlocageMinutes(15)).isEqualTo(20);
    }

    @Test
    void duree_20echecs_40minutes() {
        assertThat(service.dureeBlocageMinutes(20)).isEqualTo(40);
    }

    @Test
    void duree_25echecs_80minutes() {
        assertThat(service.dureeBlocageMinutes(25)).isEqualTo(80);
    }

    @Test
    void duree_plafond_80minutes() {
        assertThat(service.dureeBlocageMinutes(100)).isEqualTo(80);
    }

    // ── isolation entre logins ─────────────────────────────────

    @Test
    void echecs_isoles_par_login() {
        for (int i = 0; i < 5; i++) service.enregistrerEchec("userA");
        assertThat(service.estBloque("userB")).isFalse();
    }
}
