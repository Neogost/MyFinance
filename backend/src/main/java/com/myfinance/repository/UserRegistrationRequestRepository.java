package com.myfinance.repository;

import com.myfinance.domain.RegistrationStatus;
import com.myfinance.domain.UserRegistrationRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserRegistrationRequestRepository extends JpaRepository<UserRegistrationRequest, Long> {

    List<UserRegistrationRequest> findAllByOrderByCreatedAtDesc();

    List<UserRegistrationRequest> findByStatusOrderByCreatedAtDesc(RegistrationStatus status);

    boolean existsByLoginAndStatus(String login, RegistrationStatus status);
}
