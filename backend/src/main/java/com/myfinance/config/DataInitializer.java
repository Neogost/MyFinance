package com.myfinance.config;

import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.User;
import com.myfinance.repository.UserRepository;
import com.myfinance.service.PasswordPolicyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements ApplicationRunner {

    // Politique appliquée par CreateUserRequest @Pattern — gardée alignée volontairement.
    private static final String PASSWORD_PATTERN =
            "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z\\d]).*$";
    private static final int MIN_PASSWORD_LENGTH = 12;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordPolicyService passwordPolicyService;

    // Mot de passe initial du compte admin — doit être fourni au premier démarrage
    // via la propriété Spring `myfinance.admin.initial-password` (ou la variable
    // d'environnement MYFINANCE_ADMIN_INITIAL_PASSWORD). Aucune valeur par défaut :
    // le démarrage échoue si la base est vide et la propriété non renseignée.
    @Value("${myfinance.admin.initial-password:}")
    private String initialAdminPassword;

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.count() != 0) return;

        if (initialAdminPassword == null || initialAdminPassword.isBlank()) {
            throw new IllegalStateException(
                    "Aucun utilisateur en base et la propriété 'myfinance.admin.initial-password' "
                  + "(variable d'environnement MYFINANCE_ADMIN_INITIAL_PASSWORD) n'est pas définie. "
                  + "Définissez-la avant de démarrer l'application pour créer le compte admin initial.");
        }

        validateInitialAdminPassword(initialAdminPassword);

        User admin = User.builder()
                .firstName("Admin")
                .lastName("Admin")
                .login("admin")
                .password(passwordEncoder.encode(initialAdminPassword))
                .role(RoleEnum.ADMIN)
                .build();
        userRepository.save(admin);
        log.warn("Compte administrateur initial créé (login=admin). "
                + "Connectez-vous et changez ce mot de passe immédiatement.");
    }

    /**
     * Applique la même politique que pour la création d'un user via API (CreateUserRequest +
     * PasswordPolicyService) : empêche un admin négligent d'amorcer la prod avec
     * MYFINANCE_ADMIN_INITIAL_PASSWORD=admin123 et donc un compte ouvert à brute-force trivial.
     */
    private void validateInitialAdminPassword(String pwd) {
        if (pwd.length() < MIN_PASSWORD_LENGTH) {
            throw new IllegalStateException(
                    "MYFINANCE_ADMIN_INITIAL_PASSWORD doit contenir au moins "
                  + MIN_PASSWORD_LENGTH + " caractères.");
        }
        if (!pwd.matches(PASSWORD_PATTERN)) {
            throw new IllegalStateException(
                    "MYFINANCE_ADMIN_INITIAL_PASSWORD doit contenir au moins une minuscule, "
                  + "une majuscule, un chiffre et un caractère spécial.");
        }
        try {
            passwordPolicyService.validateNotCommon(pwd);
            passwordPolicyService.validateNotContainsIdentity(pwd, "admin", "Admin", "Admin");
        } catch (ResponseStatusException e) {
            throw new IllegalStateException("MYFINANCE_ADMIN_INITIAL_PASSWORD : " + e.getReason(), e);
        }
    }
}
