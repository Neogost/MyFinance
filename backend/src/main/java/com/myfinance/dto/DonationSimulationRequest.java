package com.myfinance.dto;

import com.myfinance.domain.BienType;
import com.myfinance.domain.FamilyRelationEnum;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;

public record DonationSimulationRequest(
        @NotNull Long recipientId,
        @NotNull @Positive BigDecimal assetValueEur,
        @NotBlank @Size(max = 200) String giftLabel,
        Boolean dismembered,

        /** Type de bien (MOBILIER par défaut, IMMOBILIER ajoute les taxes additionnelles). */
        BienType bienType,

        @DecimalMin("0.01") @DecimalMax("1.0") BigDecimal ownershipShare,
        @Positive BigDecimal customAmountEur,

        /**
         * Si renseigné, remplace le lookup DB des donations passées du donateur.
         * Permet de simuler pour quelqu'un qui n'est pas l'utilisateur connecté.
         */
        BigDecimal pastDonationsEurOverride,

        /** Informations sur le donateur si différent de l'utilisateur connecté. */
        @Size(max = 100) String donorName,
        FamilyRelationEnum donorRelationToRecipient,
        Boolean donorHandicap,
        Integer donorAge
) {}
