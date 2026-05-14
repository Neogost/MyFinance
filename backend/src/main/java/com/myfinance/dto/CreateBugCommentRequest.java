package com.myfinance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateBugCommentRequest(
        @NotBlank @Size(max = 2000) String content
) {}
