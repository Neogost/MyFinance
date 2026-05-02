package com.myfinance.controller;

import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.domain.AssetCategory;
import com.myfinance.domain.BreakdownDimension;
import com.myfinance.dto.PortfolioBreakdownDto;
import com.myfinance.service.PatrimoineBreakdownService;
import com.myfinance.support.WithMockCustomUser;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PatrimoineBreakdownController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class PatrimoineBreakdownControllerTest {

    @Autowired MockMvc mockMvc;
    @MockitoBean PatrimoineBreakdownService patrimoineBreakdownService;

    @Test
    @WithMockCustomUser
    void getBreakdown_sector_retourne200() throws Exception {
        when(patrimoineBreakdownService.getBreakdown(any(), eq(BreakdownDimension.SECTOR), isNull()))
                .thenReturn(stub(BreakdownDimension.SECTOR, "Technology"));

        mockMvc.perform(get("/api/patrimoine/breakdown/sector"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dimension").value("SECTOR"))
                .andExpect(jsonPath("$.breakdown[0].key").value("Technology"));
    }

    @Test
    @WithMockCustomUser
    void getBreakdown_country_retourne200() throws Exception {
        when(patrimoineBreakdownService.getBreakdown(any(), eq(BreakdownDimension.COUNTRY), isNull()))
                .thenReturn(stub(BreakdownDimension.COUNTRY, "FR"));

        mockMvc.perform(get("/api/patrimoine/breakdown/country"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dimension").value("COUNTRY"))
                .andExpect(jsonPath("$.breakdown[0].key").value("FR"));
    }

    @Test
    @WithMockCustomUser
    void getBreakdown_currency_retourne200() throws Exception {
        when(patrimoineBreakdownService.getBreakdown(any(), eq(BreakdownDimension.CURRENCY), isNull()))
                .thenReturn(stub(BreakdownDimension.CURRENCY, "EUR"));

        mockMvc.perform(get("/api/patrimoine/breakdown/currency"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dimension").value("CURRENCY"))
                .andExpect(jsonPath("$.breakdown[0].key").value("EUR"));
    }

    @Test
    @WithMockCustomUser
    void getBreakdown_currency_avecCategoryCrypto_retourne200() throws Exception {
        when(patrimoineBreakdownService.getBreakdown(any(), eq(BreakdownDimension.CURRENCY), eq(AssetCategory.CRYPTO)))
                .thenReturn(stub(BreakdownDimension.CURRENCY, "USD"));

        mockMvc.perform(get("/api/patrimoine/breakdown/currency?category=CRYPTO"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.breakdown[0].key").value("USD"));
    }

    @Test
    @WithMockCustomUser
    void getBreakdown_assetSubType_retourne200() throws Exception {
        when(patrimoineBreakdownService.getBreakdown(any(), eq(BreakdownDimension.ASSET_SUBTYPE), isNull()))
                .thenReturn(stub(BreakdownDimension.ASSET_SUBTYPE, "ETF"));

        mockMvc.perform(get("/api/patrimoine/breakdown/asset-subtype"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dimension").value("ASSET_SUBTYPE"))
                .andExpect(jsonPath("$.breakdown[0].key").value("ETF"));
    }

    @Test
    @WithMockCustomUser
    void getBreakdown_cryptoType_retourne200() throws Exception {
        when(patrimoineBreakdownService.getBreakdown(any(), eq(BreakdownDimension.CRYPTO_TYPE), isNull()))
                .thenReturn(stub(BreakdownDimension.CRYPTO_TYPE, "STABLECOIN"));

        mockMvc.perform(get("/api/patrimoine/breakdown/crypto-type"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dimension").value("CRYPTO_TYPE"))
                .andExpect(jsonPath("$.breakdown[0].key").value("STABLECOIN"));
    }

    @Test
    @WithMockCustomUser
    void getBreakdown_cryptoNetwork_retourne200() throws Exception {
        when(patrimoineBreakdownService.getBreakdown(any(), eq(BreakdownDimension.CRYPTO_NETWORK), isNull()))
                .thenReturn(stub(BreakdownDimension.CRYPTO_NETWORK, "ETHEREUM"));

        mockMvc.perform(get("/api/patrimoine/breakdown/crypto-network"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dimension").value("CRYPTO_NETWORK"))
                .andExpect(jsonPath("$.breakdown[0].key").value("ETHEREUM"));
    }

    @Test
    @WithMockCustomUser
    void getBreakdown_dimensionInconnue_retourne400() throws Exception {
        mockMvc.perform(get("/api/patrimoine/breakdown/foobar"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getBreakdown_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(get("/api/patrimoine/breakdown/sector"))
                .andExpect(status().isUnauthorized());
    }

    private PortfolioBreakdownDto stub(BreakdownDimension dim, String firstKey) {
        return new PortfolioBreakdownDto(
                AssetCategory.BOURSE, dim,
                new BigDecimal("10000"), new BigDecimal("100.0"), BigDecimal.ZERO,
                List.of(new PortfolioBreakdownDto.BreakdownItem(
                        firstKey, new BigDecimal("10000"), new BigDecimal("100.0"))));
    }
}
