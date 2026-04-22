package com.myfinance.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    private LocalDate birthDate;

    @Column(nullable = false, unique = true)
    private String login;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RoleEnum role;

    // ── Profil fiscal ──────────────────────────────────────────
    // Nullable : les utilisateurs existants n'ont pas ces champs en base.
    // Le simulateur applique des valeurs par défaut si null (1.0 part, abattement forfaitaire).

    private Float fiscalParts; // Quotient familial (ex : 1.0, 2.5)

    private Boolean useFlatRateDeduction; // true = abattement 10%, false = frais réels

    private Float customProfessionalDeduction; // Montant frais réels (€), si useFlatRateDeduction = false

    // ── Regroupement familial ──────────────────────────────────

    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "family_group_id")
    private FamilyGroup familyGroup;

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    // login est le nom d'utilisateur Spring Security
    @Override
    public String getUsername() {
        return login;
    }
}
