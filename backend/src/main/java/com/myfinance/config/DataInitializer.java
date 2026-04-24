package com.myfinance.config;

import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.User;
import com.myfinance.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.count() == 0) {
            User admin = User.builder()
                    .firstName("Admin")
                    .lastName("Admin")
                    .login("admin")
                    .password(passwordEncoder.encode("Admin1234!"))
                    .role(RoleEnum.ADMIN)
                    .build();
            userRepository.save(admin);
            log.warn("===========================================================");
            log.warn("COMPTE ADMIN CRÉÉ : login=admin / password=Admin1234!");
            log.warn("Changez ce mot de passe dès la première connexion !");
            log.warn("===========================================================");
        }
    }
}
