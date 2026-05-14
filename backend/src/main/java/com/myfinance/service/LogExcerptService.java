package com.myfinance.service;

import com.myfinance.domain.BugReport;
import com.myfinance.dto.LogExcerptDto;
import com.myfinance.repository.BugReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.BufferedReader;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class LogExcerptService {

    private static final DateTimeFormatter LOG_TS = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final Pattern LOG_LINE = Pattern.compile("^(\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}) .*");
    private static final int MAX_LINES = 500;

    private final BugReportRepository bugReportRepository;

    // Non défini en dev → logs console uniquement
    @Value("${myfinance.logs.directory:}")
    private String logsDirectory;

    public LogExcerptDto extract(Long bugId, int windowMinutes) {
        BugReport bug = bugReportRepository.findById(bugId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Bug introuvable : " + bugId));

        if (logsDirectory == null || logsDirectory.isBlank()) {
            return new LogExcerptDto(false, null, null, null, 0, List.of());
        }

        // Référence temporelle : approximateDateTime si renseignée, sinon createdAt
        LocalDateTime ref = bug.getApproximateDateTime() != null
                ? bug.getApproximateDateTime()
                : bug.getCreatedAt();

        LocalDateTime windowStart = ref.minusMinutes(windowMinutes);
        LocalDateTime windowEnd   = ref.plusMinutes(windowMinutes);

        Path logFile = resolveLogFile(ref.toLocalDate());
        if (logFile == null || !Files.exists(logFile)) {
            return new LogExcerptDto(false, null, windowStart, windowEnd, 0, List.of());
        }

        List<String> lines = filterLines(logFile, windowStart, windowEnd);
        return new LogExcerptDto(true, logFile.getFileName().toString(),
                windowStart, windowEnd, lines.size(), lines);
    }

    // Cherche le fichier de log pour la date donnée.
    // Pour aujourd'hui on tente d'abord le fichier actif (sans date), puis l'archivé.
    private Path resolveLogFile(LocalDate date) {
        String dated  = "myfinance." + date + ".log";
        String active = "myfinance.log";

        Path base = Paths.get(logsDirectory);
        if (date.equals(LocalDate.now())) {
            Path p = base.resolve(active);
            if (Files.exists(p)) return p;
        }
        return base.resolve(dated);
    }

    // Lit le fichier et retourne les lignes dans la fenêtre temporelle.
    // Les lignes sans timestamp (suite de stack trace) sont incluses si la ligne
    // parente était dans la fenêtre.
    private List<String> filterLines(Path file, LocalDateTime start, LocalDateTime end) {
        List<String> result = new ArrayList<>();
        boolean inWindow = false;

        try (BufferedReader reader = Files.newBufferedReader(file)) {
            String line;
            while ((line = reader.readLine()) != null && result.size() < MAX_LINES) {
                var matcher = LOG_LINE.matcher(line);
                if (matcher.matches()) {
                    LocalDateTime ts = LocalDateTime.parse(matcher.group(1), LOG_TS);
                    inWindow = !ts.isBefore(start) && !ts.isAfter(end);
                }
                // Ligne de continuation (ex : stack trace) : suit la décision parente
                if (inWindow) {
                    result.add(line);
                }
            }
        } catch (IOException e) {
            log.warn("Impossible de lire le fichier de logs : {}", file, e);
        }

        return result;
    }
}
