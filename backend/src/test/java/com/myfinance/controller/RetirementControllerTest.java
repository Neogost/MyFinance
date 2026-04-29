package com.myfinance.controller;

import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.RetirementParameters;
import com.myfinance.config.SecurityConfig;
import com.myfinance.support.WithMockCustomUser;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(RetirementController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class RetirementControllerTest {

    @Autowired MockMvc mockMvc;
    @MockitoBean RetirementParameters retirementParameters;

    @Test
    @WithMockCustomUser
    void getParameters_authentifie_retourne200() throws Exception {
        mockMvc.perform(get("/api/retirement/parameters"))
                .andExpect(status().isOk());
    }

    @Test
    void getParameters_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(get("/api/retirement/parameters"))
                .andExpect(status().isUnauthorized());
    }
}
