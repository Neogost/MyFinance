package com.myfinance.dto;

import jakarta.validation.constraints.NotBlank;

public record SendInvitationRequest(
        @NotBlank String login
) {}
