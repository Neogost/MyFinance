package com.myfinance.service;

import com.myfinance.config.LoginIpAttemptProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LoginIpAttemptServiceTest {

    private static final int MAX_ATTEMPTS = 20;
    private static final int WINDOW_MIN = 60;
    private static final String IP = "203.0.113.42";

    private LoginIpAttemptService service;

    @BeforeEach
    void setUp() {
        LoginIpAttemptProperties props = new LoginIpAttemptProperties();
        props.setMaxAttempts(MAX_ATTEMPTS);
        props.setWindowMinutes(WINDOW_MIN);
        service = new LoginIpAttemptService(props);
    }

    // ── estBloque ──────────────────────────────────────────────

    @Test
    void nonBloque_sansEchec() {
        assertThat(service.estBloque(IP)).isFalse();
    }

    @Test
    void nonBloque_sousLeSeuil() {
        for (int i = 0; i < MAX_ATTEMPTS - 1; i++) {
            service.enregistrerEchec(IP);
        }
        assertThat(service.estBloque(IP)).isFalse();
    }

    @Test
    void bloque_apresMaxEchecs() {
        for (int i = 0; i < MAX_ATTEMPTS; i++) {
            service.enregistrerEchec(IP);
        }
        assertThat(service.estBloque(IP)).isTrue();
    }

    @Test
    void nonBloque_pourIpDifferente() {
        for (int i = 0; i < MAX_ATTEMPTS; i++) {
            service.enregistrerEchec(IP);
        }
        assertThat(service.estBloque("198.51.100.1")).isFalse();
    }

    @Test
    void nonBloque_ipNull() {
        assertThat(service.estBloque(null)).isFalse();
    }

    @Test
    void nonBloque_ipBlank() {
        assertThat(service.estBloque("   ")).isFalse();
    }

    // ── enregistrerEchec ───────────────────────────────────────

    @Test
    void enregistrerEchec_ipNull_neLeveAucuneException() {
        service.enregistrerEchec(null);
        service.enregistrerEchec("");
    }

    @Test
    void compteurIndependant_parIp() {
        service.enregistrerEchec("192.0.2.1");
        service.enregistrerEchec("192.0.2.1");
        service.enregistrerEchec("192.0.2.2");

        assertThat(service.estBloque("192.0.2.1")).isFalse();
        assertThat(service.estBloque("192.0.2.2")).isFalse();
    }

    // ── secondesRestantes ──────────────────────────────────────

    @Test
    void secondesRestantes_zero_siAucunEchec() {
        assertThat(service.secondesRestantes(IP)).isZero();
    }

    @Test
    void secondesRestantes_positif_apresBlocage() {
        for (int i = 0; i < MAX_ATTEMPTS; i++) {
            service.enregistrerEchec(IP);
        }
        long restant = service.secondesRestantes(IP);
        assertThat(restant).isBetween(WINDOW_MIN * 60L - 5L, WINDOW_MIN * 60L);
    }

    @Test
    void secondesRestantes_zero_pourIpInconnue() {
        for (int i = 0; i < MAX_ATTEMPTS; i++) {
            service.enregistrerEchec(IP);
        }
        assertThat(service.secondesRestantes("autre.ip")).isZero();
    }
}
