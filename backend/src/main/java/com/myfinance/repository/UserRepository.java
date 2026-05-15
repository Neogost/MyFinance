package com.myfinance.repository;

import com.myfinance.domain.FamilyGroup;
import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByLogin(String login);
    List<User> findByFamilyGroup(FamilyGroup familyGroup);
    long countByRole(RoleEnum role);
}
