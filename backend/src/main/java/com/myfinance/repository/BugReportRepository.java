package com.myfinance.repository;

import com.myfinance.domain.BugReport;
import com.myfinance.domain.BugStatus;
import com.myfinance.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BugReportRepository extends JpaRepository<BugReport, Long> {

    List<BugReport> findAllByOrderByCreatedAtDesc();

    List<BugReport> findByStatusOrderByCreatedAtDesc(BugStatus status);

    List<BugReport> findByReporter(User reporter);
}
