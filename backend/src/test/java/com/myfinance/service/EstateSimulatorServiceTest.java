package com.myfinance.service;

import com.myfinance.config.DonationParameters;
import com.myfinance.config.DonationParameters.Demembrement;
import com.myfinance.config.DonationParameters.Tranche;
import com.myfinance.domain.*;
import com.myfinance.dto.DonationSimulationRequest;
import com.myfinance.dto.DonationSimulationResultDto;
import com.myfinance.repository.FamilyMemberRepository;
import com.myfinance.repository.PastDonationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class EstateSimulatorServiceTest {

    @Mock FamilyMemberRepository familyMemberRepository;
    @Mock PastDonationRepository pastDonationRepository;
    @Mock DonationParameters params;

    @InjectMocks EstateSimulatorService service;

    User donor;
    FamilyMember enfant;
    FamilyMember frere;

    @BeforeEach
    void setUp() {
        donor = User.builder().id(1L).login("donor").role(RoleEnum.USER)
                .birthDate(LocalDate.of(1970, 6, 15)) // ~55 ans en 2026
                .build();
        enfant = buildMember(10L, FamilyRelationEnum.ENFANT, false);
        frere  = buildMember(20L, FamilyRelationEnum.FRERE_SOEUR, false);

        // Abattements
        when(params.getAbattements()).thenReturn(Map.of(
                "CONJOINT", 80724, "ENFANT", 100000, "PETIT_ENFANT", 31865,
                "ARRIERE_PETIT_ENFANT", 5310, "FRERE_SOEUR", 15932,
                "NEVEU_NIECE", 7967, "AUTRE", 1594
        ));
        when(params.getHandicapBonus()).thenReturn(159325);

        // Barème ligne directe (from/to/rate)
        when(params.getLigneDirecte()).thenReturn(List.of(
                tranche(0,        8_072,   0.05),
                tranche(8_072,    12_109,  0.10),
                tranche(12_109,   15_932,  0.15),
                tranche(15_932,   552_324, 0.20),
                tranche(552_324,  902_838, 0.30),
                tranche(902_838,  1_805_677, 0.40),
                trancheFinale(1_805_677,   0.45)
        ));
        when(params.getFreresSoeurs()).thenReturn(List.of(
                tranche(0, 24_430, 0.35),
                trancheFinale(24_430, 0.45)
        ));
        when(params.getAutres()).thenReturn(List.of(
                trancheFinale(0, 0.60)
        ));
        when(params.getDemembrement()).thenReturn(List.of(
                demembrement(20, 0.10), demembrement(30, 0.20),
                demembrement(40, 0.30), demembrement(50, 0.40),
                demembrement(60, 0.50), demembrement(70, 0.60),
                demembrement(80, 0.70), demembrement(90, 0.80),
                demembrement(999, 0.90)
        ));
    }

    // ── Abattements ────────────────────────────────────────────

    @Test
    void abattementBase_enfant_retourne100000() {
        assertThat(service.abattementBase(enfant)).isEqualByComparingTo(new BigDecimal("100000"));
    }

    @Test
    void abattementBase_frere_retourne15932() {
        assertThat(service.abattementBase(frere)).isEqualByComparingTo(new BigDecimal("15932"));
    }

    @Test
    void abattementBase_enfantHandicap_inclutBonus() {
        FamilyMember handicap = buildMember(11L, FamilyRelationEnum.ENFANT, true);
        assertThat(service.abattementBase(handicap))
                .isEqualByComparingTo(new BigDecimal("259325")); // 100000 + 159325
    }

    // ── Barème ligne directe ───────────────────────────────────

    @ParameterizedTest(name = "taxable={0} → droits={1}")
    @CsvSource({
            "0,      0.00",
            "8072,   403.60",
            "10000,  596.40",
            "200000, 38194.35",
    })
    void computeDroits_ligneDirecte_tranches(String taxableStr, String expectedStr) {
        BigDecimal droits = service.computeDroits(new BigDecimal(taxableStr), FamilyRelationEnum.ENFANT);
        assertThat(droits).isEqualByComparingTo(new BigDecimal(expectedStr));
    }

    @Test
    void computeDroits_freresSoeurs_bareme35_45() {
        // 34068 taxable : 24430×35% + 9638×45% = 8550.50 + 4337.10 = 12887.60
        BigDecimal droits = service.computeDroits(new BigDecimal("34068"), FamilyRelationEnum.FRERE_SOEUR);
        assertThat(droits).isEqualByComparingTo(new BigDecimal("12887.60"));
    }

    @Test
    void computeDroits_taxableZero_retourneZero() {
        assertThat(service.computeDroits(BigDecimal.ZERO, FamilyRelationEnum.ENFANT))
                .isEqualByComparingTo(BigDecimal.ZERO);
    }

    // ── Démembrement ───────────────────────────────────────────

    @ParameterizedTest(name = "age={0} → npRatio={1}")
    @CsvSource({
            "20,  0.100",
            "21,  0.200",
            "55,  0.500",
            "61,  0.600",
            "70,  0.600",
            "71,  0.700",
            "91,  0.900",
    })
    void npRatio669_bornesCorrects(int age, String expectedRatio) {
        assertThat(service.npRatio669(age)).isEqualByComparingTo(new BigDecimal(expectedRatio));
    }

    // ── Simulation complète ────────────────────────────────────

    @Test
    void simulateDonation_sousAbattement_zeroDeDroits() {
        when(familyMemberRepository.findByIdAndUser(10L, donor)).thenReturn(Optional.of(enfant));
        when(pastDonationRepository.sumByDonorAndRecipientSince(eq(donor), eq(enfant), any()))
                .thenReturn(BigDecimal.ZERO);

        DonationSimulationResultDto result = service.simulateDonation(donor,
                new DonationSimulationRequest(10L, new BigDecimal("60000"), "Liquidités", false, null, null, null, null, null, null, null, null));

        assertThat(result.droits()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(result.taxable()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(result.netReceived()).isEqualByComparingTo(new BigDecimal("60000"));
    }

    @Test
    void simulateDonation_abattementDejaPartiellementUtilise() {
        when(familyMemberRepository.findByIdAndUser(10L, donor)).thenReturn(Optional.of(enfant));
        when(pastDonationRepository.sumByDonorAndRecipientSince(eq(donor), eq(enfant), any()))
                .thenReturn(new BigDecimal("60000"));

        DonationSimulationResultDto result = service.simulateDonation(donor,
                new DonationSimulationRequest(10L, new BigDecimal("60000"), "Espèces", false, null, null, null, null, null, null, null, null));

        assertThat(result.abattementResiduel()).isEqualByComparingTo(new BigDecimal("40000"));
        assertThat(result.taxable()).isEqualByComparingTo(new BigDecimal("20000"));
        assertThat(result.droits()).isPositive();
    }

    @Test
    void simulateDonation_demembrement_reduitsValeurFiscale() {
        // Donateur ~55 ans → npRatio 0.500 → bien 320k → valeur fiscale 160k
        when(familyMemberRepository.findByIdAndUser(10L, donor)).thenReturn(Optional.of(enfant));
        when(pastDonationRepository.sumByDonorAndRecipientSince(eq(donor), eq(enfant), any()))
                .thenReturn(BigDecimal.ZERO);

        DonationSimulationResultDto result = service.simulateDonation(donor,
                new DonationSimulationRequest(10L, new BigDecimal("320000"), "Appartement", true, null, null, null, null, null, null, null, null));

        assertThat(result.valueTransmitted()).isEqualByComparingTo(new BigDecimal("160000"));
        assertThat(result.npRatio()).isEqualByComparingTo(new BigDecimal("0.500"));
        assertThat(result.taxable()).isEqualByComparingTo(new BigDecimal("60000"));
        assertThat(result.warning()).contains("Démembrement");
    }

    @Test
    void simulateDonation_beneficiaireIntrouvable_leve404() {
        when(familyMemberRepository.findByIdAndUser(99L, donor)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.simulateDonation(donor,
                new DonationSimulationRequest(99L, new BigDecimal("10000"), "Test", false, null, null, null, null, null, null, null, null)))
                .hasMessageContaining("Bénéficiaire introuvable");
    }

    @Test
    void simulateDonation_abattementEpuise_toutEstTaxable() {
        when(familyMemberRepository.findByIdAndUser(10L, donor)).thenReturn(Optional.of(enfant));
        when(pastDonationRepository.sumByDonorAndRecipientSince(eq(donor), eq(enfant), any()))
                .thenReturn(new BigDecimal("120000"));

        DonationSimulationResultDto result = service.simulateDonation(donor,
                new DonationSimulationRequest(10L, new BigDecimal("50000"), "Bien", false, null, null, null, null, null, null, null, null));

        assertThat(result.abattementResiduel()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(result.taxable()).isEqualByComparingTo(new BigDecimal("50000"));
    }

    // ── Helpers ────────────────────────────────────────────────

    private Tranche tranche(double from, double to, double rate) {
        Tranche t = new Tranche();
        t.setFrom(from); t.setTo(to); t.setRate(rate);
        return t;
    }

    private Tranche trancheFinale(double from, double rate) {
        Tranche t = new Tranche();
        t.setFrom(from); t.setTo(null); t.setRate(rate);
        return t;
    }

    private Demembrement demembrement(int ageMax, double npRatio) {
        Demembrement e = new Demembrement();
        e.setAgeMax(ageMax); e.setNpRatio(npRatio);
        return e;
    }

    private FamilyMember buildMember(Long id, FamilyRelationEnum relation, boolean handicap) {
        return FamilyMember.builder()
                .id(id).user(donor).firstName("Test")
                .relation(relation).handicap(handicap)
                .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now())
                .build();
    }
}
