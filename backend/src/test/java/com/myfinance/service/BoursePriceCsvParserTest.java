package com.myfinance.service;

import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class BoursePriceCsvParserTest {

    private BoursePriceCsvParser.ParseResult parse(String csv) throws IOException {
        return BoursePriceCsvParser.parse(new ByteArrayInputStream(csv.getBytes(StandardCharsets.UTF_8)));
    }

    // ── Cas nominaux ──────────────────────────────────────────────────────────

    @Test
    void parse_formatIsoDecimaleVirgule() throws IOException {
        String csv = """
                date;price
                2024-01-02;432,15
                2024-01-03;433,20
                """;
        var result = parse(csv);
        assertThat(result.rows()).hasSize(2);
        assertThat(result.rows().get(0).date()).isEqualTo(LocalDate.of(2024, 1, 2));
        assertThat(result.rows().get(0).price()).isEqualByComparingTo("432.15");
        assertThat(result.errors()).isEmpty();
    }

    @Test
    void parse_formatFRDD_MM_YYYY() throws IOException {
        String csv = """
                date;price
                29/04/2026;267,35
                28/04/2026;267,79
                """;
        var result = parse(csv);
        assertThat(result.rows()).hasSize(2);
        assertThat(result.rows().get(0).date()).isEqualTo(LocalDate.of(2026, 4, 29));
        assertThat(result.rows().get(0).price()).isEqualByComparingTo("267.35");
    }

    @Test
    void parse_decimalePoint() throws IOException {
        String csv = """
                date;price
                2024-01-02;432.15
                """;
        var result = parse(csv);
        assertThat(result.rows()).hasSize(1);
        assertThat(result.rows().get(0).price()).isEqualByComparingTo("432.15");
    }

    @Test
    void parse_formatsMixesDansLeMemeFichier() throws IOException {
        // Cas Boursorama mélangé à des données ISO d'un autre source
        String csv = """
                date;price
                29/04/2026;267,35
                2024-01-02;432.15
                """;
        var result = parse(csv);
        assertThat(result.rows()).hasSize(2);
        assertThat(result.errors()).isEmpty();
    }

    // ── Commentaires et lignes spéciales ──────────────────────────────────────

    @Test
    void parse_lignesCommentaireIgnorees() throws IOException {
        String csv = """
                # Instrument: Amundi MSCI World CW8
                # Currency: EUR
                date;price
                2024-01-02;432,15
                """;
        var result = parse(csv);
        assertThat(result.rows()).hasSize(1);
        assertThat(result.errors()).isEmpty();
    }

    @Test
    void parse_lignesVidesIgnorees() throws IOException {
        String csv = "date;price\n2024-01-02;432,15\n\n\n2024-01-03;433,20\n";
        var result = parse(csv);
        assertThat(result.rows()).hasSize(2);
    }

    @Test
    void parse_bomUtf8Tolere() throws IOException {
        String csv = "﻿date;price\n2024-01-02;432,15\n";
        var result = parse(csv);
        assertThat(result.rows()).hasSize(1);
    }

    @Test
    void parse_headerAbsent_premiereLigneDataParsee() throws IOException {
        // Pas de header → la première ligne valide est traitée comme data
        String csv = "2024-01-02;432,15\n2024-01-03;433,20\n";
        var result = parse(csv);
        assertThat(result.rows()).hasSize(2);
    }

    @Test
    void parse_headerInsensibleACasse() throws IOException {
        String csv = "DATE;PRICE\n2024-01-02;432,15\n";
        var result = parse(csv);
        assertThat(result.rows()).hasSize(1);
    }

    // ── Cas d'erreur ──────────────────────────────────────────────────────────

    @Test
    void parse_dateInvalide_skipEtErreur() throws IOException {
        String csv = """
                date;price
                pasUneDate;432,15
                2024-01-02;433,20
                """;
        var result = parse(csv);
        assertThat(result.rows()).hasSize(1);
        assertThat(result.errors()).hasSize(1);
        assertThat(result.errors().get(0)).contains("date invalide").contains("pasUneDate");
    }

    @Test
    void parse_dateImpossible_skip() throws IOException {
        String csv = """
                date;price
                32/02/2024;100,00
                """;
        var result = parse(csv);
        assertThat(result.rows()).isEmpty();
        assertThat(result.errors()).hasSize(1);
    }

    @Test
    void parse_prixNonNumerique_skipEtErreur() throws IOException {
        String csv = """
                date;price
                2024-01-02;NA
                2024-01-03;433,20
                """;
        var result = parse(csv);
        assertThat(result.rows()).hasSize(1);
        assertThat(result.errors()).hasSize(1);
        assertThat(result.errors().get(0)).contains("prix invalide");
    }

    @Test
    void parse_prixNegatif_skipEtErreur() throws IOException {
        String csv = """
                date;price
                2024-01-02;-100,00
                """;
        var result = parse(csv);
        assertThat(result.rows()).isEmpty();
        assertThat(result.errors()).hasSize(1);
        assertThat(result.errors().get(0)).contains("strictement positif");
    }

    @Test
    void parse_lignesIncompletes_skip() throws IOException {
        String csv = """
                date;price
                2024-01-02
                """;
        var result = parse(csv);
        assertThat(result.rows()).isEmpty();
        assertThat(result.errors()).hasSize(1);
        assertThat(result.errors().get(0)).contains("format invalide");
    }

    @Test
    void parse_prixAvecSeparateurMilliers_FR() throws IOException {
        // 1.234,56 (format FR avec milliers)
        String csv = """
                date;price
                2024-01-02;1.234,56
                """;
        var result = parse(csv);
        assertThat(result.rows()).hasSize(1);
        assertThat(result.rows().get(0).price()).isEqualByComparingTo("1234.56");
    }

    @Test
    void parse_prixAvecSeparateurMilliers_US() throws IOException {
        // 1,234.56 (format US avec milliers)
        String csv = """
                date;price
                2024-01-02;1,234.56
                """;
        var result = parse(csv);
        assertThat(result.rows()).hasSize(1);
        assertThat(result.rows().get(0).price()).isEqualByComparingTo("1234.56");
    }

    @Test
    void parse_collectionLimiteeA50Erreurs() throws IOException {
        StringBuilder sb = new StringBuilder("date;price\n");
        for (int i = 0; i < 100; i++) sb.append("invalide;NA\n");
        var result = parse(sb.toString());
        assertThat(result.rows()).isEmpty();
        assertThat(result.errors()).hasSize(50); // capé à 50
    }
}
