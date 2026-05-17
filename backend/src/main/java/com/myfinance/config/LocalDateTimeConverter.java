package com.myfinance.config;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

/**
 * Convertisseur JPA pour LocalDateTime → TEXT SQLite.
 * Contourne le comportement de Hibernate 6 qui stocke les timestamps
 * via setTimestamp(utcCalendar) ce que SQLite JDBC encode en epoch ms,
 * rendant la relecture via getTimestamp() impossible.
 */
@Converter(autoApply = false)
public class LocalDateTimeConverter implements AttributeConverter<LocalDateTime, String> {

    private static final DateTimeFormatter WITH_MILLIS    = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS");
    private static final DateTimeFormatter WITHOUT_MILLIS = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Override
    public String convertToDatabaseColumn(LocalDateTime attribute) {
        return attribute == null ? null : attribute.format(WITH_MILLIS);
    }

    @Override
    public LocalDateTime convertToEntityAttribute(String dbData) {
        if (dbData == null) return null;
        try {
            return LocalDateTime.parse(dbData, WITH_MILLIS);
        } catch (DateTimeParseException e) {
            return LocalDateTime.parse(dbData, WITHOUT_MILLIS);
        }
    }
}
