package com.myfinance.service;

import com.myfinance.domain.SafetyNetMode;
import com.myfinance.domain.User;
import com.myfinance.dto.UpdatePersonalInfoRequest;
import com.myfinance.dto.UpdateSafetyNetRequest;
import com.myfinance.dto.UserDto;
import com.myfinance.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ProfileService {

    private final UserRepository userRepository;

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

        return UserDto.from(userRepository.save(user));
    }

    public UserDto updatePersonalInfo(User currentUser, UpdatePersonalInfoRequest request) {
        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
        user.setBirthPlace(request.birthPlace());
        user.setBirthPostalCode(request.birthPostalCode());
        user.setJobTitle(request.jobTitle());
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
