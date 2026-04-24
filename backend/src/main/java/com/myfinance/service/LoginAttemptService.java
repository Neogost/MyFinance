package com.myfinance.service;

import com.myfinance.config.LoginRateLimitProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class LoginAttemptService {

    private final LoginRateLimitProperties props;

    private record InfoTentative(int nbEchecs, LocalDateTime dernierEchec) {}

    private final ConcurrentHashMap<String, InfoTentative> tentatives = new ConcurrentHashMap<>();

    public void enregistrerSucces(String login) {
        tentatives.remove(login);
    }

    public void enregistrerEchec(String login) {
        if (login == null || login.isBlank()) return;
        tentatives.merge(login,
                new InfoTentative(1, LocalDateTime.now()),
                (existant, __) -> new InfoTentative(existant.nbEchecs() + 1, LocalDateTime.now()));

        int nbEchecs = tentatives.get(login).nbEchecs();
        int max = props.getMaxAttempts();
        if (nbEchecs == max - 1) {
            log.warn("[system] Alerte brute-force - {} échec(s) sur un compte [prochain tentative = blocage]", nbEchecs);
        } else if (nbEchecs >= max) {
            long duree = dureeBlocageMinutes(nbEchecs);
            log.warn("[system] Compte bloqué après {} échec(s) - durée: {} min", nbEchecs, duree);
        }
    }

    public boolean estBloque(String login) {
        if (login == null) return false;
        InfoTentative info = tentatives.get(login);
        if (info == null || info.nbEchecs() < props.getMaxAttempts()) return false;
        return LocalDateTime.now().isBefore(heureDeblocage(info));
    }

    public int getNbEchecs(String login) {
        if (login == null) return 0;
        InfoTentative info = tentatives.get(login);
        return info != null ? info.nbEchecs() : 0;
    }

    public long secondesRestantes(String login) {
        if (login == null) return 0;
        InfoTentative info = tentatives.get(login);
        if (info == null || info.nbEchecs() < props.getMaxAttempts()) return 0;
        return Math.max(0, Duration.between(LocalDateTime.now(), heureDeblocage(info)).getSeconds());
    }

    private LocalDateTime heureDeblocage(InfoTentative info) {
        return info.dernierEchec().plusMinutes(dureeBlocageMinutes(info.nbEchecs()));
    }

    // Durée exponentielle : baseLockMinutes → ×2 → ×4 … plafonné à maxLockMinutes
    long dureeBlocageMinutes(int nbEchecs) {
        if (nbEchecs < props.getMaxAttempts()) return 0;
        int bloc = (nbEchecs - props.getMaxAttempts()) / props.getMaxAttempts();
        long duree = props.getBaseLockMinutes() * (1L << bloc);
        return Math.min(duree, props.getMaxLockMinutes());
    }
}
