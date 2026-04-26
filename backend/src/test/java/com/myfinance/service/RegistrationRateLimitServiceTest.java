package com.myfinance.service;

import com.myfinance.config.RegistrationRateLimitProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RegistrationRateLimitServiceTest {

    private static final int MAX_ATTEMPTS = 5;
    private static final int WINDOW_MIN = 60;
    private static final String IP = "203.0.113.42";

    private RegistrationRateLimitService service;

    @BeforeEach
    void setUp() {
        RegistrationRateLimitProperties props = new RegistrationRateLimitProperties();
        props.setMaxAttempts(MAX_ATTEMPTS);
        props.setWindowMinutes(WINDOW_MIN);
        service = new RegistrationRateLimitService(props);
    }

    // ── estBloque ──────────────────────────────────────────────

    @Test
    void nonBloque_sansTentative() {
        assertThat(service.estBloque(IP)).isFalse();
    }

    @Test
    void nonBloque_sousLeSeuil() {
        for (int i = 0; i < MAX_ATTEMPTS - 1; i++) {
            service.enregistrerTentative(IP);
        }
        assertThat(service.estBloque(IP)).isFalse();
    }

    @Test
    void bloque_apresMaxTentatives() {
        for (int i = 0; i < MAX_ATTEMPTS; i++) {
            service.enregistrerTentative(IP);
        }
        assertThat(service.estBloque(IP)).isTrue();
    }

    @Test
    void nonBloque_pourIpDifferente() {
        for (int i = 0; i < MAX_ATTEMPTS; i++) {
            service.enregistrerTentative(IP);
        }
        assertThat(service.estBloque("198.51.100.1")).isFalse();
    }

    @Test
    void nonBloque_ipNull() {
        assertThat(service.estBloque(null)).isFalse();
    }

    @Test
    void nonBloque_ipBlank() {
        assertThat(service.estBloque("  ")).isFalse();
    }

    // ── enregistrerTentative ───────────────────────────────────

    @Test
    void enregistrerTentative_ipNull_neLeveAucuneException() {
        service.enregistrerTentative(null);
        service.enregistrerTentative("");
        // Aucune assertion : on vérifie juste l'absence d'exception
    }

    @Test
    void compteurIndependant_parIp() {
        service.enregistrerTentative("192.0.2.1");
        service.enregistrerTentative("192.0.2.1");
        service.enregistrerTentative("192.0.2.2");

        // 192.0.2.1 a 2 tentatives, 192.0.2.2 a 1 — aucune des deux n'est bloquée
        assertThat(service.estBloque("192.0.2.1")).isFalse();
        assertThat(service.estBloque("192.0.2.2")).isFalse();
    }

    // ── secondesRestantes ──────────────────────────────────────

    @Test
    void secondesRestantes_zero_siAucuneTentative() {
        assertThat(service.secondesRestantes(IP)).isZero();
    }

    @Test
    void secondesRestantes_positif_apresBlocage() {
        for (int i = 0; i < MAX_ATTEMPTS; i++) {
            service.enregistrerTentative(IP);
        }
        long restant = service.secondesRestantes(IP);
        // Fenêtre de 60 min = 3600s ; on accepte un léger retard de quelques secondes
        assertThat(restant).isBetween(WINDOW_MIN * 60L - 5L, WINDOW_MIN * 60L);
    }

    @Test
    void secondesRestantes_zero_pourIpInconnue() {
        for (int i = 0; i < MAX_ATTEMPTS; i++) {
            service.enregistrerTentative(IP);
        }
        assertThat(service.secondesRestantes("autre.ip")).isZero();
    }
}
