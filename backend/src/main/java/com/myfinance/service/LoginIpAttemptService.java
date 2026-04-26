package com.myfinance.service;

import com.myfinance.config.LoginIpAttemptProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate-limit IP-based des tentatives de connexion infructueuses.
 *
 * Complément à {@link LoginAttemptService} (qui tracke par login) :
 *   - LoginAttemptService : verrouillage par login pour limiter le credential stuffing sur un compte.
 *   - LoginIpAttemptService (ce service) : verrouillage par IP pour limiter le balayage massif depuis
 *     une même source. Empêche aussi qu'un attaquant ne DoS un compte précis (le compte se verrouille
 *     mais l'attaquant est lui aussi rate-limité par son IP, ce qui réduit la fenêtre d'attaque).
 *
 * Stockage en mémoire — réinitialisé au redémarrage du conteneur.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LoginIpAttemptService {

    private final LoginIpAttemptProperties props;

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

    public void enregistrerEchec(String ipAddress) {
        if (ipAddress == null || ipAddress.isBlank()) return;
        tentatives.merge(ipAddress,
                new InfoTentative(1, LocalDateTime.now()),
                (existant, __) -> fenetreExpiree(existant)
                        ? new InfoTentative(1, LocalDateTime.now())
                        : new InfoTentative(existant.nbTentatives() + 1, existant.premiereTentative()));

        InfoTentative actuel = tentatives.get(ipAddress);
        if (actuel != null && actuel.nbTentatives() == props.getMaxAttempts()) {
            log.warn("[system] Rate-limit /login atteint pour IP {} - {} tentatives sur {} min",
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
