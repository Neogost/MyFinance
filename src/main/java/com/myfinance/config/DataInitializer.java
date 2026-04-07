package com.myfinance.config;

import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.User;
import com.myfinance.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.findByLogin("Neogost").isEmpty()) {
            User admin = User.builder()
                    .firstName("Neogost")
                    .lastName("")
                    .login("Neogost")
                    .password(passwordEncoder.encode("admin"))
                    .role(RoleEnum.ADMIN)
                    .build();

            userRepository.save(admin);
            log.info("Utilisateur initial créé : Neogost (ADMIN)");
        }
    }
}
