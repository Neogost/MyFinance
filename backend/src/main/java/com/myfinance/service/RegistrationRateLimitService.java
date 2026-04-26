package com.myfinance.service;

import com.myfinance.config.RegistrationRateLimitProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate-limit IP-based pour l'endpoint public d'inscription. Empêche le flooding
 * de la table user_registration_requests et la saturation CPU par BCrypt.
 * Stockage en mémoire — un redémarrage du conteneur réinitialise les compteurs.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RegistrationRateLimitService {

    private final RegistrationRateLimitProperties props;

    private record InfoTentative(int nbTentatives, LocalDateTime premiereTentative) {}

    private final ConcurrentHashMap<String, InfoTentative> tentatives = new ConcurrentHashMap<>();

    public boolean estBloque(String ipAddress) {
        if (ipAddress == null || ipAddress.isBlank()) return false;
        InfoTentative info = tentatives.get(ipAddress);
        if (info == null) return false;
        if (fenetreExpiree(info)) {
            tentatives.remove(ipAddress);
            return false;
        }
        return info.nbTentatives() >= props.getMaxAttempts();
    }

    public void enregistrerTentative(String ipAddress) {
        if (ipAddress == null || ipAddress.isBlank()) return;
        tentatives.merge(ipAddress,
                new InfoTentative(1, LocalDateTime.now()),
                (existant, __) -> fenetreExpiree(existant)
                        ? new InfoTentative(1, LocalDateTime.now())
                        : new InfoTentative(existant.nbTentatives() + 1, existant.premiereTentative()));

        InfoTentative actuel = tentatives.get(ipAddress);
        if (actuel != null && actuel.nbTentatives() == props.getMaxAttempts()) {
            log.warn("[system] Rate-limit /register atteint pour IP {} - {} tentatives sur {} min",
                    ipAddress, actuel.nbTentatives(), props.getWindowMinutes());
        }
    }

    public long secondesRestantes(String ipAddress) {
        if (ipAddress == null) return 0;
        InfoTentative info = tentatives.get(ipAddress);
        if (info == null || fenetreExpiree(info)) return 0;
        LocalDateTime fin = info.premiereTentative().plusMinutes(props.getWindowMinutes());
        return Math.max(0, Duration.between(LocalDateTime.now(), fin).getSeconds());
    }

    private boolean fenetreExpiree(InfoTentative info) {
        return LocalDateTime.now().isAfter(info.premiereTentative().plusMinutes(props.getWindowMinutes()));
    }
}
