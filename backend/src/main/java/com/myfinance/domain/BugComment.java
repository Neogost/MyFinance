package com.myfinance.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "bug_comments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BugComment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bug_report_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private BugReport bugReport;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    // Non modifiable après soumission
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onPrePersist() {
        this.createdAt = LocalDateTime.now();
    }
}
