package com.myfinance.service;

import com.myfinance.config.BaremeKilometriqueProperties;
import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.SafetyNetMode;
import com.myfinance.domain.User;
import com.myfinance.dto.UpdateFiscalProfileRequest;
import com.myfinance.dto.UpdatePersonalInfoRequest;
import com.myfinance.dto.UpdateSafetyNetRequest;
import com.myfinance.dto.UserDto;
import com.myfinance.repository.UserRepository;

import java.util.List;
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
    @Mock BaremeKilometriqueProperties baremeProps;
    @InjectMocks ProfileService profileService;

    User user;

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).login("jean.dupont").role(RoleEnum.USER).build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // Barème kilométrique minimal pour les tests de calcul km
        BaremeKilometriqueProperties.Tranche t1 = new BaremeKilometriqueProperties.Tranche();
        t1.setKmMax(3000); t1.setTaux(0.636); t1.setForfait(0.0);
        BaremeKilometriqueProperties.Tranche t2 = new BaremeKilometriqueProperties.Tranche();
        t2.setKmMax(null); t2.setTaux(0.478); t2.setForfait(0.0);
        BaremeKilometriqueProperties.VoitureBareme voiture = new BaremeKilometriqueProperties.VoitureBareme();
        voiture.setCvMax(5); voiture.setLabel("5 CV"); voiture.setTranches(List.of(t1, t2));
        when(baremeProps.getVoitures()).thenReturn(List.of(voiture));
        when(baremeProps.getMultiplicateurElectrique()).thenReturn(1.20);
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
        UpdatePersonalInfoRequest req = new UpdatePersonalInfoRequest("Kévin", "Dupont", null, "Paris", "75001", "Ingénieur logiciel");

        UserDto result = profileService.updatePersonalInfo(user, req);

        assertThat(result.firstName()).isEqualTo("Kévin");
        assertThat(result.lastName()).isEqualTo("Dupont");
        assertThat(result.birthPlace()).isEqualTo("Paris");
        assertThat(result.birthPostalCode()).isEqualTo("75001");
        assertThat(result.jobTitle()).isEqualTo("Ingénieur logiciel");
    }

    @Test
    void updatePersonalInfo_valeursNulles_effaceLesChamps() {
        user.setBirthPlace("Lyon");
        user.setJobTitle("Développeur");

        UpdatePersonalInfoRequest req = new UpdatePersonalInfoRequest(null, null, null, null, null, null);
        UserDto result = profileService.updatePersonalInfo(user, req);

        assertThat(result.birthPlace()).isNull();
        assertThat(result.birthPostalCode()).isNull();
        assertThat(result.jobTitle()).isNull();
    }

    // ── updatePersonalInfo — cas limites ───────────────────────

    @Test
    void updatePersonalInfo_userInexistant_leve404() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());
        User inconnu = User.builder().id(99L).build();

        assertThatThrownBy(() -> profileService.updatePersonalInfo(inconnu,
                new UpdatePersonalInfoRequest("A", "B", null, null, null, null)))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    // ── updateFiscalProfile — forfaitaire ──────────────────────

    @Test
    void updateFiscalProfile_forfaitaire_supprimeTousLesChampsFraisReels() {
        user.setRealExpensesTransportKm(10000);
        user.setCustomProfessionalDeduction(3000f);

        UpdateFiscalProfileRequest req = new UpdateFiscalProfileRequest(
                2.0f, true,
                null, null, null, null, null, null, null, null, null, null, null, null, null);

        UserDto result = profileService.updateFiscalProfile(user, req);

        assertThat(result.useFlatRateDeduction()).isTrue();
        assertThat(result.customProfessionalDeduction()).isNull();
        assertThat(result.realExpensesTransportKm()).isNull();
        assertThat(result.realExpensesMeals()).isNull();
    }

    // ── updateFiscalProfile — frais réels ──────────────────────

    @Test
    void updateFiscalProfile_fraisReelsAvecKm_calculeAllowanceKilometrique() {
        // 1 000 km × taux 5 CV ≤ 3 000 km = 1 000 × 0,636 = 636 €
        UpdateFiscalProfileRequest req = new UpdateFiscalProfileRequest(
                1.0f, false,
                1000, 5, false,
                null, null, null, null, null, null, null, null, null, null);

        UserDto result = profileService.updateFiscalProfile(user, req);

        assertThat(result.useFlatRateDeduction()).isFalse();
        assertThat(result.customProfessionalDeduction()).isEqualTo(636f);
    }

    @Test
    void updateFiscalProfile_fraisReelsAvecVehiculeElectrique_appliqueLeMult() {
        // 1 000 km × 0,636 × 1,20 = 763 €
        UpdateFiscalProfileRequest req = new UpdateFiscalProfileRequest(
                1.0f, false,
                1000, 5, true,
                null, null, null, null, null, null, null, null, null, null);

        UserDto result = profileService.updateFiscalProfile(user, req);

        assertThat(result.customProfessionalDeduction()).isEqualTo(763f);
    }

    @Test
    void updateFiscalProfile_fraisReelsAvecPlusieursCategories_sommeLesTotal() {
        UpdateFiscalProfileRequest req = new UpdateFiscalProfileRequest(
                1.0f, false,
                null, null, null,
                600f,   // transport TC
                500f,   // repas
                null, null,
                300f,   // matériel
                null, null, null,
                null, null);

        UserDto result = profileService.updateFiscalProfile(user, req);

        assertThat(result.customProfessionalDeduction()).isEqualTo(1400f);
    }

    @Test
    void updateFiscalProfile_fraisReelsAvecTeletravail_deduiseLAllocationEmployeur() {
        // 100 j × (2,50 − 1,00) = 150 €
        UpdateFiscalProfileRequest req = new UpdateFiscalProfileRequest(
                1.0f, false,
                null, null, null, null, null, null, null, null, null, null, null,
                100, 1.00f);

        UserDto result = profileService.updateFiscalProfile(user, req);

        assertThat(result.customProfessionalDeduction()).isEqualTo(150f);
        assertThat(result.realExpensesTeleworkDays()).isEqualTo(100);
        assertThat(result.realExpensesTeleworkEmployerDaily()).isEqualTo(1.00f);
    }

    @Test
    void updateFiscalProfile_teletravailCouvertParEmployeur_totalNul() {
        // Employeur rembourse >= 2,50 → 0 €
        UpdateFiscalProfileRequest req = new UpdateFiscalProfileRequest(
                1.0f, false,
                null, null, null, null, null, null, null, null, null, null, null,
                100, 3.00f);

        UserDto result = profileService.updateFiscalProfile(user, req);

        assertThat(result.customProfessionalDeduction()).isEqualTo(0f);
    }

    @Test
    void updateFiscalProfile_sansDonnees_customDeductionZero() {
        UpdateFiscalProfileRequest req = new UpdateFiscalProfileRequest(
                1.0f, false,
                null, null, null, null, null, null, null, null, null, null, null, null, null);

        UserDto result = profileService.updateFiscalProfile(user, req);

        assertThat(result.useFlatRateDeduction()).isFalse();
        assertThat(result.customProfessionalDeduction()).isEqualTo(0f);
    }

    @Test
    void updateFiscalProfile_userInexistant_leve404() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());
        User inconnu = User.builder().id(99L).build();

        assertThatThrownBy(() -> profileService.updateFiscalProfile(inconnu,
                new UpdateFiscalProfileRequest(1.0f, true,
                        null, null, null, null, null, null, null, null, null, null, null, null, null)))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }
}
