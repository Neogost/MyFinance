package com.myfinance.service;

import lombok.extern.slf4j.Slf4j;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;

/**
 * Parser permissif pour l'import CSV des cours BOURSE.
 * Format documenté dans docs/architecture/patrimoine-performance.md section 2.3.
 *
 * Tolérances :
 * - Lignes commençant par # → commentaires ignorés
 * - Header "date;price" → ignoré (insensible à la casse)
 * - Dates : YYYY-MM-DD (ISO) ou DD/MM/YYYY (FR), détection auto par ligne
 * - Décimales : virgule ou point, détection auto
 * - BOM UTF-8 toléré
 * - Lignes invalides → skip + entrée dans errors[]
 */
@Slf4j
public class BoursePriceCsvParser {

    public static final int MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 Mo
    public static final int MAX_LINES = 50_000;
    private static final int MAX_ERRORS_KEPT = 50;

    private static final DateTimeFormatter ISO   = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter FR    = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public record ParsedRow(LocalDate date, BigDecimal price) {}

    public record ParseResult(List<ParsedRow> rows, List<String> errors, int totalLinesRead) {}

    public static ParseResult parse(InputStream input) throws IOException {
        List<ParsedRow> rows = new ArrayList<>();
        List<String> errors = new ArrayList<>();
        int totalLines = 0;

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(input, StandardCharsets.UTF_8))) {
            String line;
            int lineNumber = 0;
            boolean headerSeen = false;

            while ((line = reader.readLine()) != null) {
                lineNumber++;
                totalLines++;

                if (lineNumber > MAX_LINES) {
                    errors.add(String.format("Ligne %d : limite de %d lignes dépassée — fichier tronqué", lineNumber, MAX_LINES));
                    break;
                }

                // Strip BOM UTF-8 si présent en première ligne
                if (lineNumber == 1 && !line.isEmpty() && line.charAt(0) == '﻿') {
                    line = line.substring(1);
                }

                String trimmed = line.strip();
                if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                    continue; // commentaire ou ligne vide
                }

                // Détection du header (insensible à la casse, peu importe l'ordre)
                String lower = trimmed.toLowerCase();
                if (!headerSeen && (lower.equals("date;price") || lower.equals("date;prix") || lower.startsWith("date;"))) {
                    headerSeen = true;
                    continue;
                }

                // Parsing de la ligne data
                String[] parts = trimmed.split(";", -1);
                if (parts.length < 2) {
                    addError(errors, lineNumber, "format invalide (attendu date;price)");
                    continue;
                }

                String dateStr  = parts[0].strip();
                String priceStr = parts[1].strip();

                LocalDate date = parseDate(dateStr);
                if (date == null) {
                    addError(errors, lineNumber, "date invalide : '" + dateStr + "' (formats acceptés : YYYY-MM-DD ou DD/MM/YYYY)");
                    continue;
                }

                BigDecimal price = parsePrice(priceStr);
                if (price == null) {
                    addError(errors, lineNumber, "prix invalide : '" + priceStr + "'");
                    continue;
                }
                if (price.signum() <= 0) {
                    addError(errors, lineNumber, "prix doit être strictement positif : " + price);
                    continue;
                }

                rows.add(new ParsedRow(date, price));
            }
        }

        log.info("[CSV] Parse terminé : {} lignes lues, {} valides, {} erreurs",
                totalLines, rows.size(), errors.size());
        return new ParseResult(rows, errors, totalLines);
    }

    private static LocalDate parseDate(String s) {
        // Détection auto : présence de '/' = format FR, sinon ISO
        if (s.contains("/")) {
            try { return LocalDate.parse(s, FR); } catch (DateTimeParseException ignored) { return null; }
        }
        try { return LocalDate.parse(s, ISO); } catch (DateTimeParseException ignored) { return null; }
    }

    private static BigDecimal parsePrice(String s) {
        if (s.isEmpty()) return null;
        // Si une virgule ET un point : ambigu (probablement séparateur de milliers + décimale)
        // On enlève les espaces (séparateur de milliers FR) et on remplace virgule par point
        String normalized = s.replace(" ", "").replace(" ", "");
        if (normalized.contains(",") && normalized.contains(".")) {
            // Ex: "1,234.56" (US avec milliers) ou "1.234,56" (FR avec milliers)
            int lastComma = normalized.lastIndexOf(',');
            int lastDot   = normalized.lastIndexOf('.');
            if (lastComma > lastDot) {
                // virgule en dernier = décimale FR, points = milliers
                normalized = normalized.replace(".", "").replace(",", ".");
            } else {
                // point en dernier = décimale US, virgules = milliers
                normalized = normalized.replace(",", "");
            }
        } else if (normalized.contains(",")) {
            // Seule virgule présente : décimale FR
            normalized = normalized.replace(",", ".");
        }
        try {
            return new BigDecimal(normalized);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static void addError(List<String> errors, int lineNumber, String message) {
        if (errors.size() < MAX_ERRORS_KEPT) {
            errors.add(String.format("Ligne %d : %s", lineNumber, message));
        }
    }
}
