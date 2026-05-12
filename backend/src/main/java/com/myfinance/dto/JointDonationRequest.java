package com.myfinance.dto;

import com.myfinance.domain.BienType;
import com.myfinance.domain.FamilyRelationEnum;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;

/**
 * Donation conjointe de deux co-propriétaires à un même bénéficiaire.
 * Les deux donateurs peuvent être l'utilisateur connecté ou des tiers saisis manuellement.
 */
public record JointDonationRequest(

        // ── Bien transmis ─────────────────────────────────────────────
        @NotNull Long recipientId,
        @NotBlank String giftLabel,
        @NotNull @Positive BigDecimal assetValueEur,
        Boolean dismembered,
        BienType bienType,

        // ── Donateur 1 ────────────────────────────────────────────────
        @DecimalMin("0.01") @DecimalMax("1.0") BigDecimal donor1Share,
        @Positive BigDecimal donor1CustomAmountEur,
        /** null = lookup DB (utilisateur connecté). Renseigné = simulation pour un tiers. */
        BigDecimal donor1PastDonationsEur,
        String donor1Name,
        FamilyRelationEnum donor1Relation,
        Boolean donor1Handicap,
        Integer donor1Age,

        // ── Donateur 2 ────────────────────────────────────────────────
        @NotBlank String donor2Name,
        @NotNull FamilyRelationEnum donor2Relation,
        Boolean donor2Handicap,
        @DecimalMin("0.01") @DecimalMax("1.0") BigDecimal donor2Share,
        @Positive BigDecimal donor2CustomAmountEur,
        BigDecimal donor2PastDonationsEur,
        Integer donor2Age
) {}
