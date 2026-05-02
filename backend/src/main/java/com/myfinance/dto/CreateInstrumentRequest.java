package com.myfinance.dto;

import com.myfinance.domain.AssetCategory;
import com.myfinance.domain.CryptoNetwork;
import com.myfinance.domain.CryptoType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateInstrumentRequest(
        @NotNull AssetCategory category,
        String isin,
        String ticker,
        @NotBlank String name,
        @NotBlank String currency,
        Boolean stablePrice,

        // Symbole Boursorama injecté tel quel dans une URL HTTP côté scheduler
        // (cf. BoursoramaClient). Whitelist de caractères pour bloquer toute tentative
        // de path traversal ou d'injection d'URL (../, %2F, ?, &, #, etc.).
        // La forme exacte des symboles n'est pas figée — on autorise simplement
        // alphanumérique + . _ - ce qui couvre toutes les conventions vues
        // (ex : 1rTESE, QQQ.PA, AC).
        @Size(max = 50)
        @Pattern(regexp = "^[A-Za-z0-9._-]+$",
                 message = "boursoramaSymbol ne peut contenir que des lettres, chiffres, points, tirets et underscores")
        String boursoramaSymbol,

        CryptoType cryptoType,
        CryptoNetwork cryptoNetwork
) {}
