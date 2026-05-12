package com.myfinance.repository;

import com.myfinance.domain.FamilyMember;
import com.myfinance.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FamilyMemberRepository extends JpaRepository<FamilyMember, Long> {

    List<FamilyMember> findByUserOrderByRelationAscFirstNameAsc(User user);

    Optional<FamilyMember> findByIdAndUser(Long id, User user);
}
