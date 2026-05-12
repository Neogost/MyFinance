package com.myfinance.dto;

import com.myfinance.domain.BienType;
import com.myfinance.domain.FamilyRelationEnum;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * Donation conjointe (2 donateurs) à plusieurs bénéficiaires.
 * Combine : 2 donateurs × N bénéficiaires.
 * Chaque pair (donateur, bénéficiaire) a son propre abattement.
 */
public record JointMultiRecipientDonationRequest(

        // ── Bien transmis ─────────────────────────────────────────────
        @NotBlank String giftLabel,
        @NotNull @Positive BigDecimal assetValueEur,
        Boolean dismembered,
        BienType bienType,

        // ── Donateur 1 ────────────────────────────────────────────────
        @DecimalMin("0.01") @DecimalMax("1.0") BigDecimal donor1Share,
        @Positive BigDecimal donor1CustomAmountEur,
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
        Integer donor2Age,

        // ── Bénéficiaires ────────────────────────────────────────────
        @NotNull @Size(min = 1, max = 10) @Valid List<MultiRecipientDonationRequest.RecipientAllocation> recipients
) {}
