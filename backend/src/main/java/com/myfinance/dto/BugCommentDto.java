package com.myfinance.dto;

import com.myfinance.domain.BugComment;

import java.time.LocalDateTime;

public record BugCommentDto(
        Long id,
        String authorDisplay,
        String content,
        LocalDateTime createdAt
) {
    // adminView=true → login [ROLE] · adminView=false → prénom uniquement
    public static BugCommentDto from(BugComment c, boolean adminView) {
        String display = adminView
                ? c.getAuthor().getLogin() + " [" + c.getAuthor().getRole().name() + "]"
                : c.getAuthor().getFirstName();
        return new BugCommentDto(c.getId(), display, c.getContent(), c.getCreatedAt());
    }
}
