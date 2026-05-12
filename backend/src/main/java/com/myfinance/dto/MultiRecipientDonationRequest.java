package com.myfinance.dto;

import com.myfinance.domain.BienType;
import com.myfinance.domain.FamilyRelationEnum;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * Donation d'un même bien à plusieurs bénéficiaires (typiquement les enfants).
 * Chaque bénéficiaire reçoit une part définie en %, chacun avec son propre abattement.
 * Les frais de notaire sont calculés une seule fois sur le total transmis.
 */
public record MultiRecipientDonationRequest(

        // ── Bien transmis ─────────────────────────────────────────────
        @NotBlank String giftLabel,
        @NotNull @Positive BigDecimal assetValueEur,
        Boolean dismembered,
        BienType bienType,

        // ── Donateur (réutilise les champs de DonationSimulationRequest) ──
        @DecimalMin("0.01") @DecimalMax("1.0") BigDecimal ownershipShare,
        @Positive BigDecimal customAmountEur,
        BigDecimal pastDonationsEurOverride,
        String donorName,
        Boolean donorHandicap,
        Integer donorAge,

        // ── Bénéficiaires avec leur part ──────────────────────────────
        @NotNull @Size(min = 1, max = 10) @Valid List<RecipientAllocation> recipients
) {
    public record RecipientAllocation(
            @NotNull Long recipientId,
            @NotNull @DecimalMin("0.01") @DecimalMax("1.0") BigDecimal share,
            /** Optionnel : surcharge la relation stockée sur le membre (utile pour donateur tiers). */
            FamilyRelationEnum relationOverride
    ) {}
}
