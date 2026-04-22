package com.myfinance.service;

import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.SafetyNetMode;
import com.myfinance.domain.User;
import com.myfinance.dto.UpdatePersonalInfoRequest;
import com.myfinance.dto.UpdateSafetyNetRequest;
import com.myfinance.dto.UserDto;
import com.myfinance.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ProfileServiceTest {

    @Mock UserRepository userRepository;
    @InjectMocks ProfileService profileService;

    User user;

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).login("jean.dupont").role(RoleEnum.USER).build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    // ── MONTHS_EXPENSES ────────────────────────────────────────

    @Test
    void updateSafetyNet_monthsExpenses_enregistreLeNombreDeMois() {
        UpdateSafetyNetRequest req = new UpdateSafetyNetRequest(SafetyNetMode.MONTHS_EXPENSES, 4.0, null);

        UserDto result = profileService.updateSafetyNet(user, req);

        assertThat(result.safetyNetMode()).isEqualTo(SafetyNetMode.MONTHS_EXPENSES);
        assertThat(result.safetyNetMonths()).isEqualTo(4.0);
        assertThat(result.safetyNetAmount()).isNull();
    }

    // ── MONTHS_SALARY ──────────────────────────────────────────

    @Test
    void updateSafetyNet_monthsSalary_enregistreLeNombreDeMois() {
        UpdateSafetyNetRequest req = new UpdateSafetyNetRequest(SafetyNetMode.MONTHS_SALARY, 3.0, null);

        UserDto result = profileService.updateSafetyNet(user, req);

        assertThat(result.safetyNetMode()).isEqualTo(SafetyNetMode.MONTHS_SALARY);
        assertThat(result.safetyNetMonths()).isEqualTo(3.0);
        assertThat(result.safetyNetAmount()).isNull();
    }

    // ── FIXED_AMOUNT ───────────────────────────────────────────

    @Test
    void updateSafetyNet_fixedAmount_enregistreLeMontant() {
        UpdateSafetyNetRequest req = new UpdateSafetyNetRequest(SafetyNetMode.FIXED_AMOUNT, null, 15000.0);

        UserDto result = profileService.updateSafetyNet(user, req);

        assertThat(result.safetyNetMode()).isEqualTo(SafetyNetMode.FIXED_AMOUNT);
        assertThat(result.safetyNetAmount()).isEqualTo(15000.0);
        assertThat(result.safetyNetMonths()).isNull();
    }

    // ── Réinitialisation ───────────────────────────────────────

    @Test
    void updateSafetyNet_modeNull_effaceLaConfiguration() {
        user.setSafetyNetMode(SafetyNetMode.MONTHS_EXPENSES);
        user.setSafetyNetMonths(3.0);

        UpdateSafetyNetRequest req = new UpdateSafetyNetRequest(null, null, null);
        UserDto result = profileService.updateSafetyNet(user, req);

        assertThat(result.safetyNetMode()).isNull();
        assertThat(result.safetyNetMonths()).isNull();
        assertThat(result.safetyNetAmount()).isNull();
    }

    // ── Validations ────────────────────────────────────────────

    @Test
    void updateSafetyNet_monthsExpensesSansMois_leve400() {
        UpdateSafetyNetRequest req = new UpdateSafetyNetRequest(SafetyNetMode.MONTHS_EXPENSES, null, null);

        assertThatThrownBy(() -> profileService.updateSafetyNet(user, req))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));

        verify(userRepository, never()).save(any());
    }

    @Test
    void updateSafetyNet_monthsExpensesAvecMoisNul_leve400() {
        UpdateSafetyNetRequest req = new UpdateSafetyNetRequest(SafetyNetMode.MONTHS_EXPENSES, 0.0, null);

        assertThatThrownBy(() -> profileService.updateSafetyNet(user, req))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void updateSafetyNet_fixedAmountSansMontant_leve400() {
        UpdateSafetyNetRequest req = new UpdateSafetyNetRequest(SafetyNetMode.FIXED_AMOUNT, null, null);

        assertThatThrownBy(() -> profileService.updateSafetyNet(user, req))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    // ── Informations personnelles ──────────────────────────────

    @Test
    void updatePersonalInfo_enregistreLesChamps() {
        UpdatePersonalInfoRequest req = new UpdatePersonalInfoRequest("Paris", "75001", "Ingénieur logiciel");

        UserDto result = profileService.updatePersonalInfo(user, req);

        assertThat(result.birthPlace()).isEqualTo("Paris");
        assertThat(result.birthPostalCode()).isEqualTo("75001");
        assertThat(result.jobTitle()).isEqualTo("Ingénieur logiciel");
    }

    @Test
    void updatePersonalInfo_valeursNulles_effaceLesChamps() {
        user.setBirthPlace("Lyon");
        user.setJobTitle("Développeur");

        UpdatePersonalInfoRequest req = new UpdatePersonalInfoRequest(null, null, null);
        UserDto result = profileService.updatePersonalInfo(user, req);

        assertThat(result.birthPlace()).isNull();
        assertThat(result.birthPostalCode()).isNull();
        assertThat(result.jobTitle()).isNull();
    }
}
