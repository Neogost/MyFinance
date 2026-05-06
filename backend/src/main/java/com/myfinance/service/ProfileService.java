package com.myfinance.service;

import com.myfinance.config.BaremeKilometriqueProperties;
import com.myfinance.domain.SafetyNetMode;
import com.myfinance.domain.User;
import com.myfinance.dto.UpdateFiscalProfileRequest;
import com.myfinance.dto.UpdatePersonalInfoRequest;
import com.myfinance.dto.UpdateSafetyNetRequest;
import com.myfinance.dto.UserDto;
import com.myfinance.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProfileService {

    private final UserRepository userRepository;
    private final BaremeKilometriqueProperties baremeProps;

    public UserDto updateSafetyNet(User currentUser, UpdateSafetyNetRequest request) {
        validate(request);

        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        user.setSafetyNetMode(request.safetyNetMode());

        if (request.safetyNetMode() == null) {
            user.setSafetyNetMonths(null);
            user.setSafetyNetAmount(null);
        } else if (request.safetyNetMode() == SafetyNetMode.FIXED_AMOUNT) {
            user.setSafetyNetAmount(request.safetyNetAmount());
            user.setSafetyNetMonths(null);
        } else {
            user.setSafetyNetMonths(request.safetyNetMonths());
            user.setSafetyNetAmount(null);
        }

        UserDto dto = UserDto.from(userRepository.save(user));
        log.info("[user:{}] Matelas de sécurité mis à jour [mode: {}]", currentUser.getId(), request.safetyNetMode());
        return dto;
    }

    public UserDto updateFiscalProfile(User currentUser, UpdateFiscalProfileRequest request) {
        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        user.setFiscalParts(request.fiscalParts());
        user.setUseFlatRateDeduction(request.useFlatRateDeduction());
        user.setJointTaxation(Boolean.TRUE.equals(request.jointTaxation()));

        if (Boolean.FALSE.equals(request.useFlatRateDeduction())) {
            user.setRealExpensesTransportKm(request.realExpensesTransportKm());
            user.setRealExpensesTransportCv(request.realExpensesTransportCv());
            user.setRealExpensesTransportElectric(request.realExpensesTransportElectric());
            user.setRealExpensesPublicTransport(request.realExpensesPublicTransport());
            user.setRealExpensesMeals(request.realExpensesMeals());
            user.setRealExpensesClothing(request.realExpensesClothing());
            user.setRealExpensesTraining(request.realExpensesTraining());
            user.setRealExpensesEquipment(request.realExpensesEquipment());
            user.setRealExpensesPhone(request.realExpensesPhone());
            user.setRealExpensesDoubleResidence(request.realExpensesDoubleResidence());
            user.setRealExpensesOther(request.realExpensesOther());
            user.setRealExpensesTeleworkDays(request.realExpensesTeleworkDays());
            user.setRealExpensesTeleworkEmployerDaily(request.realExpensesTeleworkEmployerDaily());
            user.setCustomProfessionalDeduction(computeTotalRealExpenses(request));
        } else {
            user.setRealExpensesTransportKm(null);
            user.setRealExpensesTransportCv(null);
            user.setRealExpensesTransportElectric(null);
            user.setRealExpensesPublicTransport(null);
            user.setRealExpensesMeals(null);
            user.setRealExpensesClothing(null);
            user.setRealExpensesTraining(null);
            user.setRealExpensesEquipment(null);
            user.setRealExpensesPhone(null);
            user.setRealExpensesDoubleResidence(null);
            user.setRealExpensesOther(null);
            user.setRealExpensesTeleworkDays(null);
            user.setRealExpensesTeleworkEmployerDaily(null);
            user.setCustomProfessionalDeduction(null);
        }

        UserDto dto = UserDto.from(userRepository.save(user));
        log.info("[user:{}] Profil fiscal mis à jour", currentUser.getId());
        return dto;
    }

    public UserDto updatePersonalInfo(User currentUser, UpdatePersonalInfoRequest request) {
        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
        if (request.firstName() != null && !request.firstName().isBlank()) user.setFirstName(request.firstName());
        if (request.lastName()  != null && !request.lastName().isBlank())  user.setLastName(request.lastName());
        user.setBirthDate(request.birthDate());
        user.setBirthPlace(request.birthPlace());
        user.setBirthPostalCode(request.birthPostalCode());
        user.setJobTitle(request.jobTitle());
        UserDto dto = UserDto.from(userRepository.save(user));
        log.info("[user:{}] Informations personnelles mises à jour", currentUser.getId());
        return dto;
    }

    private static final float TELEWORK_DAILY_RATE = 2.50f;

    private float computeTeleworkAllowance(Integer days, Float employerDaily) {
        if (days == null || days <= 0) return 0f;
        float employerRate = employerDaily != null ? employerDaily : 0f;
        return Math.round(days * Math.max(0f, TELEWORK_DAILY_RATE - employerRate));
    }

    private float computeKilometriqueAllowance(Integer km, Integer cv, Boolean electric) {
        if (km == null || km <= 0 || cv == null) return 0f;

        BaremeKilometriqueProperties.VoitureBareme voiture = baremeProps.getVoitures().stream()
                .filter(v -> cv <= v.getCvMax())
                .findFirst()
                .orElseGet(() -> baremeProps.getVoitures().get(baremeProps.getVoitures().size() - 1));

        BaremeKilometriqueProperties.Tranche tranche = voiture.getTranches().stream()
                .filter(t -> t.getKmMax() == null || km <= t.getKmMax())
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Barème kilométrique incomplet pour CV=" + cv + " km=" + km));

        float amount = km * (float) tranche.getTaux() + (float) tranche.getForfait();
        if (Boolean.TRUE.equals(electric)) {
            amount *= (float) baremeProps.getMultiplicateurElectrique();
        }
        return Math.round(amount);
    }

    private float computeTotalRealExpenses(UpdateFiscalProfileRequest req) {
        return computeKilometriqueAllowance(req.realExpensesTransportKm(), req.realExpensesTransportCv(), req.realExpensesTransportElectric())
                + nvl(req.realExpensesPublicTransport())
                + nvl(req.realExpensesMeals())
                + computeTeleworkAllowance(req.realExpensesTeleworkDays(), req.realExpensesTeleworkEmployerDaily())
                + nvl(req.realExpensesClothing())
                + nvl(req.realExpensesTraining())
                + nvl(req.realExpensesEquipment())
                + nvl(req.realExpensesPhone())
                + nvl(req.realExpensesDoubleResidence())
                + nvl(req.realExpensesOther());
    }

    private float nvl(Float f) {
        return f != null ? f : 0f;
    }

    public UserDto updateAnalyticsOptOut(User currentUser, boolean optOut) {
        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
        user.setAnalyticsOptOut(optOut);
        return UserDto.from(userRepository.save(user));
    }

    private void validate(UpdateSafetyNetRequest request) {
        if (request.safetyNetMode() == null) return;

        switch (request.safetyNetMode()) {
            case MONTHS_EXPENSES, MONTHS_SALARY -> {
                if (request.safetyNetMonths() == null || request.safetyNetMonths() <= 0) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "safetyNetMonths doit être > 0 pour ce mode");
                }
            }
            case FIXED_AMOUNT -> {
                if (request.safetyNetAmount() == null || request.safetyNetAmount() <= 0) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "safetyNetAmount doit être > 0 pour le mode FIXED_AMOUNT");
                }
            }
        }
    }
}
