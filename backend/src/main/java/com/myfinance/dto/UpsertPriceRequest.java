package com.myfinance.dto;

import java.math.BigDecimal;

/** Corps de la requête PUT /api/admin/instruments/{id}/price-history/{date}. */
public record UpsertPriceRequest(BigDecimal price) {}
