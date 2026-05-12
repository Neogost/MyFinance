package com.myfinance.service;

import com.myfinance.config.DonationParameters;
import com.myfinance.config.DonationParameters.Demembrement;
import com.myfinance.config.DonationParameters.Tranche;
import com.myfinance.domain.BienType;
import com.myfinance.domain.FamilyMember;
import com.myfinance.domain.FamilyRelationEnum;
import com.myfinance.domain.MatrimonialRegime;
import com.myfinance.domain.UnionType;
import com.myfinance.domain.PastDonation;
import com.myfinance.domain.User;
import com.myfinance.dto.CreatePastDonationRequest;
import com.myfinance.dto.DonationSimulationRequest;
import com.myfinance.dto.DonationSimulationResultDto;
import com.myfinance.dto.HeirShareDto;
import com.myfinance.dto.JointDonationRequest;
import com.myfinance.dto.JointDonationResultDto;
import com.myfinance.dto.MultiRecipientDonationRequest;
import com.myfinance.dto.MultiRecipientDonationResultDto;
import com.myfinance.dto.MultiRecipientDonationResultDto.RecipientResult;
import com.myfinance.dto.JointMultiRecipientDonationRequest;
import com.myfinance.dto.JointMultiRecipientDonationResultDto;
import com.myfinance.dto.JointMultiRecipientDonationResultDto.JointRecipientResult;
import com.myfinance.dto.PastDonationDto;
import com.myfinance.dto.StrategyCycleDto;
import com.myfinance.dto.StrategySimulationResultDto;
import com.myfinance.dto.SuccessionSimulationResultDto;
import com.myfinance.domain.PositionStatus;
import com.myfinance.repository.FamilyMemberRepository;
import com.myfinance.repository.PastDonationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EstateSimulatorService {

    private static final BigDecimal ZERO = BigDecimal.ZERO;

    private final FamilyMemberRepository familyMemberRepository;
    private final PastDonationRepository pastDonationRepository;
    private final PositionService positionService;
    private final PossessionService possessionService;
    private final DebtService debtService;
    private final DonationParameters params;

    // ── Simulation donation ────────────────────────────────────

    public DonationSimulationResultDto simulateDonation(User currentUser, DonationSimulationRequest request) {
        FamilyMember recipient = familyMemberRepository.findByIdAndUser(request.recipientId(), currentUser)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Bénéficiaire introuvable"));

        // Si le donateur est un tiers, on utilise sa relation déclarée plutôt que celle du bénéficiaire
        FamilyRelationEnum donorRelation = request.donorRelationToRecipient() != null
                ? request.donorRelationToRecipient()
                : recipient.getRelation();

        // Abattement = barème du lien + bonus si le BÉNÉFICIAIRE est handicapé (art. 779-II CGI)
        // Le handicap du donateur n'a aucun impact sur les droits de donation.

        // 1. Calcul de la part du donateur
        BigDecimal assetValue = request.assetValueEur();
        BigDecimal share      = request.ownershipShare() != null ? request.ownershipShare() : BigDecimal.ONE;
        BigDecimal donorShare = assetValue.multiply(share).setScale(2, RoundingMode.HALF_UP);
        BigDecimal amountGiven = request.customAmountEur() != null
                ? request.customAmountEur().min(donorShare)
                : donorShare;

        // 2. Valeur fiscale transmise (démembrement éventuel)
        boolean    dismembered      = Boolean.TRUE.equals(request.dismembered());
        BigDecimal npRatio          = null;
        BigDecimal valueTransmitted = amountGiven;

        if (dismembered) {
            int age = request.donorAge() != null ? request.donorAge() : donorAge(currentUser);
            npRatio = npRatio669(age);
            valueTransmitted = amountGiven.multiply(npRatio).setScale(2, RoundingMode.HALF_UP);
        }

        // 3. Abattement disponible — barème selon le lien donateur→bénéficiaire,
        //    bonus handicap selon le statut du BÉNÉFICIAIRE (art. 779-II CGI)
        BigDecimal abattementBase = abattementBaseFor(donorRelation, Boolean.TRUE.equals(recipient.getHandicap()));
        BigDecimal abattementUsed = request.pastDonationsEurOverride() != null
                ? request.pastDonationsEurOverride().max(ZERO)
                : pastDonationRepository.sumByDonorAndRecipientSince(
                        currentUser, recipient, LocalDate.now().minusYears(15));
        BigDecimal abattementResiduel = abattementBase.subtract(abattementUsed).max(ZERO);

        // 4. Part taxable et droits
        BigDecimal taxable = valueTransmitted.subtract(abattementResiduel).max(ZERO);
        BigDecimal droits  = computeDroits(taxable, donorRelation);

        // 5. Frais de notaire — sur la valeur transmise (réduite si démembrement)
        BienType bienType = request.bienType() != null ? request.bienType() : BienType.MOBILIER;
        NotaryBreakdown notary = computeNotaryFees(valueTransmitted, bienType);

        // 6. Avertissement contextuel
        String warning = buildWarning(dismembered, recipient, currentUser, amountGiven, abattementResiduel);

        return new DonationSimulationResultDto(
                assetValue.setScale(2, RoundingMode.HALF_UP),
                share.setScale(4, RoundingMode.HALF_UP),
                donorShare,
                amountGiven.setScale(2, RoundingMode.HALF_UP),
                valueTransmitted.setScale(2, RoundingMode.HALF_UP),
                npRatio,
                abattementBase.setScale(2, RoundingMode.HALF_UP),
                abattementUsed.setScale(2, RoundingMode.HALF_UP),
                abattementResiduel.setScale(2, RoundingMode.HALF_UP),
                taxable.setScale(2, RoundingMode.HALF_UP),
                droits.setScale(2, RoundingMode.HALF_UP),
                notary.emolumentsTtc(),
                notary.taxePubliciteFonciere(),
                notary.csi(),
                notary.formalites(),
                notary.total(),
                droits.add(notary.total()).setScale(2, RoundingMode.HALF_UP),
                amountGiven.subtract(droits).setScale(2, RoundingMode.HALF_UP),
                warning
        );
    }

    // ── Donation conjointe (2 co-propriétaires) ───────────────

    public JointDonationResultDto simulateJointDonation(User donor1, JointDonationRequest request) {
        FamilyMember recipient = familyMemberRepository.findByIdAndUser(request.recipientId(), donor1)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bénéficiaire introuvable"));

        boolean dismembered = Boolean.TRUE.equals(request.dismembered());

        // ── Donateur 1 ────────────────────────────────────────
        // Si donor1PastDonationsEur est renseigné → tiers ; sinon lookup DB (utilisateur connecté)
        FamilyRelationEnum d1Relation = request.donor1Relation() != null
                ? request.donor1Relation() : recipient.getRelation();

        DonationSimulationResultDto result1 = simulateDonation(donor1, new DonationSimulationRequest(
                request.recipientId(),
                request.assetValueEur(),
                request.giftLabel(),
                request.dismembered(),
                request.bienType(),                 // type de bien partagé entre les 2 donateurs
                request.donor1Share(),
                request.donor1CustomAmountEur(),
                request.donor1PastDonationsEur(),   // null = lookup DB, renseigné = tiers
                request.donor1Name(),
                d1Relation,
                request.donor1Handicap(),
                request.donor1Age()
        ));

        // ── Donateur 2 (saisi manuellement) ───────────────────
        BigDecimal asset           = request.assetValueEur();
        BigDecimal share2          = request.donor2Share() != null ? request.donor2Share() : BigDecimal.ONE;
        BigDecimal donorShare2     = asset.multiply(share2).setScale(2, RoundingMode.HALF_UP);
        BigDecimal amountGiven2    = request.donor2CustomAmountEur() != null
                ? request.donor2CustomAmountEur().min(donorShare2)
                : donorShare2;

        BigDecimal npRatio2          = null;
        BigDecimal valueTransmitted2 = amountGiven2;
        if (dismembered) {
            int age2 = request.donor2Age() != null ? request.donor2Age() : 50;
            npRatio2 = npRatio669(age2);
            valueTransmitted2 = amountGiven2.multiply(npRatio2).setScale(2, RoundingMode.HALF_UP);
        }

        // Abattement du donateur 2 — barème selon le lien donateur→bénéficiaire,
        // bonus handicap selon le statut du BÉNÉFICIAIRE (pas du donateur)
        BigDecimal abattBase2   = abattementBaseFor(request.donor2Relation(),
                Boolean.TRUE.equals(recipient.getHandicap()));
        BigDecimal abattUsed2   = request.donor2PastDonationsEur() != null
                ? request.donor2PastDonationsEur().max(ZERO) : ZERO;
        BigDecimal abattResid2  = abattBase2.subtract(abattUsed2).max(ZERO);
        BigDecimal taxable2     = valueTransmitted2.subtract(abattResid2).max(ZERO);
        BigDecimal droits2      = computeDroits(taxable2, request.donor2Relation());

        DonationSimulationResultDto result2 = new DonationSimulationResultDto(
                asset.setScale(2, RoundingMode.HALF_UP),
                share2.setScale(4, RoundingMode.HALF_UP),
                donorShare2,
                amountGiven2.setScale(2, RoundingMode.HALF_UP),
                valueTransmitted2.setScale(2, RoundingMode.HALF_UP),
                npRatio2,
                abattBase2.setScale(2, RoundingMode.HALF_UP),
                abattUsed2.setScale(2, RoundingMode.HALF_UP),
                abattResid2.setScale(2, RoundingMode.HALF_UP),
                taxable2.setScale(2, RoundingMode.HALF_UP),
                droits2.setScale(2, RoundingMode.HALF_UP),
                ZERO, ZERO, ZERO, ZERO, ZERO, // notary détail (inclus dans le total joint)
                ZERO,                          // totalCost (inclus dans le total joint)
                amountGiven2.subtract(droits2).setScale(2, RoundingMode.HALF_UP),
                null
        );

        // ── Consolidation ───────────────────────────────────────
        // Notaire : un seul acte sur la valeur transmise totale (après démembrement éventuel)
        BienType bienType = request.bienType() != null ? request.bienType() : BienType.MOBILIER;
        BigDecimal totalAmount      = result1.amountGivenEur().add(result2.amountGivenEur());
        BigDecimal totalTransmitted = result1.valueTransmitted().add(result2.valueTransmitted());
        BigDecimal totalDroits      = result1.droits().add(result2.droits());
        NotaryBreakdown notary      = computeNotaryFees(totalTransmitted, bienType);
        BigDecimal notaryFees       = notary.total();
        BigDecimal totalCost   = totalDroits.add(notaryFees).setScale(2, RoundingMode.HALF_UP);
        BigDecimal netReceived = totalAmount.subtract(totalDroits).setScale(2, RoundingMode.HALF_UP);

        BigDecimal totalAbatt = result1.abattementBase().add(result2.abattementBase());
        String abattSummary = String.format("%,.0f € d'abattements cumulés (%,.0f € + %,.0f €)",
                totalAbatt.doubleValue(),
                result1.abattementBase().doubleValue(),
                result2.abattementBase().doubleValue());

        return new JointDonationResultDto(
                request.donor1Name() != null ? request.donor1Name() : "Donateur 1", result1,
                request.donor2Name(), result2,
                totalAmount.setScale(2, RoundingMode.HALF_UP),
                totalDroits.setScale(2, RoundingMode.HALF_UP),
                notaryFees,
                totalCost,
                netReceived,
                abattSummary
        );
    }

    // ── Donation à plusieurs bénéficiaires ─────────────────────

    /**
     * Simule la donation d'un même bien à plusieurs bénéficiaires (typiquement N enfants).
     * Chaque bénéficiaire reçoit une part du total avec son propre abattement et ses droits.
     * Les frais de notaire sont calculés une seule fois sur le total (1 acte).
     */
    public MultiRecipientDonationResultDto simulateMultiRecipientDonation(
            User currentUser, MultiRecipientDonationRequest request) {

        // 1. Calcul du montant total donné
        BigDecimal assetValue  = request.assetValueEur();
        BigDecimal share       = request.ownershipShare() != null ? request.ownershipShare() : BigDecimal.ONE;
        BigDecimal donorShare  = assetValue.multiply(share).setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalAmount = request.customAmountEur() != null
                ? request.customAmountEur().min(donorShare)
                : donorShare;

        // 2. Vérifier que la somme des parts ≈ 100 %
        BigDecimal sharesSum = request.recipients().stream()
                .map(MultiRecipientDonationRequest.RecipientAllocation::share)
                .reduce(ZERO, BigDecimal::add);
        if (sharesSum.subtract(BigDecimal.ONE).abs().compareTo(new BigDecimal("0.01")) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La somme des parts des bénéficiaires doit faire 100 % (actuel : "
                            + sharesSum.multiply(BigDecimal.valueOf(100)).setScale(1, RoundingMode.HALF_UP) + " %)");
        }

        // 3. Démembrement (donateur)
        boolean    dismembered = Boolean.TRUE.equals(request.dismembered());
        BigDecimal npRatio     = null;
        if (dismembered) {
            int age = request.donorAge() != null ? request.donorAge() : donorAge(currentUser);
            npRatio = npRatio669(age);
        }

        // 4. Calcul par bénéficiaire
        List<RecipientResult> results = new java.util.ArrayList<>();
        BigDecimal totalDroits   = ZERO;
        BigDecimal totalNet      = ZERO;
        BigDecimal totalTransmit = ZERO;
        StringBuilder abattSummary = new StringBuilder();

        for (MultiRecipientDonationRequest.RecipientAllocation alloc : request.recipients()) {
            FamilyMember recipient = familyMemberRepository.findByIdAndUser(alloc.recipientId(), currentUser)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Bénéficiaire " + alloc.recipientId() + " introuvable"));

            // Part allouée à ce bénéficiaire
            BigDecimal allocAmount = totalAmount.multiply(alloc.share()).setScale(2, RoundingMode.HALF_UP);
            BigDecimal valueTrans  = dismembered
                    ? allocAmount.multiply(npRatio).setScale(2, RoundingMode.HALF_UP)
                    : allocAmount;
            totalTransmit = totalTransmit.add(valueTrans);

            // Relation : override > stockée sur le membre
            FamilyRelationEnum relation = alloc.relationOverride() != null
                    ? alloc.relationOverride() : recipient.getRelation();

            // Abattement (bonus si le bénéficiaire est handicapé)
            BigDecimal abattBase = abattementBaseFor(relation, Boolean.TRUE.equals(recipient.getHandicap()));

            // Donations passées : si override fourni → on le répartit proportionnellement
            BigDecimal abattUsed;
            if (request.pastDonationsEurOverride() != null) {
                abattUsed = request.pastDonationsEurOverride().multiply(alloc.share())
                        .setScale(2, RoundingMode.HALF_UP).max(ZERO);
            } else {
                abattUsed = pastDonationRepository.sumByDonorAndRecipientSince(
                        currentUser, recipient, LocalDate.now().minusYears(15));
            }
            BigDecimal abattResid = abattBase.subtract(abattUsed).max(ZERO);
            BigDecimal taxable    = valueTrans.subtract(abattResid).max(ZERO);
            BigDecimal droits     = computeDroits(taxable, relation);
            BigDecimal net        = allocAmount.subtract(droits);

            totalDroits = totalDroits.add(droits);
            totalNet    = totalNet.add(net);

            if (abattSummary.length() > 0) abattSummary.append(" + ");
            abattSummary.append(String.format("%,.0f €", abattBase.doubleValue()));

            results.add(new RecipientResult(
                    recipient.getId(), recipient.getFirstName(), relation,
                    alloc.share(),
                    allocAmount,
                    valueTrans,
                    npRatio,
                    abattBase.setScale(2, RoundingMode.HALF_UP),
                    abattUsed.setScale(2, RoundingMode.HALF_UP),
                    abattResid.setScale(2, RoundingMode.HALF_UP),
                    taxable.setScale(2, RoundingMode.HALF_UP),
                    droits.setScale(2, RoundingMode.HALF_UP),
                    net.setScale(2, RoundingMode.HALF_UP)
            ));
        }

        // 5. Frais de notaire : un seul acte sur le total transmis
        BienType bienType = request.bienType() != null ? request.bienType() : BienType.MOBILIER;
        NotaryBreakdown notary = computeNotaryFees(totalTransmit, bienType);
        BigDecimal totalCost = totalDroits.add(notary.total()).setScale(2, RoundingMode.HALF_UP);

        // Warnings
        List<String> warnings = new java.util.ArrayList<>();
        if (results.size() > 1) {
            warnings.add(String.format("Donation à %d bénéficiaires — chacun bénéficie de son propre abattement.",
                    results.size()));
        }
        if (dismembered) {
            warnings.add("Démembrement : valeur fiscale réduite selon votre âge. Pleine propriété transmise au décès du donateur.");
        }

        BigDecimal totalAbatts = results.stream().map(RecipientResult::abattementBaseEur).reduce(ZERO, BigDecimal::add);
        String summary = String.format("Abattements cumulés : %,.0f € (%s)",
                totalAbatts.doubleValue(), abattSummary.toString());

        return new MultiRecipientDonationResultDto(
                assetValue.setScale(2, RoundingMode.HALF_UP),
                donorShare,
                totalAmount.setScale(2, RoundingMode.HALF_UP),
                results,
                totalDroits.setScale(2, RoundingMode.HALF_UP),
                notary.total(),
                totalCost,
                totalNet.setScale(2, RoundingMode.HALF_UP),
                summary,
                warnings
        );
    }

    // ── Donation conjointe à plusieurs bénéficiaires ──────────

    /**
     * Donation conjointe (2 donateurs) à N bénéficiaires.
     * Chaque pair (donateur, bénéficiaire) → un calcul de droits indépendant.
     * Le résultat est consolidé par bénéficiaire (avec détail par parent).
     */
    public JointMultiRecipientDonationResultDto simulateJointMultiRecipientDonation(
            User currentUser, JointMultiRecipientDonationRequest request) {

        // Validation parts donateurs
        BigDecimal donor1Share = request.donor1Share() != null ? request.donor1Share() : BigDecimal.ONE;
        BigDecimal donor2Share = request.donor2Share() != null ? request.donor2Share() : BigDecimal.ZERO;

        // Validation parts bénéficiaires somme = 100 %
        BigDecimal sharesSum = request.recipients().stream()
                .map(MultiRecipientDonationRequest.RecipientAllocation::share)
                .reduce(ZERO, BigDecimal::add);
        if (sharesSum.subtract(BigDecimal.ONE).abs().compareTo(new BigDecimal("0.01")) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La somme des parts des bénéficiaires doit faire 100 % (actuel : "
                            + sharesSum.multiply(BigDecimal.valueOf(100)).setScale(1, RoundingMode.HALF_UP) + " %)");
        }

        BigDecimal asset = request.assetValueEur();
        // Montant total que chaque donateur souhaite donner
        BigDecimal donor1Total = (request.donor1CustomAmountEur() != null
                ? request.donor1CustomAmountEur() : asset.multiply(donor1Share))
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal donor2Total = (request.donor2CustomAmountEur() != null
                ? request.donor2CustomAmountEur() : asset.multiply(donor2Share))
                .setScale(2, RoundingMode.HALF_UP);

        boolean    dismembered = Boolean.TRUE.equals(request.dismembered());
        BigDecimal npRatio1    = null;
        BigDecimal npRatio2    = null;
        if (dismembered) {
            int age1 = request.donor1Age() != null ? request.donor1Age() : donorAge(currentUser);
            int age2 = request.donor2Age() != null ? request.donor2Age() : 50;
            npRatio1 = npRatio669(age1);
            npRatio2 = npRatio669(age2);
        }

        // Pour chaque bénéficiaire, calculer la part venant de chaque donateur
        List<JointRecipientResult> results = new java.util.ArrayList<>();
        BigDecimal totalDroits   = ZERO;
        BigDecimal totalNet      = ZERO;
        BigDecimal totalTransmit = ZERO;
        BigDecimal totalAmount   = ZERO;
        StringBuilder abattSummary = new StringBuilder();

        for (MultiRecipientDonationRequest.RecipientAllocation alloc : request.recipients()) {
            FamilyMember recipient = familyMemberRepository.findByIdAndUser(alloc.recipientId(), currentUser)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Bénéficiaire " + alloc.recipientId() + " introuvable"));

            // Contribution de chaque donateur à ce bénéficiaire
            BigDecimal c1 = donor1Total.multiply(alloc.share()).setScale(2, RoundingMode.HALF_UP);
            BigDecimal c2 = donor2Total.multiply(alloc.share()).setScale(2, RoundingMode.HALF_UP);
            BigDecimal vt1 = dismembered ? c1.multiply(npRatio1).setScale(2, RoundingMode.HALF_UP) : c1;
            BigDecimal vt2 = dismembered ? c2.multiply(npRatio2).setScale(2, RoundingMode.HALF_UP) : c2;

            // Abattements (par donateur)
            FamilyRelationEnum d1Rel = request.donor1Relation() != null ? request.donor1Relation() : recipient.getRelation();
            FamilyRelationEnum d2Rel = request.donor2Relation();
            BigDecimal abatt1 = abattementBaseFor(d1Rel, Boolean.TRUE.equals(recipient.getHandicap()));
            BigDecimal abatt2 = abattementBaseFor(d2Rel, Boolean.TRUE.equals(recipient.getHandicap()));

            BigDecimal used1 = request.donor1PastDonationsEur() != null
                    ? request.donor1PastDonationsEur().multiply(alloc.share()).setScale(2, RoundingMode.HALF_UP).max(ZERO)
                    : pastDonationRepository.sumByDonorAndRecipientSince(
                            currentUser, recipient, LocalDate.now().minusYears(15));
            BigDecimal used2 = request.donor2PastDonationsEur() != null
                    ? request.donor2PastDonationsEur().multiply(alloc.share()).setScale(2, RoundingMode.HALF_UP).max(ZERO)
                    : ZERO;

            BigDecimal resid1 = abatt1.subtract(used1).max(ZERO);
            BigDecimal resid2 = abatt2.subtract(used2).max(ZERO);
            BigDecimal tax1   = vt1.subtract(resid1).max(ZERO);
            BigDecimal tax2   = vt2.subtract(resid2).max(ZERO);
            BigDecimal dr1    = computeDroits(tax1, d1Rel);
            BigDecimal dr2    = computeDroits(tax2, d2Rel);

            BigDecimal allocTotal      = c1.add(c2);
            BigDecimal valueTransTotal = vt1.add(vt2);
            BigDecimal abattTotal      = abatt1.add(abatt2);
            BigDecimal usedTotal       = used1.add(used2);
            BigDecimal residTotal      = resid1.add(resid2);
            BigDecimal taxableTotal    = tax1.add(tax2);
            BigDecimal droitsTotal     = dr1.add(dr2);
            BigDecimal net             = allocTotal.subtract(droitsTotal);

            totalDroits   = totalDroits.add(droitsTotal);
            totalNet      = totalNet.add(net);
            totalTransmit = totalTransmit.add(valueTransTotal);
            totalAmount   = totalAmount.add(allocTotal);

            if (abattSummary.length() > 0) abattSummary.append(" + ");
            abattSummary.append(String.format("%,.0f €", abattTotal.doubleValue()));

            results.add(new JointRecipientResult(
                    recipient.getId(), recipient.getFirstName(),
                    d1Rel,
                    alloc.share(),
                    allocTotal,
                    valueTransTotal,
                    abattTotal.setScale(2, RoundingMode.HALF_UP),
                    usedTotal.setScale(2, RoundingMode.HALF_UP),
                    residTotal.setScale(2, RoundingMode.HALF_UP),
                    taxableTotal.setScale(2, RoundingMode.HALF_UP),
                    droitsTotal.setScale(2, RoundingMode.HALF_UP),
                    net.setScale(2, RoundingMode.HALF_UP),
                    c1.setScale(2, RoundingMode.HALF_UP),
                    dr1.setScale(2, RoundingMode.HALF_UP),
                    c2.setScale(2, RoundingMode.HALF_UP),
                    dr2.setScale(2, RoundingMode.HALF_UP)
            ));
        }

        // Frais de notaire — 1 seul acte sur le total transmis
        BienType bienType = request.bienType() != null ? request.bienType() : BienType.MOBILIER;
        NotaryBreakdown notary = computeNotaryFees(totalTransmit, bienType);
        BigDecimal totalCost = totalDroits.add(notary.total()).setScale(2, RoundingMode.HALF_UP);

        List<String> warnings = new java.util.ArrayList<>();
        warnings.add("Donation conjointe : chaque pair (donateur, bénéficiaire) bénéficie de son propre abattement.");
        if (dismembered) {
            warnings.add("Démembrement : valeur fiscale réduite selon l'âge de chaque donateur.");
        }

        return new JointMultiRecipientDonationResultDto(
                request.donor1Name() != null ? request.donor1Name() : "Donateur 1",
                request.donor2Name(),
                asset.setScale(2, RoundingMode.HALF_UP),
                totalAmount.setScale(2, RoundingMode.HALF_UP),
                results,
                totalDroits.setScale(2, RoundingMode.HALF_UP),
                notary.total(),
                totalCost,
                totalNet.setScale(2, RoundingMode.HALF_UP),
                String.format("Abattements cumulés : %s", abattSummary.toString()),
                warnings
        );
    }

    // ── Simulation de succession ──────────────────────────────

    /**
     * Simule la succession au décès de l'utilisateur, à la date du jour.
     * - Calcule le patrimoine net (positions + possessions − dettes)
     * - Ajoute les donations rapportées (< 15 ans)
     * - Identifie les héritiers depuis la cellule familiale
     * - Applique les règles légales (réserve héréditaire, conjoint exonéré)
     * - Calcule les droits par héritier
     */
    public SuccessionSimulationResultDto simulateSuccession(User user) {
        // 1. Patrimoine net
        BigDecimal positionsValue = positionService.findAllByUser(user, null, PositionStatus.ACTIVE)
                .stream()
                .map(p -> p.computed() != null && p.computed().currentValueEur() != null
                        ? p.computed().currentValueEur() : ZERO)
                .reduce(ZERO, BigDecimal::add);

        BigDecimal possessionsValue = possessionService.findAllByUser(user)
                .stream()
                .map(p -> p.effectiveCurrentValue() != null ? p.effectiveCurrentValue() : ZERO)
                .reduce(ZERO, BigDecimal::add);

        BigDecimal debtsRemaining = debtService.findAllByUser(user)
                .stream()
                .map(d -> d.remainingCapital() != null ? d.remainingCapital() : ZERO)
                .reduce(ZERO, BigDecimal::add);

        BigDecimal patrimoineNet = positionsValue.add(possessionsValue).subtract(debtsRemaining);

        // 2. Donations rapportées (< 15 ans)
        BigDecimal donationsRapportees = pastDonationRepository.findByDonorOrderByDonationDateDesc(user)
                .stream()
                .filter(d -> d.getDonationDate().isAfter(LocalDate.now().minusYears(15)))
                .map(PastDonation::getAmountEur)
                .reduce(ZERO, BigDecimal::add);

        // 3. Identifier la cellule familiale
        List<FamilyMember> family = familyMemberRepository.findByUserOrderByRelationAscFirstNameAsc(user);
        FamilyMember conjoint = family.stream()
                .filter(m -> m.getDeathDate() == null && m.getRelation() == FamilyRelationEnum.CONJOINT)
                .findFirst().orElse(null);
        List<FamilyMember> enfants = family.stream()
                .filter(m -> m.getDeathDate() == null && m.getRelation() == FamilyRelationEnum.ENFANT)
                .toList();

        // 4. Régime matrimonial — communauté légale : 50% au conjoint AVANT succession
        BigDecimal partRegime = ZERO;
        if (conjoint != null
                && conjoint.getUnionType() == UnionType.MARIAGE
                && conjoint.getMatrimonialRegime() == MatrimonialRegime.COMMUNAUTE) {
            partRegime = patrimoineNet.multiply(new BigDecimal("0.5")).setScale(2, RoundingMode.HALF_UP);
        }

        // 5. Masse successorale = patrimoine net − part régime + donations rapportées
        BigDecimal masseSuccessorale = patrimoineNet.subtract(partRegime).add(donationsRapportees)
                .setScale(2, RoundingMode.HALF_UP);

        // 6. Réserve héréditaire et quotité disponible (sur la masse successorale)
        BigDecimal reserveRatio = computeReserveRatio(enfants.size());
        BigDecimal reserveHereditaire = masseSuccessorale.multiply(reserveRatio).setScale(2, RoundingMode.HALF_UP);
        BigDecimal quotiteDisponible = masseSuccessorale.subtract(reserveHereditaire).setScale(2, RoundingMode.HALF_UP);

        // 7. Distribution selon le type d'union du conjoint
        List<HeirShareDto> heirs = new java.util.ArrayList<>();
        BigDecimal remaining = masseSuccessorale;
        List<String> warnings = new java.util.ArrayList<>();

        if (conjoint != null) {
            UnionType union = conjoint.getUnionType() != null ? conjoint.getUnionType() : UnionType.MARIAGE;

            // Le conjoint a déjà reçu sa part de régime matrimonial (cumulée à sa part successorale)
            BigDecimal conjointSuccessoral = ZERO;
            String conjointNote = null;
            boolean conjointExonere = false;

            switch (union) {
                case MARIAGE -> {
                    conjointExonere = true;
                    if (!enfants.isEmpty()) {
                        // Mariage + enfants : 1/4 PP de la masse successorale
                        conjointSuccessoral = masseSuccessorale.multiply(new BigDecimal("0.25"))
                                .setScale(2, RoundingMode.HALF_UP);
                        conjointNote = "Marié — exonéré de droits depuis 2007. Reçoit 1/4 en pleine propriété de la masse successorale (option légale par défaut, modifiable par testament).";
                    } else {
                        // Mariage sans enfants : conjoint hérite de tout
                        conjointSuccessoral = masseSuccessorale;
                        conjointNote = "Marié sans enfants — conjoint unique héritier, exonéré de droits (sauf si parents survivants : à valider avec notaire).";
                        remaining = ZERO;
                    }
                }
                case PACS -> {
                    conjointExonere = true;
                    // Pacsé n'est PAS héritier légal sans testament → 0 par défaut
                    conjointSuccessoral = ZERO;
                    conjointNote = "⚠ Pacsé — exonéré de droits MAIS pas héritier légal sans testament. Sans testament, le partenaire ne reçoit rien (0 €).";
                    warnings.add("PACS : sans testament, le partenaire pacsé n'hérite de rien. Rédigez un testament chez le notaire pour qu'il bénéficie de l'exonération.");
                }
                case CONCUBINAGE -> {
                    conjointExonere = false;
                    conjointSuccessoral = ZERO;
                    conjointNote = "⚠ Concubin(e) — pas d'héritage par défaut. Si testament : taxé à 60 % au-delà d'un abattement de seulement 1 594 €.";
                    warnings.add("Concubinage : pas d'héritage par défaut et taxation 60 % en cas de testament. Le mariage ou PACS est fortement recommandé pour protéger fiscalement le conjoint.");
                }
            }

            // Part totale du conjoint = part régime + part successorale
            BigDecimal conjointTotal = partRegime.add(conjointSuccessoral);

            String fullNote = conjointNote;
            if (partRegime.compareTo(ZERO) > 0) {
                fullNote = String.format("Régime matrimonial communauté : %,.0f € hors succession. ", partRegime.doubleValue())
                        + (conjointNote != null ? conjointNote : "");
            }

            heirs.add(new HeirShareDto(
                    conjoint.getId(), conjoint.getFirstName(), FamilyRelationEnum.CONJOINT,
                    conjointTotal, ZERO, ZERO, ZERO, ZERO, ZERO, conjointTotal,
                    conjointExonere, fullNote
            ));

            remaining = remaining.subtract(conjointSuccessoral);
        }

        // 8. Distribution entre enfants
        if (!enfants.isEmpty()) {
            BigDecimal partParEnfant = remaining.divide(BigDecimal.valueOf(enfants.size()), 2, RoundingMode.HALF_UP);
            for (FamilyMember enfant : enfants) {
                heirs.add(computeHeirShare(user, enfant, partParEnfant));
            }
        }

        if (heirs.isEmpty()) {
            warnings.add("Aucun héritier identifié dans la cellule familiale. Ajoutez vos proches via 'Gérer la famille'.");
        }
        if (donationsRapportees.compareTo(ZERO) > 0) {
            warnings.add(String.format("Donations effectuées dans les 15 dernières années (%,.0f €) rapportées à la masse successorale.",
                    donationsRapportees.doubleValue()));
        }
        if (partRegime.compareTo(ZERO) > 0) {
            warnings.add(String.format(
                    "Mariage en communauté légale : %,.0f € (50 %% du patrimoine) reviennent au conjoint au titre du régime matrimonial, avant succession.",
                    partRegime.doubleValue()));
        }

        BigDecimal totalDroits = heirs.stream().map(HeirShareDto::droitsEur).reduce(ZERO, BigDecimal::add);
        BigDecimal totalNet    = heirs.stream().map(HeirShareDto::netReceivedEur).reduce(ZERO, BigDecimal::add);

        return new SuccessionSimulationResultDto(
                LocalDate.now(),
                positionsValue.setScale(2, RoundingMode.HALF_UP),
                possessionsValue.setScale(2, RoundingMode.HALF_UP),
                debtsRemaining.setScale(2, RoundingMode.HALF_UP),
                patrimoineNet.setScale(2, RoundingMode.HALF_UP),
                donationsRapportees.setScale(2, RoundingMode.HALF_UP),
                partRegime,
                masseSuccessorale,
                conjoint != null,
                conjoint != null ? conjoint.getFirstName() : null,
                conjoint != null && conjoint.getUnionType() != null ? conjoint.getUnionType().name() : null,
                conjoint != null && conjoint.getMatrimonialRegime() != null ? conjoint.getMatrimonialRegime().name() : null,
                enfants.size(),
                reserveRatio,
                reserveHereditaire,
                quotiteDisponible,
                heirs,
                totalDroits.setScale(2, RoundingMode.HALF_UP),
                totalNet.setScale(2, RoundingMode.HALF_UP),
                warnings
        );
    }

    /** Réserve héréditaire selon le nombre d'enfants (art. 913 Code civil). */
    private BigDecimal computeReserveRatio(int nbEnfants) {
        return switch (nbEnfants) {
            case 0  -> ZERO;
            case 1  -> new BigDecimal("0.5");
            case 2  -> new BigDecimal("0.6667");
            default -> new BigDecimal("0.75");
        };
    }

    /** Calcule la part d'un enfant héritier (abattement, droits, net reçu). */
    private HeirShareDto computeHeirShare(User user, FamilyMember enfant, BigDecimal partEur) {
        BigDecimal abattBase = abattementBaseFor(FamilyRelationEnum.ENFANT,
                Boolean.TRUE.equals(enfant.getHandicap()));
        BigDecimal abattUsed = pastDonationRepository.sumByDonorAndRecipientSince(
                user, enfant, LocalDate.now().minusYears(15));
        BigDecimal abattResid = abattBase.subtract(abattUsed).max(ZERO);
        BigDecimal taxable    = partEur.subtract(abattResid).max(ZERO);
        BigDecimal droits     = computeDroits(taxable, FamilyRelationEnum.ENFANT);
        BigDecimal net        = partEur.subtract(droits);

        return new HeirShareDto(
                enfant.getId(), enfant.getFirstName(), FamilyRelationEnum.ENFANT,
                partEur,
                abattBase.setScale(2, RoundingMode.HALF_UP),
                abattUsed.setScale(2, RoundingMode.HALF_UP),
                abattResid.setScale(2, RoundingMode.HALF_UP),
                taxable.setScale(2, RoundingMode.HALF_UP),
                droits.setScale(2, RoundingMode.HALF_UP),
                net.setScale(2, RoundingMode.HALF_UP),
                false, null
        );
    }

    // ── Stratégie 15 ans (V3) ─────────────────────────────────

    private static final int MAX_AGE = 90;
    private static final int CYCLE_YEARS = 15;

    /**
     * Plan stratégique de donations échelonnées sur 15 ans pour épuiser les abattements
     * (qui se renouvellent tous les 15 ans, art. 784 CGI).
     */
    public StrategySimulationResultDto simulateStrategy(User user) {
        int userAge = donorAge(user); // 50 par défaut si pas de birthDate

        // 1. Identifier la cellule familiale
        List<FamilyMember> family = familyMemberRepository.findByUserOrderByRelationAscFirstNameAsc(user);
        FamilyMember conjoint = family.stream()
                .filter(m -> m.getDeathDate() == null && m.getRelation() == FamilyRelationEnum.CONJOINT)
                .findFirst().orElse(null);
        List<FamilyMember> enfants = family.stream()
                .filter(m -> m.getDeathDate() == null && m.getRelation() == FamilyRelationEnum.ENFANT)
                .toList();

        // 2. Nombre de donateurs : 1 (solo) ou 2 (couple marié/pacsé — ils ont tous deux des abattements)
        int nbDonors = 1;
        if (conjoint != null && (conjoint.getUnionType() == UnionType.MARIAGE
                || conjoint.getUnionType() == UnionType.PACS)) {
            nbDonors = 2;
        }

        // 3. Patrimoine net (somme positions + possessions − dettes)
        BigDecimal positionsValue = positionService.findAllByUser(user, null, PositionStatus.ACTIVE)
                .stream().map(p -> p.computed() != null && p.computed().currentValueEur() != null
                        ? p.computed().currentValueEur() : ZERO)
                .reduce(ZERO, BigDecimal::add);
        BigDecimal possessionsValue = possessionService.findAllByUser(user).stream()
                .map(p -> p.effectiveCurrentValue() != null ? p.effectiveCurrentValue() : ZERO)
                .reduce(ZERO, BigDecimal::add);
        BigDecimal debtsRemaining = debtService.findAllByUser(user).stream()
                .map(d -> d.remainingCapital() != null ? d.remainingCapital() : ZERO)
                .reduce(ZERO, BigDecimal::add);
        BigDecimal patrimoineNet = positionsValue.add(possessionsValue).subtract(debtsRemaining);

        // 4. Construction des cycles : âge actuel, +15, +30… jusqu'à MAX_AGE
        List<StrategyCycleDto> cycles = new java.util.ArrayList<>();
        int currentYear = LocalDate.now().getYear();
        BigDecimal cumulPP = ZERO;
        BigDecimal cumulNP = ZERO;

        int cycleIdx = 1;
        for (int age = userAge; age <= MAX_AGE; age += CYCLE_YEARS) {
            int yearOfCycle = currentYear + (age - userAge);
            BigDecimal npRatio = npRatio669(age);

            List<StrategyCycleDto.HeirAllocation> heirAllocs = new java.util.ArrayList<>();
            BigDecimal totalAbatt = ZERO;
            for (FamilyMember enfant : enfants) {
                BigDecimal abattBase = abattementBaseFor(FamilyRelationEnum.ENFANT,
                        Boolean.TRUE.equals(enfant.getHandicap()));
                BigDecimal totalForHeir = abattBase.multiply(BigDecimal.valueOf(nbDonors))
                        .setScale(2, RoundingMode.HALF_UP);
                heirAllocs.add(new StrategyCycleDto.HeirAllocation(
                        enfant.getId(), enfant.getFirstName(), "ENFANT",
                        nbDonors, abattBase, totalForHeir));
                totalAbatt = totalAbatt.add(totalForHeir);
            }

            // Max transmissible : en PP = somme des abattements ; en NP = abattements / ratio NP
            BigDecimal maxNp = npRatio.compareTo(ZERO) > 0
                    ? totalAbatt.divide(npRatio, 2, RoundingMode.HALF_UP)
                    : totalAbatt;

            cycles.add(new StrategyCycleDto(
                    cycleIdx++, yearOfCycle, age, npRatio,
                    totalAbatt, heirAllocs, totalAbatt, maxNp
            ));

            cumulPP = cumulPP.add(totalAbatt);
            cumulNP = cumulNP.add(maxNp);
        }

        // 5. Scénario "sans anticipation" : tout passe en succession → droits estimés
        BigDecimal droitsSansAnticipation = estimateSuccessionDroits(patrimoineNet, nbDonors, enfants);
        BigDecimal economieMax = droitsSansAnticipation;

        // 6. Recommandations
        List<String> recos = new java.util.ArrayList<>();
        if (enfants.isEmpty()) {
            recos.add("Aucun enfant identifié dans la cellule familiale — ajoutez-les pour activer le plan.");
        } else {
            recos.add(String.format("%d cycle(s) de donation possibles entre %d et %d ans, à raison d'un cycle tous les %d ans.",
                    cycles.size(), userAge, Math.min(userAge + CYCLE_YEARS * (cycles.size() - 1), MAX_AGE), CYCLE_YEARS));
            if (nbDonors == 2) {
                recos.add("En couple : chaque parent profite de son propre abattement par enfant → 200 k€ par enfant par cycle.");
            }
            if (userAge >= 50 && userAge <= 70) {
                recos.add(String.format("À %d ans, la nue-propriété ne vaut que %.0f %% — idéal pour transmettre l'immobilier sans droit.",
                        userAge, npRatio669(userAge).multiply(BigDecimal.valueOf(100)).doubleValue()));
            } else if (userAge < 50) {
                recos.add("Vous avez le temps de planifier plusieurs cycles. Commencez tôt pour maximiser les abattements cumulés.");
            } else if (userAge > 70) {
                recos.add("À votre âge, la nue-propriété représente une part importante du bien — l'avantage du démembrement diminue.");
            }
            if (patrimoineNet.compareTo(cumulPP) > 0) {
                BigDecimal residuel = patrimoineNet.subtract(cumulPP);
                recos.add(String.format("Patrimoine restant après tous les cycles PP : %,.0f € (sera taxé en succession).", residuel.doubleValue()));
            }
        }

        return new StrategySimulationResultDto(
                userAge, nbDonors, enfants.size(),
                patrimoineNet.setScale(2, RoundingMode.HALF_UP),
                cycles,
                patrimoineNet.setScale(2, RoundingMode.HALF_UP),
                droitsSansAnticipation.setScale(2, RoundingMode.HALF_UP),
                cumulPP.setScale(2, RoundingMode.HALF_UP),
                cumulNP.setScale(2, RoundingMode.HALF_UP),
                economieMax.setScale(2, RoundingMode.HALF_UP),
                recos
        );
    }

    /**
     * Estimation des droits de succession si rien n'est anticipé.
     * Simplification : on suppose que tout va aux enfants (sans conjoint) et chacun a son abattement.
     */
    private BigDecimal estimateSuccessionDroits(BigDecimal patrimoine, int nbDonors, List<FamilyMember> enfants) {
        if (enfants.isEmpty() || patrimoine.compareTo(ZERO) <= 0) return ZERO;
        // Pour chaque enfant, on suppose qu'il reçoit patrimoine / nb_enfants
        BigDecimal partParEnfant = patrimoine.divide(BigDecimal.valueOf(enfants.size()), 2, RoundingMode.HALF_UP);
        BigDecimal totalDroits = ZERO;
        for (FamilyMember enfant : enfants) {
            BigDecimal abatt = abattementBaseFor(FamilyRelationEnum.ENFANT,
                    Boolean.TRUE.equals(enfant.getHandicap()));
            BigDecimal taxable = partParEnfant.subtract(abatt).max(ZERO);
            totalDroits = totalDroits.add(computeDroits(taxable, FamilyRelationEnum.ENFANT));
        }
        return totalDroits;
    }

    // ── Donations passées ──────────────────────────────────────

    public List<PastDonationDto> getPastDonations(User donor) {
        return pastDonationRepository.findByDonorOrderByDonationDateDesc(donor)
                .stream().map(PastDonationDto::from).toList();
    }

    public PastDonationDto recordPastDonation(User donor, CreatePastDonationRequest request) {
        FamilyMember recipient = familyMemberRepository.findByIdAndUser(request.recipientId(), donor)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Bénéficiaire introuvable"));
        PastDonation donation = PastDonation.builder()
                .donor(donor).recipient(recipient)
                .donationDate(request.donationDate())
                .amountEur(request.amountEur())
                .label(request.label())
                .createdAt(LocalDateTime.now())
                .build();
        return PastDonationDto.from(pastDonationRepository.save(donation));
    }

    public void deletePastDonation(Long id, User currentUser) {
        PastDonation donation = pastDonationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Donation introuvable"));
        if (!donation.getDonor().getId().equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès non autorisé");
        }
        pastDonationRepository.deleteById(id);
    }

    // ── Calculs ────────────────────────────────────────────────

    /**
     * Calcule l'abattement légal selon le lien donateur→bénéficiaire et le statut handicap du BÉNÉFICIAIRE.
     * Le bonus handicap (art. 779-II CGI) s'applique sur la part du donataire (= bénéficiaire) handicapé,
     * pas sur celle du donateur.
     */
    BigDecimal abattementBaseFor(FamilyRelationEnum relation, boolean recipientHandicap) {
        int base = params.getAbattements().getOrDefault(relation.name(), 1594);
        if (recipientHandicap) {
            base += params.getHandicapBonus();
        }
        return BigDecimal.valueOf(base);
    }

    /** Wrapper conservé pour compatibilité tests : extrait relation + handicap du membre passé. */
    BigDecimal abattementBase(FamilyMember recipient) {
        return abattementBaseFor(recipient.getRelation(), Boolean.TRUE.equals(recipient.getHandicap()));
    }

    BigDecimal computeDroits(BigDecimal taxable, FamilyRelationEnum relation) {
        if (taxable.compareTo(ZERO) <= 0) return ZERO;
        List<Tranche> bareme = switch (relation) {
            case CONJOINT, ENFANT, PETIT_ENFANT, ARRIERE_PETIT_ENFANT -> params.getLigneDirecte();
            case FRERE_SOEUR -> params.getFreresSoeurs();
            default          -> params.getAutres();
        };
        return applyTranches(taxable, bareme);
    }

    /** Détail des frais de notaire pour un acte de donation. */
    record NotaryBreakdown(
            BigDecimal emolumentsTtc,
            BigDecimal taxePubliciteFonciere,
            BigDecimal csi,
            BigDecimal formalites,
            BigDecimal total
    ) {}

    /**
     * Calcule le détail des frais de notaire pour un acte de donation.
     * - Émoluments HT (barème dégressif) × 1,20 (TVA) + minimum légal 90 € HT
     * - Pour un IMMOBILIER : ajout taxe de publicité foncière (0,60 %) + CSI (0,10 %)
     * - Frais de formalités forfaitaires
     * Tous les frais sont calculés sur la valeur fiscale transmise (réduite si démembrement).
     */
    NotaryBreakdown computeNotaryFees(BigDecimal valueTransmitted, BienType bienType) {
        BigDecimal emolumentsHt = applyTranches(valueTransmitted, params.getEmolumentsNotaire());
        BigDecimal minimum      = BigDecimal.valueOf(params.getEmolumentsMinimum());
        if (emolumentsHt.compareTo(minimum) < 0) emolumentsHt = minimum;
        BigDecimal emolumentsTtc = emolumentsHt.multiply(new BigDecimal("1.20")).setScale(2, RoundingMode.HALF_UP);

        BigDecimal pubFonciere = ZERO;
        BigDecimal csi         = ZERO;
        if (bienType == BienType.IMMOBILIER) {
            pubFonciere = valueTransmitted.multiply(BigDecimal.valueOf(params.getTaxePubliciteFonciere()))
                    .setScale(2, RoundingMode.HALF_UP);
            csi = valueTransmitted.multiply(BigDecimal.valueOf(params.getContributionSecuriteImmobiliere()))
                    .setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal formalites = BigDecimal.valueOf(params.getFraisFormalites());
        BigDecimal total = emolumentsTtc.add(pubFonciere).add(csi).add(formalites)
                .setScale(2, RoundingMode.HALF_UP);

        return new NotaryBreakdown(emolumentsTtc, pubFonciere, csi, formalites, total);
    }

    private BigDecimal applyTranches(BigDecimal taxable, List<Tranche> tranches) {
        BigDecimal droits = ZERO;
        for (Tranche t : tranches) {
            double from = t.getFrom();
            if (taxable.doubleValue() <= from) break;
            double upper = t.getTo() != null ? Math.min(t.getTo(), taxable.doubleValue()) : taxable.doubleValue();
            double width = upper - from;
            droits = droits.add(BigDecimal.valueOf(width * t.getRate()));
        }
        return droits.setScale(2, RoundingMode.HALF_UP);
    }

    BigDecimal npRatio669(int donorAge) {
        for (Demembrement e : params.getDemembrement()) {
            if (donorAge <= e.getAgeMax()) {
                return BigDecimal.valueOf(e.getNpRatio()).setScale(3, RoundingMode.HALF_UP);
            }
        }
        return new BigDecimal("0.900");
    }

    private int donorAge(User donor) {
        if (donor.getBirthDate() == null) return 50;
        return Period.between(donor.getBirthDate(), LocalDate.now()).getYears();
    }

    private String buildWarning(boolean dismembered, FamilyMember recipient,
                                User donor, BigDecimal giftValue, BigDecimal abattementResiduel) {
        if (dismembered) {
            return "Démembrement irrévocable. Le donateur conserve l'usufruit et au décès " +
                    "du donateur le nu-propriétaire devient plein propriétaire sans droits supplémentaires. " +
                    "Consultez un notaire avant de signer l'acte.";
        }
        int age = donorAge(donor);
        if (age >= 50 && age <= 70 && giftValue.compareTo(abattementResiduel) > 0) {
            BigDecimal hypotheticalNpRatio = npRatio669(age);
            BigDecimal hypotheticalValue   = giftValue.multiply(hypotheticalNpRatio).setScale(2, RoundingMode.HALF_UP);
            if (hypotheticalValue.compareTo(abattementResiduel) <= 0) {
                return String.format(
                        "💡 Astuce démembrement : à %d ans, la nue-propriété vaut %.0f %% du bien " +
                        "(valeur fiscale ≈ %,.0f €). L'abattement absorberait tout → 0 € de droits. " +
                        "Au décès du donateur, %s deviendrait plein(e) propriétaire sans droits supplémentaires.",
                        age, hypotheticalNpRatio.multiply(BigDecimal.valueOf(100)).doubleValue(),
                        hypotheticalValue.doubleValue(), recipient.getFirstName());
            }
        }
        return null;
    }
}
