package com.myfinance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SendInvitationRequest(
        @NotBlank @Size(max = 100) String login
) {}
