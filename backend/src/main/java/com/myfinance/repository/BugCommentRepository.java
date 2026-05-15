package com.myfinance.repository;

import com.myfinance.domain.BugComment;
import com.myfinance.domain.BugReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BugCommentRepository extends JpaRepository<BugComment, Long> {

    List<BugComment> findByBugReportOrderByCreatedAtAsc(BugReport bugReport);

    int countByBugReport(BugReport bugReport);

    void deleteByBugReport(BugReport bugReport);

    Optional<BugComment> findByIdAndBugReportId(Long id, Long bugReportId);
}
