package com.myfinance.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Set;

/**
 * Politique de mot de passe — règles métier complémentaires aux contraintes Bean Validation
 * (longueur, classes de caractères) appliquées sur les DTOs.
 *
 * Couvre trois familles d'attaques que les contraintes regex seules ne bloquent pas :
 *   - Devine évident : top des mots de passe courants (« Password1234! », « Azerty1234! »...).
 *   - Devine personnalisé : mot de passe contenant le login, le prénom ou le nom.
 *   - Réutilisation : changement vers le même mot de passe que l'actuel.
 */
@Service
@RequiredArgsConstructor
public class PasswordPolicyService {

    private final PasswordEncoder passwordEncoder;

    /**
     * Liste embarquée de variantes courantes qui passent la regex (12+ chars, maj/min/chiffre/spécial)
     * mais sont triviales à deviner. Liste volontairement courte et focalisée sur les patterns
     * fréquents en français/anglais — pas un substitut à HIBP/zxcvbn pour un usage à grande échelle.
     */
    private static final Set<String> COMMON_PASSWORDS = Set.of(
            "password1234!", "password12345!", "password123456!",
            "motdepasse123!", "motdepasse1234!",
            "welcome1234!", "welcome12345!",
            "qwerty1234!", "qwertyuiop1!",
            "azerty1234!", "azertyuiop1!",
            "admin12345!", "administrateur1!",
            "letmein1234!", "letmeinplease1!",
            "abcdef12345!", "abcdefgh1234!",
            "iloveyou1234!", "monsieur1234!",
            "user12345678!", "user123456789!",
            "test12345678!", "test123456789!",
            "myfinance1234!", "finance123456!"
    );

    public void validateNotCommon(String password) {
        if (password == null) return;
        if (COMMON_PASSWORDS.contains(password.toLowerCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Ce mot de passe est trop courant — choisissez-en un plus original.");
        }
    }

    public void validateNotContainsIdentity(String password, String login, String firstName, String lastName) {
        if (password == null || password.isBlank()) return;
        String lower = password.toLowerCase();
        for (String identity : new String[]{ login, firstName, lastName }) {
            if (identity == null || identity.isBlank() || identity.length() < 3) continue;
            if (lower.contains(identity.toLowerCase())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Le mot de passe ne doit pas contenir votre login, prénom ou nom.");
            }
        }
    }

    public void validateNotSameAsCurrent(String newPassword, String currentHash) {
        if (newPassword == null || currentHash == null) return;
        if (passwordEncoder.matches(newPassword, currentHash)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Le nouveau mot de passe doit être différent de l'actuel.");
        }
    }
}
