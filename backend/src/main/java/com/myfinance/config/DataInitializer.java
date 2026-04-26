package com.myfinance.config;

import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.User;
import com.myfinance.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

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
}
