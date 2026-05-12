package com.myfinance.dto;

import java.math.BigDecimal;
import java.util.List;

public record CtoCessionsSummaryDto(
        int year,
        List<CtoCessionDto> cessions,
        BigDecimal netCapitalGainEur,  // Σ(PV) - Σ(MV) sur l'année
        BigDecimal case3VG,            // max(0, net) → case 3VG de la 2042C
        BigDecimal case3VH             // abs(min(0, net)) → case 3VH de la 2042C
) {}
