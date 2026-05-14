package com.myfinance.repository;

import com.myfinance.domain.BugReport;
import com.myfinance.domain.BugVote;
import com.myfinance.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BugVoteRepository extends JpaRepository<BugVote, Long> {

    Optional<BugVote> findByBugReportAndVoter(BugReport bugReport, User voter);

    List<BugVote> findByBugReport(BugReport bugReport);

    // Tous les votes d'un utilisateur — une seule requête pour enrichir la liste des bugs
    List<BugVote> findByVoter(User voter);

    // Score d'un bug : somme pondérée (UP=+1, DOWN=-1) en une seule requête
    @Query("SELECT SUM(CASE v.voteType WHEN 'UP' THEN 1 ELSE -1 END) FROM BugVote v WHERE v.bugReport = :bug")
    Integer calculateScore(@Param("bug") BugReport bugReport);

    void deleteByBugReportAndVoter(BugReport bugReport, User voter);

    void deleteByBugReport(BugReport bugReport);
}
