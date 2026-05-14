package com.myfinance.dto;

import java.time.LocalDateTime;
import java.util.List;

public record LogExcerptDto(
        boolean available,       // false en profil dev (logs console uniquement)
        String fileName,         // nom du fichier lu
        LocalDateTime windowStart,
        LocalDateTime windowEnd,
        int lineCount,
        List<String> lines
) {}
